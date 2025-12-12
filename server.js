// server.js - LocalStorage対応 TOTP Web
import express from 'express';
import bodyParser from 'body-parser';
import CryptoJS from 'crypto-js';
import { authenticator } from 'otplib';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

const ENC_KEY = process.env.ENC_KEY || 'CHANGE_ME_PLEASE';

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

app.get('/', (req, res) => {
  res.send(`
    <html>
    <head>
      <meta charset="UTF-8" />
      <title>TOTP Web</title>
      <style>
        body {
          font-family: 'Segoe UI', sans-serif;
          background: #f4f6f9;
          padding: 40px;
        }
        h1 {
          font-size: 28px;
          margin-bottom: 10px;
          color: #333;
        }
        .card {
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.1);
          max-width: 500px;
          margin-bottom: 30px;
        }
        input {
          width: 100%;
          padding: 10px;
          font-size: 15px;
          border-radius: 8px;
          border: 1px solid #ccc;
          margin-top: 8px;
        }
        button {
          margin-top: 15px;
          width: 100%;
          padding: 10px;
          font-size: 16px;
          border: none;
          border-radius: 8px;
          background: #007bff;
          color: white;
          cursor: pointer;
        }
        button:hover {
          background: #0069d9;
        }
        ul {
          padding-left: 0;
          list-style: none;
        }
        li {
          background: white;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 2px 6px rgba(0,0,0,0.07);
        }
        a {
          text-decoration: none;
          color: #007bff;
          font-weight: 500;
        }
        .del {
          color: red;
          cursor: pointer;
        }
      </style>
    </head>

    <body>
      <h1>TOTP URL 生成</h1>

      <div class="card">
        <form method="POST" action="/create">
          <label>otpauth URL を入力</label>
          <input name="otpauth" placeholder="otpauth://totp/...">
          <button type="submit">登録してURL生成</button>
        </form>
      </div>

      <h2>登録済み一覧</h2>
      <ul id="list"></ul>

      <script>
        const listEl = document.getElementById('list');

        function loadList() {
          const items = JSON.parse(localStorage.getItem('totpList') || '[]');
          listEl.innerHTML = '';

          items.forEach((item, i) => {
            const li = document.createElement('li');
            li.innerHTML = \`
              <a href="/view?data=\${encodeURIComponent(item.data)}">\${item.label || 'TOTP ' + (i+1)}</a>
              <span class="del" onclick="delItem(\${i})">削除</span>
            \`;
            listEl.appendChild(li);
          });
        }

        function delItem(i) {
          const items = JSON.parse(localStorage.getItem('totpList') || '[]');
          items.splice(i, 1);
          localStorage.setItem('totpList', JSON.stringify(items));
          loadList();
        }

        // create後に自動追加
        const urlParams = new URLSearchParams(location.search);
        if (urlParams.get('add')) {
          const label = urlParams.get('label');
          const data = decodeURIComponent(urlParams.get('data')); // ここでデコード
        
          const items = JSON.parse(localStorage.getItem('totpList') || '[]');
          items.push({ label, data });
          localStorage.setItem('totpList', JSON.stringify(items));
        
          history.replaceState({}, '', '/');
        }

        loadList();
      </script>
    </body>
    </html>
  `);
});

app.post('/create', (req, res) => {
  const otpauth = req.body.otpauth;
  try {
    const u = new URL(otpauth);
    const secret = u.searchParams.get('secret');
    const label = u.pathname.replace('/','') || "TOTP";

    if (!secret) return res.send('secret が見つかりません');

    const encrypted = encodeURIComponent(encrypt(secret));

    res.redirect('/?add=1&label=' + encodeURIComponent(label) + '&data=' + encrypted);
  } catch {
    res.send('otpauth URL が不正です');
  }
});

app.get('/view', (req, res) => {
  const enc = req.query.data;
  if (!enc) return res.send('data がありません');

  res.send(`
    <html>
      <head><meta charset="UTF-8"><title>TOTP</title></head>
      <body style="font-family: sans-serif; padding: 40px;">
        <h1>TOTPコード</h1>
        <h2 id="code">loading...</h2>
        <script>
          const enc = ${JSON.stringify(enc)};
          async function update() {
            const r = await fetch('/api/code?data=' + enc);
            const j = await r.json();
            document.getElementById('code').textContent = j.code || 'Error';
          }
          setInterval(update, 1000);
          update();
        </script>
      </body>
    </html>
  `);
});

app.get('/api/code', (req, res) => {
  let enc = req.query.data;
  if (!enc) return res.status(400).json({ error: 'no data' });

  // ブラウザが勝手に + をスペース扱いするので補正
  enc = enc.replace(/ /g, '+');

  const secret = decrypt(decodeURIComponent(enc));
  if (!secret) return res.status(400).json({ error: 'decrypt failed' });

  const code = authenticator.generate(secret);
  res.json({ code });
});

app.listen(3000, () => console.log('Server on 3000'));
