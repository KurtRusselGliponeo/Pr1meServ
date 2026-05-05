const http = require('http');

const data = JSON.stringify({
  email: 'plukkurt.gliponeo@gmail.com',
  password: 'A1Prime2024!'
});

const req = http.request({
  hostname: 'localhost',
  port: 8080,
  path: '/api/v1/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
}, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => console.log('Response:', res.statusCode, body));
});

req.on('error', (e) => console.error('Error:', e.message));
req.write(data);
req.end();
