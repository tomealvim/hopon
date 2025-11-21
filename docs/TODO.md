# Autenticação – Próximos Passos

## 1. OTP real (email/SMS)
- [ ] Definir fornecedor: Firebase Auth, Twilio Verify, Supabase, Clerk ou outro.
- [ ] Criar endpoint/SDK para enviar código (`POST /auth/otp/send`), recebendo email ou nº telefone.
- [ ] Implementar validação do código (`POST /auth/otp/verify`), devolvendo token de sessão ou marcando contacto como confirmado.
- [ ] Manter limite de tempo e tentativa (ex.: 5 min / 5 tentativas) — verificar boas práticas do fornecedor escolhido.
- [ ] Atualizar frontend (`AuthPage`) para chamar estes endpoints (hoje está em modo mock).

## 2. Sign‑in com Google e Apple
- [ ] Escolher estratégia (SDK nativo, Firebase/Auth0/Clerk, etc.).
- [ ] Configurar credenciais OAuth (console Google Cloud + Apple Developer).
- [ ] Implementar chamada no frontend (botões já estão estilizados).
- [ ] Garantir fallback: se o provider devolver apenas email, pedir telemóvel posteriormente para OTP.

## 3. “Forgot password” com OTP
- [ ] Desenhar ecrã “Esqueci a palavra‑passe” semelhante ao fluxo OTP atual.
- [ ] Reutilizar endpoints de envio/validação de código com scope “reset password”.
- [ ] Após validar o código, permitir definir nova palavra‑passe e atualizar via backend.

### Recomendações / Pesquisas
- Documentação do fornecedor escolhido (Twilio Verify, Firebase, etc.) para limites, preços e políticas anti‑fraude.
- UX guidelines para OTP acessível (teclado numérico, auto avanço, permitir colagem).
- Requisitos Apple/Google para Sign in with Apple (obrigatório em apps iOS com outros logins sociais).

> Assim que os serviços estiverem definidos/configurados, conseguimos ligar o frontend rapidamente. Até lá, os componentes já estão preparados para integrar as chamadas reais.

## 4. Programa de convites / descontos
- [ ] Definir modelo no backend para códigos de convite + percentagem de desconto atribuída a convidado/convidador.
- [ ] Expor endpoints para gerar/consultar estatuto do código e registar uso (ex.: `GET /referrals/:code`, `POST /referrals/use`).
- [ ] Atualizar o sheet “Convidar amigos” do `ProfilePage` para consumir os endpoints reais (gerar partilha/callbacks).
- [ ] Definir lógica de atribuição dos descontos e quando ficam disponíveis em reservas/boleias.

## 5. Wallet / Hopon Cash
- [ ] Decidir fornecedor para processar top-ups (Stripe Payments, Revolut for Business, MB Way API, etc.) e mapear custos.
- [ ] Criar endpoints para gerir saldo (`GET /wallet`, `POST /wallet/topups`, `GET /wallet/methods`, `POST /wallet/methods`).
- [ ] Persistir métodos adicionados + validar Apple Pay / MB Way (tokens, device binding).
- [ ] Implementar webhook de confirmação de pagamento e atualização de saldo (cash-in e cash-out futuros).
- [ ] Propagar saldo às viagens (usar Hopon Cash como método ao reservar boleias).
- [ ] Ligar `WalletSheet` ao backend: carregar lista de métodos reais, criar top-up, mostrar estados (pending/success/failure).

## 6. Termos e condições
- [ ] Rever o texto atual dos Termos e Condições com a equipa legal e publicar a versão oficial.
- [ ] Definir responsável e processo de atualização para futuras revisões legais.

## 7. Contacto / Suporte
- [ ] Disponibilizar seletor de indicativo internacional no formulário “Contacta-nos” (lista de países + prefixos).
- [ ] Definir se o backend valida/normaliza números e como guardar país + telefone no ticket de suporte.

