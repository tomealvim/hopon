// backend/tests/test-runner-all.js
const { spawn } = require('child_process');
const path = require('path');

const tests = [
  { name: 'Auth Flow (completo)', file: 'test-auth-flow.js' },
  { name: 'Auth Básico', file: 'test-auth-basic.js' },
  { name: 'Profile Básico', file: 'test-profile-basic.js' },
  { name: 'Vehicles Avançado', file: 'test-vehicles-advanced.js' },
  { name: 'Rides/Bookings Avançado', file: 'test-rides-bookings-advanced.js' },
];

const results = [];

async function runTest(test) {
  return new Promise((resolve) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 A executar: ${test.name}`);
    console.log(`${'='.repeat(60)}\n`);

    const proc = spawn('node', [path.join(__dirname, test.file)], {
      stdio: 'inherit',
      shell: true,
    });

    proc.on('close', (code) => {
      const passed = code === 0;
      results.push({ ...test, passed, code });
      resolve(passed);
    });

    proc.on('error', (err) => {
      console.error(`❌ Erro ao executar ${test.name}:`, err.message);
      results.push({ ...test, passed: false, code: -1, error: err.message });
      resolve(false);
    });
  });
}

async function runAll() {
  console.log('\n🚀 Iniciando suite completa de testes da API\n');

  for (const test of tests) {
    await runTest(test);
  }

  // Resumo final
  console.log('\n\n');
  console.log('═'.repeat(60));
  console.log('📊 RESUMO FINAL DOS TESTES');
  console.log('═'.repeat(60));
  console.log('');

  let totalPassed = 0;
  let totalFailed = 0;

  results.forEach((result) => {
    const icon = result.passed ? '✅' : '❌';
    const status = result.passed ? 'PASSOU' : 'FALHOU';
    console.log(`${icon} ${result.name.padEnd(30)} ${status}`);
    if (result.passed) {
      totalPassed++;
    } else {
      totalFailed++;
    }
  });

  console.log('');
  console.log('─'.repeat(60));
  console.log(`Total: ${results.length} testes`);
  console.log(`✅ Passaram: ${totalPassed}`);
  console.log(`❌ Falharam: ${totalFailed}`);
  console.log('─'.repeat(60));
  console.log('');

  if (totalFailed === 0) {
    console.log('🎉 TODOS OS TESTES PASSARAM!');
    console.log('');
    process.exit(0);
  } else {
    console.log('⚠️  ALGUNS TESTES FALHARAM. Ver detalhes acima.');
    console.log('');
    process.exit(1);
  }
}

runAll().catch((err) => {
  console.error('Erro inesperado:', err);
  process.exit(1);
});

