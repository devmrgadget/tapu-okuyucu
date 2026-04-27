from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import traceback
from main import handle_command

class RequestHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200, "ok")
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header("Access-Control-Allow-Headers", "X-Requested-With, Content-type")
        self.end_headers()

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length).decode('utf-8')
        
        try:
            cmd = json.loads(post_data)
            result = handle_command(cmd)
            response = json.dumps(result, ensure_ascii=False)
            status_code = 200
        except Exception as e:
            result = {"error": str(e), "traceback": traceback.format_exc()}
            response = json.dumps(result, ensure_ascii=False)
            status_code = 500

        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(response.encode('utf-8'))

    def log_message(self, format, *args):
        # Prevent default logging to stdout if you want it clean
        pass

if __name__ == '__main__':
    port = 8000
    server = HTTPServer(('localhost', port), RequestHandler)
    print(f"Web backend running on http://localhost:{port}")
    server.serve_forever()
