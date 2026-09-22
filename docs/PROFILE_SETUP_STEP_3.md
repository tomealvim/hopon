# Profile Setup - Step 3 (to be completed)

The profile creation flow currently has **2 steps**. This document describes how to reactivate **Step 3 (Schedule)** when you want to complete the feature.

## Current state

- **Step 1:** Identity (photo + name)
- **Step 2:** Contacts and home (phone, username, address) → **Finish** marks the profile as complete (`setupCompleted: true`)

## What's missing: Step 3 - Schedule

- **Goal:** The user adds their weekly schedule and only then is the profile considered complete.
- **Finish** should move to the **end of step 3**, with validation and saving of the schedule and `setupCompleted: true`.

## How to implement (checklist)

### 1. `src/pages/ProfileSetupPage.tsx`

- [ ] Re-import: `UserSchedule` from `./types/user` and `ScheduleEditor` from `../components/ui/ScheduleEditor`.
- [ ] Change type: `Step = 1 | 2 | 3`.
- [ ] Add the entry for step 3 to `STEP_META`, for example:
  - `eyebrow`: "Horários"
  - `title`: "Qual é o teu ritmo?"
  - `subtitle`: "Adiciona compromissos para sugerirmos boleias que encaixam no teu dia."
- [ ] Add state: `const [schedule, setSchedule] = useState<UserSchedule>({ days: [] });`
- [ ] In `handleNext`: when `step === 2`, validate phone and address; when `step < 3`, advance to `step + 1`.
- [ ] In `handleFinish`:
  - Validate `schedule.days.length > 0` (show an error e.g. "Schedule required" if empty).
  - Include `schedule` in the profile object sent to `updateProfile` and keep `setupCompleted: true`.
- [ ] Add the step 3 UI block: title + `ScheduleEditor` with `schedule` and `setSchedule`.
- [ ] Buttons: on `step < 3` show "Continuar" (`handleNext`), on `step === 3` show "Concluir" (`handleFinish`).
- [ ] Badge: "Passo {step} / 3".

### 2. Backend

- The backend already accepts `schedule` (JSON string) and `setupCompleted` in `UpdateProfileDto` and in `auth.service.ts`. Nothing to change if it's already like this.

### 3. AuthContext

- `updateProfile` already sends `schedule` (as JSON) and `setupCompleted`. Verify that the payload in `handleFinish` includes `schedule` when step 3 is active.

## Flow summary once completed

1. Step 1 → Continue  
2. Step 2 → Continue (validate phone and address)  
3. Step 3 → Finish (validate at least one schedule entry, save profile + schedule + `setupCompleted: true`)

When you're ready to implement it, follow this document step by step.
