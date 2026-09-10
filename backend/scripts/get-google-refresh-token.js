import { google } from "googleapis";
import http from "node:http";
import { URL } from "node:url";
import dotenv from "dotenv";

dotenv.config();

// Read from environment variables (matching your .env names)
const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    "Error: Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET in .env",
  );
  process.exit(1);
}

const PORT = 3000;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI,
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: ["https://www.googleapis.com/auth/analytics.readonly"],
  prompt: "consent",
});

console.log("\nOpen this URL in your browser and approve access:\n");
console.log(authUrl);
console.log(`\nWaiting for the redirect on http://localhost:${PORT} ...\n`);

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const code = url.searchParams.get("code");

    if (!code) {
      res.end("No code found in the request.");
      return;
    }

    res.end("Success! You can close this tab and go back to your terminal.");
    server.close();

    const { tokens } = await oauth2Client.getToken(code);
    console.log(
      "\n=== Save this refresh token — it will not be shown again ===\n",
    );
    console.log(tokens.refresh_token);
    console.log("\nAdd this to your .env as GOOGLE_OAUTH_REFRESH_TOKEN\n");
    process.exit(0);
  } catch (err) {
    console.error("Error exchanging code:", err.message);
    res.end("Error — check your terminal.");
    server.close();
    process.exit(1);
  }
});

server.listen(PORT);
