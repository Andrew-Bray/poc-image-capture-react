import { useState, useRef, useCallback, useEffect } from 'react';

interface UseVideoRecordingReturn {
  isRecording: boolean;
  startRecording: (stream: MediaStream) => void;
  stopRecording: () => Promise<Blob>;
  recordingDuration: number;
  recordedBlob: Blob | null;
  downloadRecording: () => void;
  clearRecording: () => void;
}

export function useVideoRecording(): UseVideoRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = useCallback((stream: MediaStream) => {
    // Clear previous recording
    chunksRef.current = [];
    setRecordedBlob(null);

    // Create MediaRecorder with WebM/VP8
    const mimeType = 'video/webm;codecs=vp8';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      console.warn('VP8 not supported, falling back to default WebM');
    }

    const recorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : 'video/webm',
    });

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorderRef.current = recorder;
    recorder.start(1000); // Collect data every second

    // Start duration timer
    startTimeRef.current = Date.now();
    setRecordingDuration(0);
    timerRef.current = window.setInterval(() => {
      setRecordingDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    setIsRecording(true);
  }, []);

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        resolve(new Blob([], { type: 'video/webm' }));
        return;
      }

      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordedBlob(blob);
        setIsRecording(false);
        resolve(blob);
      };

      recorder.stop();
    });
  }, []);

  const downloadRecording = useCallback(() => {
    if (!recordedBlob) return;

    const url = URL.createObjectURL(recordedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zoom-recording-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [recordedBlob]);

  const clearRecording = useCallback(() => {
    setRecordedBlob(null);
    setRecordingDuration(0);
    chunksRef.current = [];
  }, []);

  return {
    isRecording,
    startRecording,
    stopRecording,
    recordingDuration,
    recordedBlob,
    downloadRecording,
    clearRecording,
  };
}
