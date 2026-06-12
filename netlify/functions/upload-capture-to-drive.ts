import type { Handler, HandlerEvent } from '@netlify/functions';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN!;
const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID!;

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface DriveFile {
  id: string;
  name: string;
}

interface DriveFileList {
  files: DriveFile[];
}

interface CaptureUploadPayload {
  folderName: string; // e.g., "2026-06-12T14-32-05_Logitech-BRIO"
  dateFolder: string; // e.g., "2026-06-12"
  files: {
    name: string; // e.g., "takePhoto.jpg"
    mimeType: string;
    data: string; // base64 encoded
  }[];
}

/**
 * Exchange refresh token for access token
 */
async function getAccessToken(): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  const data: TokenResponse = await response.json();
  return data.access_token;
}

/**
 * Find or create a folder by name under a parent
 */
async function findOrCreateFolder(
  accessToken: string,
  folderName: string,
  parentId: string
): Promise<string> {
  // Search for existing folder
  const query = `name='${folderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const searchResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!searchResponse.ok) {
    throw new Error(`Folder search failed: ${await searchResponse.text()}`);
  }

  const searchData: DriveFileList = await searchResponse.json();

  if (searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Create new folder
  const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    }),
  });

  if (!createResponse.ok) {
    throw new Error(`Folder creation failed: ${await createResponse.text()}`);
  }

  const folder: DriveFile = await createResponse.json();
  return folder.id;
}

/**
 * Upload file to Google Drive using multipart upload
 */
async function uploadFile(
  accessToken: string,
  folderId: string,
  filename: string,
  fileData: Buffer,
  mimeType: string
): Promise<DriveFile> {
  const boundary = '-------314159265358979323846';
  const metadata = JSON.stringify({
    name: filename,
    parents: [folderId],
  });

  // Build multipart body
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        `${metadata}\r\n` +
        `--${boundary}\r\n` +
        `Content-Type: ${mimeType}\r\n\r\n`
    ),
    fileData,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  if (!response.ok) {
    throw new Error(`Upload failed: ${await response.text()}`);
  }

  return response.json();
}

export const handler: Handler = async (event: HandlerEvent) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const payload: CaptureUploadPayload = JSON.parse(event.body || '{}');

    if (!payload.folderName || !payload.dateFolder || !payload.files?.length) {
      throw new Error('Missing required fields: folderName, dateFolder, files');
    }

    console.log(`[CaptureUpload] Starting upload: ${payload.folderName} (${payload.files.length} files)`);

    const accessToken = await getAccessToken();

    // Create date folder under parent
    const dateFolderId = await findOrCreateFolder(accessToken, payload.dateFolder, GOOGLE_DRIVE_FOLDER_ID);

    // Create capture folder under date folder
    const captureFolderId = await findOrCreateFolder(accessToken, payload.folderName, dateFolderId);

    // Upload all files
    const uploadedFiles: DriveFile[] = [];
    for (const file of payload.files) {
      const fileData = Buffer.from(file.data, 'base64');
      const uploaded = await uploadFile(accessToken, captureFolderId, file.name, fileData, file.mimeType);
      uploadedFiles.push(uploaded);
      console.log(`[CaptureUpload] Uploaded: ${uploaded.name}`);
    }

    console.log(`[CaptureUpload] Success: ${uploadedFiles.length} files to ${payload.folderName}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, folderId: captureFolderId, files: uploadedFiles }),
    };
  } catch (error) {
    console.error('[CaptureUpload] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: (error as Error).message }),
    };
  }
};
