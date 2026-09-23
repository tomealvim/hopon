/** Templates de email HTML para o HopOn - estilos inline para compatibilidade máxima */

const BASE = {
  bg: '#F5E6D3',
  card: '#ffffff',
  primary: '#111827',
  muted: '#6b7280',
  accent: '#FF719A',
  border: '#e5e7eb',
};

function layout(content: string): string {
  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HopOn</title>
</head>
<body style="margin:0;padding:0;background-color:${BASE.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${BASE.bg};padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Cabeçalho -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <span style="font-size:24px;font-weight:800;color:${BASE.primary};letter-spacing:-0.5px;">HopOn</span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:${BASE.card};border-radius:16px;border:1px solid ${BASE.border};padding:32px;">
              ${content}
            </td>
          </tr>

          <!-- Rodapé -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:${BASE.muted};">
                © ${new Date().getFullYear()} HopOn · Carpooling de partilha de custos
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function h1(text: string): string {
  return `<h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${BASE.primary};line-height:1.3;">${text}</h1>`;
}

function greeting(name: string): string {
  return `<p style="margin:0 0 20px;font-size:15px;color:${BASE.muted};">Olá, <strong style="color:${BASE.primary};">${name}</strong> 👋</p>`;
}

function routeCard(
  origin: string,
  destination: string,
  departureTime: string,
): string {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${BASE.bg};border-radius:12px;margin:20px 0;">
    <tr>
      <td style="padding:16px;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:${BASE.muted};text-transform:uppercase;letter-spacing:0.5px;">Rota</p>
        <p style="margin:0;font-size:15px;font-weight:700;color:${BASE.primary};">${origin} → ${destination}</p>
        <p style="margin:4px 0 0;font-size:13px;color:${BASE.muted};">${departureTime}</p>
      </td>
    </tr>
  </table>`;
}

function ctaButton(text: string): string {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
    <tr>
      <td align="center">
        <a style="display:inline-block;background-color:${BASE.primary};color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 32px;border-radius:50px;letter-spacing:0.3px;">${text}</a>
      </td>
    </tr>
  </table>`;
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid ${BASE.border};margin:20px 0;">`;
}

// ─── Templates públicos ───────────────────────────────────────────────────────

export function otpEmailHtml(
  code: string,
  purpose: 'email' | 'phone',
  expiryMinutes: number,
): string {
  const isEmail = purpose === 'email';
  return layout(`
    ${h1(isEmail ? 'Verifica o teu email' : 'Verifica o teu telefone')}
    <p style="margin:0 0 24px;font-size:15px;color:${BASE.muted};">
      Usa o código abaixo para ${isEmail ? 'confirmar o teu endereço de email' : 'verificar o teu número de telefone'}.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="background-color:${BASE.bg};border-radius:12px;padding:24px;">
          <span style="font-size:40px;font-weight:800;color:${BASE.primary};letter-spacing:8px;">${code}</span>
        </td>
      </tr>
    </table>

    ${divider()}
    <p style="margin:0;font-size:13px;color:${BASE.muted};">
      Este código expira em <strong>${expiryMinutes} minutos</strong>.
      Se não pediste este código, podes ignorar este email.
    </p>
  `);
}

export function bookingCreatedEmailHtml(
  driverName: string,
  passengerName: string,
  origin: string,
  destination: string,
  departureTime: string,
  seats: number,
): string {
  return layout(`
    ${greeting(driverName)}
    ${h1('Nova reserva pendente')}
    <p style="margin:0 0 4px;font-size:15px;color:${BASE.muted};">
      <strong style="color:${BASE.primary};">${passengerName}</strong> quer
      <strong style="color:${BASE.primary};">${seats} lugar${seats > 1 ? 'es' : ''}</strong> na tua boleia.
    </p>
    ${routeCard(origin, destination, departureTime)}
    <p style="margin:0;font-size:14px;color:${BASE.muted};">
      Acede à app para <strong>confirmar ou recusar</strong> esta reserva.
    </p>
    ${ctaButton('Abrir a app')}
  `);
}

export function bookingConfirmedEmailHtml(
  passengerName: string,
  origin: string,
  destination: string,
  departureTime: string,
): string {
  return layout(`
    ${greeting(passengerName)}
    ${h1('Reserva confirmada! ✓')}
    <p style="margin:0 0 4px;font-size:15px;color:${BASE.muted};">
      O condutor confirmou a tua reserva. Está tudo pronto!
    </p>
    ${routeCard(origin, destination, departureTime)}
    <p style="margin:0;font-size:14px;color:${BASE.muted};">
      Aparece a horas e boas viagens 🚗
    </p>
    ${ctaButton('Ver detalhes')}
  `);
}

export function bookingDeclinedEmailHtml(
  passengerName: string,
  origin: string,
  destination: string,
  departureTime: string,
): string {
  return layout(`
    ${greeting(passengerName)}
    ${h1('Reserva não aceite')}
    <p style="margin:0 0 4px;font-size:15px;color:${BASE.muted};">
      Infelizmente o condutor não pôde aceitar a tua reserva desta vez.
    </p>
    ${routeCard(origin, destination, departureTime)}
    <p style="margin:0;font-size:14px;color:${BASE.muted};">
      Não desanimes - há mais boleias disponíveis na app!
    </p>
    ${ctaButton('Explorar boleias')}
  `);
}

export function bookingCancelledEmailHtml(
  driverName: string,
  passengerName: string,
  origin: string,
  destination: string,
  departureTime: string,
): string {
  return layout(`
    ${greeting(driverName)}
    ${h1('Reserva cancelada')}
    <p style="margin:0 0 4px;font-size:15px;color:${BASE.muted};">
      <strong style="color:${BASE.primary};">${passengerName}</strong> cancelou a reserva na tua boleia.
    </p>
    ${routeCard(origin, destination, departureTime)}
    <p style="margin:0;font-size:14px;color:${BASE.muted};">
      O lugar ficou novamente disponível na plataforma.
    </p>
    ${ctaButton('Ver a minha boleia')}
  `);
}

export function rideCancelledEmailHtml(
  userName: string,
  origin: string,
  destination: string,
  departureTime: string,
): string {
  return layout(`
    ${greeting(userName)}
    ${h1('Boleia cancelada')}
    <p style="margin:0 0 4px;font-size:15px;color:${BASE.muted};">
      O condutor cancelou a boleia. Se tiveste um pagamento debitado, foi reembolsado automaticamente.
    </p>
    ${routeCard(origin, destination, departureTime)}
    <p style="margin:0;font-size:14px;color:${BASE.muted};">
      Encontra outra boleia alternativa na app.
    </p>
    ${ctaButton('Explorar boleias')}
  `);
}

export function lateCancelWarningEmailHtml(
  userName: string,
  count: number,
  windowDays: number,
): string {
  return layout(`
    ${greeting(userName)}
    ${h1('Aviso de cancelamentos')}
    <p style="margin:0 0 16px;font-size:15px;color:${BASE.muted};">
      Nos ultimos <strong style="color:${BASE.primary};">${windowDays} dias</strong> tiveste
      <strong style="color:${BASE.primary};">${count} cancelamentos de ultima hora</strong> (menos de 2h antes da partida).
    </p>
    <div style="background:#fef9c3;border:1px solid #fde047;border-radius:12px;padding:16px;margin-bottom:16px;">
      <p style="margin:0;font-size:14px;color:#713f12;">
        Cancelamentos frequentes de ultima hora prejudicam os passageiros e a tua taxa de fiabilidade.
        Se continuares, a tua conta pode ser suspensa temporariamente.
      </p>
    </div>
    <p style="margin:0;font-size:14px;color:${BASE.muted};">
      Se precisares de cancelar uma boleia, tenta faze-lo com pelo menos 2 horas de antecedencia.
      Isso permite que os passageiros encontrem alternativas a tempo.
    </p>
    ${ctaButton('Ver as minhas boleias')}
  `);
}
