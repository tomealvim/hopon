const http = require('http');

// Função helper para gerar números de telefone válidos de diferentes países
function generateUniquePhone() {
  const countries = [
    { code: '+351', pattern: () => `+3519${Math.floor(10000000 + Math.random() * 90000000)}` }, // Portugal
    { code: '+34', pattern: () => `+346${Math.floor(10000000 + Math.random() * 90000000)}` }, // Espanha
    { code: '+33', pattern: () => `+336${Math.floor(10000000 + Math.random() * 90000000)}` }, // França
    { code: '+44', pattern: () => `+447${Math.floor(100000000 + Math.random() * 900000000)}` }, // Reino Unido
    { code: '+55', pattern: () => `+5511${Math.floor(900000000 + Math.random() * 100000000)}` }, // Brasil
  ];
  const country = countries[Math.floor(Math.random() * countries.length)];
  return country.pattern();
}

// Gerar dados únicos para evitar conflitos
const randomSuffix = Math.random().toString(36).slice(2, 8);
const uniquePhone = generateUniquePhone();

// Usar token existente se houver, ou criar conta nova
const user = {
  email: `test_${Date.now()}_${randomSuffix}@example.com`,
  password: 'password123',
  name: 'Test User',
  phone: uniquePhone
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
  const regRes = await request('POST', '/auth/register', user);
  console.log('Status:', regRes.status);
  const token = regRes.data.accessToken;

  if (regRes.status !== 201) {
    console.error('Falha no registo');
    return;
  }

  console.log('Token obtido');
  console.log('Nome inicial:', regRes.data.user.name);
  console.log('Telefone inicial:', regRes.data.user.phone);

  console.log('\n--- 2. ATUALIZAR PERFIL ---');
  const updateData = {
    name: 'João Silva Atualizado',
    phone: generateUniquePhone(), // Telefone único de país aleatório
    contactEmail: `joao+${randomSuffix}@alternative.com`, // Email único
    username: `joaosilva_${randomSuffix}` // Username único
  };
  console.log('Enviando atualização:', updateData);

  const updateRes = await request('PATCH', '/auth/me', updateData, token);
  console.log('Status:', updateRes.status);

  if (updateRes.status !== 200) {
    console.error('Falha na atualização');
    return;
  }

  console.log('Nome atualizado:', updateRes.data.profile?.name);
  console.log('Telefone atualizado:', updateRes.data.phone);
  console.log('Contact Email atualizado:', updateRes.data.profile?.contactEmail);
  console.log('Username atualizado:', updateRes.data.profile?.username);

  console.log('\n--- 3. VERIFICAR GET /me ---');
  const meRes = await request('GET', '/auth/me', null, token);
  console.log('Status:', meRes.status);

  if (meRes.status === 200) {
    console.log('Nome:', meRes.data.profile?.name);
    console.log('Telefone:', meRes.data.phone);
    console.log('Contact Email:', meRes.data.profile?.contactEmail);
    console.log('Username:', meRes.data.profile?.username);

    if (meRes.data.profile?.name === updateData.name &&
        meRes.data.phone === updateData.phone &&
        meRes.data.profile?.contactEmail === updateData.contactEmail &&
        meRes.data.profile?.username === updateData.username) {
      console.log('\n✅ SUCESSO: Todos os campos foram persistidos corretamente!');
    } else {
      console.log('\n❌ ERRO: Algum campo não foi persistido');
      console.log('Esperado:', updateData);
      console.log('Recebido:', {
        name: meRes.data.profile?.name,
        phone: meRes.data.phone,
        contactEmail: meRes.data.profile?.contactEmail,
        username: meRes.data.profile?.username
      });
    }
  } else {
    console.log('Erro no GET /me');
  }
}

run().catch(console.error);
