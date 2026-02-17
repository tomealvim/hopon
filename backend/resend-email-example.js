/**
 * Exemplo de envio do email de verificação Hopon (OTP) com Resend.
 * Igual ao que o AuthService envia – guardado aqui como referência em 2 lugares.
 *
 * Uso (opcional): RESEND_API_KEY=re_xxx node resend-email-example.js
 * O "to" e o "code" são exemplos; na app o to = user.email e o code é gerado.
 */

const Resend = require('resend');

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || 'onboarding@resend.dev';
const OTP_EXPIRY_MINUTES = 5;

// Email de verificação de conta (canal email)
function sendEmailVerification(toEmail, code) {
  const resend = new Resend(RESEND_API_KEY);
  return resend.emails.send({
    from: RESEND_FROM,
    to: toEmail,
    subject: 'Código de verificação Hopon',
    html: `<p>O teu código de verificação é: <strong>${code}</strong></p><p>Válido por ${OTP_EXPIRY_MINUTES} minutos.</p>`,
  });
}

// Email de verificação de telefone (em dev enviamos por email)
function sendPhoneVerification(toEmail, code) {
  const resend = new Resend(RESEND_API_KEY);
  return resend.emails.send({
    from: RESEND_FROM,
    to: toEmail,
    subject: 'Código de verificação de telefone Hopon',
    html: `<p>O teu código de verificação de telefone é: <strong>${code}</strong></p><p>Válido por ${OTP_EXPIRY_MINUTES} minutos.</p>`,
  });
}

// Teste rápido (só corre se executares: node resend-email-example.js)
if (require.main === module) {
  if (!RESEND_API_KEY) {
    console.error('Define RESEND_API_KEY no .env ou: RESEND_API_KEY=re_xxx node resend-email-example.js');
    process.exit(1);
  }
  const testTo = process.env.TEST_EMAIL || 'tome.alvim@gmail.com';
  const testCode = '123456';
  sendEmailVerification(testTo, testCode)
    .then(() => console.log('Email enviado para', testTo))
    .catch((err) => console.error('Erro:', err));
}

module.exports = { sendEmailVerification, sendPhoneVerification };
