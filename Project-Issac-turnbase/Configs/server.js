const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8080;
const DIR = __dirname;

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
  '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg',
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const server = http.createServer((req, res) => {
  console.log(req.method, req.url);

  // OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    res.end();
    return;
  }

  // POST /save-pool — 支持 JSON body 和 form-urlencoded
  if (req.method === 'POST' && req.url === '/save-pool') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      try {
        let data;
        // 尝试 JSON
        if (body.startsWith('{')) {
          data = JSON.parse(body);
        } else {
          // form-urlencoded: json=...
          const sp = new URLSearchParams(body);
          data = JSON.parse(sp.get('json') || '{}');
        }
        fs.writeFileSync(path.join(DIR, 'pool.json'), JSON.stringify(data, null, 2), 'utf-8');
        res.writeHead(200, { ...CORS, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, count: Object.keys(data).length }));
        console.log('[save] ' + Object.keys(data).length + ' templates');
      } catch (e) {
        res.writeHead(500, CORS);
        res.end(JSON.stringify({ ok: false, error: e.message }));
        console.log('[err]', e.message);
      }
    });
    return;
  }

  // GET static files
  let filePath = path.join(DIR, url.parse(req.url).pathname || '/');
  if (filePath.endsWith('/')) filePath = path.join(filePath, 'index.html');
  const ext = path.extname(filePath);
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404, CORS); res.end('404'); return; }
    res.writeHead(200, { ...CORS, 'Content-Type': contentType, 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log('http://localhost:' + PORT + '  |  POST /save-pool');
});
