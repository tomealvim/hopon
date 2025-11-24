const http = require('http');

const BASE_URL = 'http://localhost:3000/api/v1';

const user = {
  email: `test_${Date.now()}@example.com`,
  password: 'password123',
  name: 'Test User',
  phone: `+35191${Math.floor(1000000 + Math.random() * 9000000)}`
};

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/v1${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          console.log('Raw response:', data);
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function run() {
  console.log('--- 1. REGISTO ---');
  console.log('Enviando:', user);
  const regRes = await request('POST', '/auth/register', user);
  console.log('Status:', regRes.status);
  console.log('Response:', JSON.stringify(regRes.data, null, 2));

  if (regRes.status !== 201) {
    console.error('Falha no registo');
    return;
  }

  console.log('\n--- 2. LOGIN ---');
  const loginRes = await request('POST', '/auth/login', {
    email: user.email,
    password: user.password
  });
  console.log('Status:', loginRes.status);
  // console.log('Response:', loginRes.data);

  const token = loginRes.data.accessToken;
  if (!token) {
    console.error('Token não recebido');
    return;
  }
  console.log('Token recebido com sucesso (truncado):', token.substring(0, 20) + '...');

  console.log('\n--- 3. PERFIL (ME) ---');
  const meRes = await request('GET', '/auth/me', null, token);
  console.log('Status:', meRes.status);
  console.log('Response:', JSON.stringify(meRes.data, null, 2));

  if (meRes.status === 200 && meRes.data.email === user.email) {
    console.log('\n✅ SUCESSO: Fluxo de autenticação completo validado!');
  } else {
    console.log('\n❌ ERRO: Falha ao obter perfil.');
  }
}

run().catch(console.error);

