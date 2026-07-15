"""以撒房间模板编辑器 — 本地服务器"""
import http.server, json, os

PORT = 8080

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/pool.json':
            try:
                with open('isaac-room-pool.json', 'r', encoding='utf-8') as f:
                    data = f.read()
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Cache-Control', 'no-cache')
                self.end_headers()
                self.wfile.write(data.encode('utf-8'))
            except FileNotFoundError:
                self.send_response(404)
                self.end_headers()
        else:
            super().do_GET()

    def do_POST(self):
        if self.path == '/save-pool':
            try:
                length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(length)
                data = json.loads(body)
                with open('isaac-room-pool.json', 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({'ok': True, 'count': len(data)}).encode())
                print(f'[ok] saved {len(data)} templates')
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode())
                print(f'[err] {e}')

    def log_message(self, fmt, *args):
        pass  # 安静模式

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    print(f'http://localhost:{PORT}  |  GET /pool.json  |  POST /save-pool')
    http.server.HTTPServer(('', PORT), Handler).serve_forever()
