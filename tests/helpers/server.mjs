import http from 'node:http';

export function startTestServer(handlers = {}) {
  // handlers: { 'GET /events': (req,res,url) => {}, 'POST /sends': ... , 'SSE /events/stream': (req,res,url) => {} }
  const srv = http.createServer((req, res) => {
    try {
      const url = new URL(req.url || '/', `http://${req.headers.host}`);
      const key = `${req.method} ${url.pathname}`;
      const sseKey = `SSE ${url.pathname}`;
      if (handlers[key]) return handlers[key](req, res, url);
      if (handlers[sseKey]) return handlers[sseKey](req, res, url);
      res.statusCode = 404; res.end('not found');
    } catch (e) {
      res.statusCode = 500; res.end(String(e));
    }
  });
  return new Promise((resolve) => {
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () => new Promise((r) => srv.close(() => r()))
      });
    });
  });
}

