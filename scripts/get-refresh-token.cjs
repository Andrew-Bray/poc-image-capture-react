#!/usr/bin/env node
/**
 * One-time script to get a Google OAuth refresh token.
 *
 * Setup: Create a .env file in project root with:
 *   GOOGLE_CLIENT_ID=your-client-id
 *   GOOGLE_CLIENT_SECRET=your-client-secret
 *   GOOGLE_DRIVE_FOLDER_ID=your-folder-id
 *
 * Run with: node scripts/get-refresh-token.cjs
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// Load .env file
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  }
}

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '<your-folder-id>';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('\n❌ Missing credentials!\n');
  console.error('Create a .env file in the project root with:');
  console.error('  GOOGLE_CLIENT_ID=your-client-id');
  console.error('  GOOGLE_CLIENT_SECRET=your-client-secret');
  console.error('  GOOGLE_DRIVE_FOLDER_ID=your-folder-id\n');
  process.exit(1);
}

const REDIRECT_URI = 'http://localhost:3000';
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authUrl.searchParams.set('client_id', CLIENT_ID);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', SCOPES.join(' '));
authUrl.searchParams.set('access_type', 'offline');
authUrl.searchParams.set('prompt', 'consent'); // Force consent to get refresh token

console.log('\n🔐 Google OAuth Refresh Token Generator\n');
console.log('1. Opening browser for authorization...');
console.log('2. Sign in with your Google account');
console.log('3. The refresh token will be printed here\n');

// Open browser
const openCommand = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
require('child_process').exec(`${openCommand} "${authUrl.toString()}"`);

// Start local server to catch the callback
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI);

  if (url.pathname === '/' && url.searchParams.has('code')) {
    const code = url.searchParams.get('code');

    try {
      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      });

      const tokens = await tokenResponse.json();

      if (tokens.refresh_token) {
        console.log('✅ Success! Here are your tokens:\n');
        console.log('━'.repeat(60));
        console.log('REFRESH TOKEN (save this to Netlify env vars):');
        console.log(tokens.refresh_token);
        console.log('━'.repeat(60));
        console.log('\nAdd these to Netlify → Site settings → Environment variables:');
        console.log(`  GOOGLE_CLIENT_ID=${CLIENT_ID}`);
        console.log(`  GOOGLE_CLIENT_SECRET=${CLIENT_SECRET}`);
        console.log(`  GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
        console.log(`  GOOGLE_DRIVE_FOLDER_ID=${FOLDER_ID}`);

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <body style="font-family: system-ui; padding: 40px; text-align: center;">
              <h1>✅ Success!</h1>
              <p>Refresh token generated. Check your terminal.</p>
              <p>You can close this tab.</p>
            </body>
          </html>
        `);
      } else {
        throw new Error(tokens.error_description || 'No refresh token received');
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`<html><body><h1>Error</h1><p>${error.message}</p></body></html>`);
    }

    // Shutdown server after handling
    setTimeout(() => {
      server.close();
      process.exit(0);
    }, 1000);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(3000, () => {
  console.log('Waiting for authorization callback on http://localhost:3000 ...\n');
});
