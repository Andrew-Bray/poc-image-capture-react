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
 * Find or create a date folder under the parent folder
 */
async function findOrCreateDateFolder(accessToken: string, dateFolder: string): Promise<string> {
  // Search for existing folder
  const query = `name='${dateFolder}' and '${GOOGLE_DRIVE_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
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
      name: dateFolder,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [GOOGLE_DRIVE_FOLDER_ID],
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

/**
 * Parse multipart form data (simple implementation for single file)
 */
function parseMultipartFormData(
  body: string,
  contentType: string
): { file: Buffer; filename: string; dateFolder: string } {
  const boundaryMatch = contentType.match(/boundary=(.+)$/);
  if (!boundaryMatch) throw new Error('No boundary in content-type');

  const boundary = boundaryMatch[1];
  const parts = body.split(`--${boundary}`);

  let file: Buffer | null = null;
  let filename = '';
  let dateFolder = '';

  for (const part of parts) {
    if (part.includes('Content-Disposition')) {
      const nameMatch = part.match(/name="([^"]+)"/);
      const filenameMatch = part.match(/filename="([^"]+)"/);

      if (nameMatch) {
        const fieldName = nameMatch[1];
        // Get content after the blank line
        const contentStart = part.indexOf('\r\n\r\n');
        if (contentStart === -1) continue;

        const content = part.slice(contentStart + 4).replace(/\r\n$/, '');

        if (fieldName === 'file' && filenameMatch) {
          filename = filenameMatch[1];
          // For binary data, we need to handle it differently
          file = Buffer.from(content, 'binary');
        } else if (fieldName === 'filename') {
          filename = content.trim();
        } else if (fieldName === 'dateFolder') {
          dateFolder = content.trim();
        }
      }
    }
  }

  if (!file) throw new Error('No file in form data');
  if (!filename) throw new Error('No filename in form data');
  if (!dateFolder) throw new Error('No dateFolder in form data');

  return { file, filename, dateFolder };
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
    const contentType = event.headers['content-type'] || '';

    if (!contentType.includes('multipart/form-data')) {
      throw new Error('Expected multipart/form-data');
    }

    const body = event.isBase64Encoded
      ? Buffer.from(event.body!, 'base64').toString('binary')
      : event.body!;

    const { file, filename, dateFolder } = parseMultipartFormData(body, contentType);

    console.log(`[Upload] Starting upload: ${filename} to folder ${dateFolder}`);

    const accessToken = await getAccessToken();
    const folderId = await findOrCreateDateFolder(accessToken, dateFolder);
    const uploadedFile = await uploadFile(accessToken, folderId, filename, file, 'video/webm');

    console.log(`[Upload] Success: ${uploadedFile.name} (${uploadedFile.id})`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, fileId: uploadedFile.id }),
    };
  } catch (error) {
    console.error('[Upload] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: (error as Error).message }),
    };
  }
};
