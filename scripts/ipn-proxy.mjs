import { createServer } from 'node:http';

// Tunnel chỉ công khai IPN, không công khai Auth, Orders hay các API khác.
const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost');
  if (request.method !== 'GET' || url.pathname !== '/payments/vnpay/ipn') {
    response.writeHead(404);
    response.end();
    return;
  }
  try {
    const upstream = await fetch(`http://api:3003/payments/vnpay/ipn${url.search}`, {
      signal: AbortSignal.timeout(10000), redirect: 'error',
    });
    response.writeHead(upstream.status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    response.end(await upstream.text());
  } catch {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ RspCode: '99', Message: 'IPN service unavailable' }));
  }
});

server.listen(8080, '0.0.0.0');
