# Profile Setup — Passo 3 (por completar)

O fluxo de criação de perfil tem atualmente **2 passos**. Este documento descreve como reativar o **Passo 3 (Horários)** quando quiseres completar a funcionalidade.

## Estado atual

- **Passo 1:** Identidade (foto + nome)
- **Passo 2:** Contactos e casa (telemóvel, username, morada) → **Concluir** marca o perfil como completo (`setupCompleted: true`)

## O que falta: Passo 3 — Horários

- **Objetivo:** O utilizador adiciona a agenda semanal (horários) e só depois o perfil fica completo.
- **Concluir** deve passar a estar no **fim do passo 3**, com validação e gravação do horário e `setupCompleted: true`.

## Como implementar (checklist)

### 1. `src/pages/ProfileSetupPage.tsx`

- [ ] Importar de novo: `UserSchedule` de `./types/user` e `ScheduleEditor` de `../components/ui/ScheduleEditor`.
- [ ] Alterar tipo: `Step = 1 | 2 | 3`.
- [ ] Adicionar ao `STEP_META` a entrada para o passo 3, por exemplo:
  - `eyebrow`: "Horários"
  - `title`: "Qual é o teu ritmo?"
  - `subtitle`: "Adiciona compromissos para sugerirmos boleias que encaixam no teu dia."
- [ ] Adicionar estado: `const [schedule, setSchedule] = useState<UserSchedule>({ days: [] });`
- [ ] Em `handleNext`: quando `step === 2`, validar telemóvel e morada; quando `step < 3`, avançar para `step + 1`.
- [ ] Em `handleFinish`:
  - Validar `schedule.days.length > 0` (mostrar erro ex.: "Horário necessário" se vazio).
  - Incluir `schedule` no objeto do perfil enviado a `updateProfile` e manter `setupCompleted: true`.
- [ ] Adicionar o bloco de UI do passo 3: título + `ScheduleEditor` com `schedule` e `setSchedule`.
- [ ] Botões: em `step < 3` mostrar "Continuar" (`handleNext`), em `step === 3` mostrar "Concluir" (`handleFinish`).
- [ ] Badge: "Passo {step} / 3".

### 2. Backend

- O backend já aceita `schedule` (string JSON) e `setupCompleted` no `UpdateProfileDto` e no `auth.service.ts`. Nada a alterar se já estiver assim.

### 3. AuthContext

- O `updateProfile` já envia `schedule` (em JSON) e `setupCompleted`. Verificar que o payload em `handleFinish` inclui `schedule` quando o passo 3 estiver ativo.

## Resumo do fluxo após completar

1. Passo 1 → Continuar  
2. Passo 2 → Continuar (validar telemóvel e morada)  
3. Passo 3 → Concluir (validar pelo menos um horário, guardar perfil + schedule + `setupCompleted: true`)

Quando estiveres pronto para implementar, segue este documento passo a passo.
