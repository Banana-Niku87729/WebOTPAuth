// server.js - URL-only TOTP generator (NO DB, NO SAVE)
// Secrets are encrypted into the URL itself.
// Run: npm init -y && npm install express otplib crypto-js body-parser && node server.js

import express from 'express';
import bodyParser from 'body-parser';
import CryptoJS from 'crypto-js';
import { authenticator } from 'otplib';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Encryption password – CHANGE THIS on your server
// (This does NOT store secrets; it only encrypts/decrypts on the fly)
const ENC_KEY = process.env.ENC_KEY || 'CHANGE_ME_PLEASE';

// --- Encryption helpers ---
function encrypt(text) {
  return CryptoJS.AES.encrypt(text, ENC_KEY).toString();
}
function decrypt(cipher) {
  try {
    const bytes = CryptoJS.AES.decrypt(cipher, ENC_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch {
    return null;
  }
}

// Modern CSS styles
const styles = `
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 20px;
      padding: 40px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 500px;
      width: 100%;
      animation: fadeIn 0.5s ease;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    h1 {
      color: #333;
      font-size: 28px;
      margin-bottom: 10px;
      font-weight: 700;
    }
    .subtitle {
      color: #666;
      margin-bottom: 30px;
      font-size: 14px;
    }
    label {
      display: block;
      color: #555;
      font-weight: 600;
      margin-bottom: 8px;
      font-size: 14px;
    }
    input[type="text"] {
      width: 100%;
      padding: 14px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 10px;
      font-size: 14px;
      transition: all 0.3s ease;
      font-family: monospace;
    }
    input[type="text"]:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
    button {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 20px;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
    }
    button:active {
      transform: translateY(0);
    }
    .result-box {
      background: #f8f9ff;
      border: 2px solid #e0e7ff;
      border-radius: 10px;
      padding: 20px;
      margin-top: 20px;
      word-break: break-all;
    }
    .result-box a {
      color: #667eea;
      text-decoration: none;
      font-weight: 600;
    }
    .result-box a:hover {
      text-decoration: underline;
    }
    .code-display {
      font-size: 48px;
      font-weight: 700;
      color: #667eea;
      text-align: center;
      letter-spacing: 8px;
      font-family: 'Courier New', monospace;
      padding: 30px;
      background: linear-gradient(135deg, #f8f9ff 0%, #e0e7ff 100%);
      border-radius: 15px;
      margin: 20px 0;
      box-shadow: inset 0 2px 10px rgba(0,0,0,0.05);
    }
    .timer-bar {
      height: 4px;
      background: #e0e0e0;
      border-radius: 2px;
      overflow: hidden;
      margin-top: 10px;
    }
    .timer-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      transition: width 1s linear;
    }
    .info-text {
      text-align: center;
      color: #666;
      font-size: 13px;
      margin-top: 10px;
    }
  </style>
`;

// Home page – user inputs otpauth URL
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TOTP Generator</title>
        ${styles}
      </head>
      <body>
        <div class="container">
          <h1>🔐 TOTP Generator</h1>
          <p class="subtitle">URL完結型の2要素認証コード生成ツール</p>
          <form method="POST" action="/create">
            <label>otpauth:// URL</label>
            <input type="text" name="otpauth" placeholder="otpauth://totp/Example:user@example.com?secret=..." required>
            <button type="submit">🔗 セキュアURLを生成</button>
          </form>
        </div>
      </body>
    </html>`);
});

// Generate encrypted URL
app.post('/create', (req, res) => {
  const otpauth = req.body.otpauth;
  try {
    const u = new URL(otpauth);
    const secret = u.searchParams.get('secret');
    if (!secret) return res.send(`
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>エラー</title>
          ${styles}
        </head>
        <body>
          <div class="container">
            <h1>❌ エラー</h1>
            <p class="subtitle">secret が見つかりませんでした</p>
            <button onclick="history.back()">← 戻る</button>
          </div>
        </body>
      </html>`);

    const encrypted = encodeURIComponent(encrypt(secret));
    const fullUrl = `${req.protocol}://${req.get('host')}/view?data=${encrypted}`;

    res.send(`
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>URL生成完了</title>
          ${styles}
        </head>
        <body>
          <div class="container">
            <h1>✅ URL生成完了</h1>
            <p class="subtitle">以下のURLをブックマークまたは保存してください</p>
            <div class="result-box">
              <p style="margin-bottom: 10px; font-weight: 600; color: #333;">セキュアURL:</p>
              <a href="/view?data=${encrypted}" target="_blank">${fullUrl}</a>
            </div>
            <p class="info-text">このURLには暗号化された認証情報が含まれています</p>
            <button onclick="location.href='/'">🏠 ホームに戻る</button>
          </div>
        </body>
      </html>`);
  } catch {
    res.send(`
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>エラー</title>
          ${styles}
        </head>
        <body>
          <div class="container">
            <h1>❌ エラー</h1>
            <p class="subtitle">otpauth URL が不正です</p>
            <button onclick="history.back()">← 戻る</button>
          </div>
        </body>
      </html>`);
  }
});

// TOTP view page (auto update)
app.get('/view', (req, res) => {
  const enc = req.query.data;
  if (!enc) return res.send(`
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>エラー</title>
        ${styles}
      </head>
      <body>
        <div class="container">
          <h1>❌ エラー</h1>
          <p class="subtitle">data がありません</p>
          <button onclick="location.href='/'">🏠 ホームに戻る</button>
        </div>
      </body>
    </html>`);

  res.send(`
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TOTP Code</title>
        ${styles}
      </head>
      <body>
        <div class="container">
          <h1>🔐 認証コード</h1>
          <p class="subtitle">30秒ごとに自動更新されます</p>
          <div class="code-display" id="code">------</div>
          <div class="timer-bar">
            <div class="timer-fill" id="timer"></div>
          </div>
          <p class="info-text" id="remaining">次の更新まで: --秒</p>
        </div>
        <script>
          const enc = ${JSON.stringify(enc)};
          
          async function update() {
            try {
              const r = await fetch('/api/code?data=' + encodeURIComponent(enc));
              const j = await r.json();
              document.getElementById('code').textContent = j.code || 'ERROR';
            } catch (e) {
              document.getElementById('code').textContent = 'ERROR';
            }
          }
          
          function updateTimer() {
            const now = Math.floor(Date.now() / 1000);
            const remaining = 30 - (now % 30);
            const percent = (remaining / 30) * 100;
            
            document.getElementById('timer').style.width = percent + '%';
            document.getElementById('remaining').textContent = '次の更新まで: ' + remaining + '秒';
            
            if (remaining === 30) {
              update();
            }
          }
          
          setInterval(updateTimer, 1000);
          update();
          updateTimer();
        </script>
      </body>
    </html>`);
});

// TOTP API – decrypt then generate code
app.get('/api/code', (req, res) => {
  const enc = req.query.data;
  if (!enc) return res.status(400).json({ error: 'no data' });

  const secret = decrypt(decodeURIComponent(enc));
  if (!secret) return res.status(400).json({ error: 'decrypt failed' });

  const code = authenticator.generate(secret);
  res.json({ code });
});

app.listen(3000, () => console.log('🚀 URL-only TOTP server running on port 3000'));
