import { useRef, useState, useEffect, useMemo } from "react";
import type { AriaAttributes } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage, type LanguageCode } from "../contexts/LanguageContext";
import { useNotifications } from "../contexts/NotificationContext";
import type { DaySchedule, TimeBlock, UserSchedule } from "./types/user";
import ScheduleEditor from "../components/ui/ScheduleEditor";
import WeekCalendar from "../components/ui/WeekCalendar";
import Sheet from "../components/ui/Sheet";
import { Button } from "../components/ui/Button";
import WalletSheet from "../components/profile/WalletSheet";
import SupportContactSheet from "../components/profile/SupportContactSheet";
import LanguageSettingsPage from "./LanguageSettingsPage";
import { TERMS_LAST_UPDATED, TERMS_SECTIONS, TERMS_TITLE } from "../data/terms";
import {
  flattenSchedule,
  getDayLabel,
  normalizeUserSchedule,
  sortEntriesByUpcoming,
  WEEK_DAY_META,
} from "../utils/userSchedule";

interface ProfilePageProps {
  onLogout?: () => void;
}

type PasswordFeedback = {
  message: string;
  tone: "success" | "error";
};

type DaySummary = {
  key: DaySchedule["day"];
  label: string;
  short: string;
  count: number;
  firstBlock?: TimeBlock;
};

export default function ProfilePage({ onLogout }: ProfilePageProps) {
  const { user, updateProfile } = useAuth();
  const { language, setLanguage, getLanguageLabel } = useLanguage();
  const { showSuccess } = useNotifications();
  
  // Dados do utilizador - sempre com valores definidos
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<UserSchedule>({ days: [] });
  const [showCalendarPreview, setShowCalendarPreview] = useState(false);

  const [openEdit, setOpenEdit] = useState(false);
  const [openSchedule, setOpenSchedule] = useState(false);
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
  const [openWallet, setOpenWallet] = useState(false);
  const [openReferral, setOpenReferral] = useState(false);
  const [openPassword, setOpenPassword] = useState(false);
  const [openSupport, setOpenSupport] = useState(false);
  const [openTerms, setOpenTerms] = useState(false);
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPasswordValue, setNewPasswordValue] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<PasswordFeedback | null>(null);
  const [showLanguagePage, setShowLanguagePage] = useState(false);
  const [pendingLanguage, setPendingLanguage] = useState<LanguageCode>(language);
  const inputFileRef = useRef<HTMLInputElement | null>(null);
  const copyTimeoutRef = useRef<number | undefined>(undefined);

  const scheduleEntries = useMemo(() => flattenSchedule(schedule, true), [schedule]);
  const hasSchedule = scheduleEntries.length > 0;
  const totalBlocks = scheduleEntries.length;
  const totalDays = schedule.days.length;
  const upcomingEntries = useMemo(() => sortEntriesByUpcoming(scheduleEntries), [scheduleEntries]);
  const primaryClass = upcomingEntries[0];
  const secondaryClass = upcomingEntries[1];
  const daySummaries = useMemo<DaySummary[]>(
    () =>
      WEEK_DAY_META.map(meta => {
        const dayData = schedule.days.find(day => day.day === meta.key);
        return {
          key: meta.key,
          label: meta.label,
          short: meta.short,
          count: dayData?.blocks.length ?? 0,
          firstBlock: dayData?.blocks[0],
        };
      }),
    [schedule],
  );

  const referralCode = useMemo(() => {
    if (!user) return "HOPON10";
    const nameBase = user.profile?.name?.replace(/\s+/g, "").toUpperCase() ?? "";
    const emailBase = user.email?.split("@")[0]?.toUpperCase() ?? "";
    const fallback = nameBase || emailBase || "HOPON";
    const suffix = user.id.slice(-3).toUpperCase();
    const raw = `${fallback}${suffix}`.replace(/[^A-Z0-9]/g, "");
    return raw.slice(0, 8).padEnd(6, "0");
  }, [user]);

  const passwordHasMinChars = newPasswordValue.length >= 8;
  const passwordsMatch = confirmPassword.length > 0 && newPasswordValue === confirmPassword;
  const canSavePassword = oldPassword.length >= 6 && passwordHasMinChars && passwordsMatch;
  const visibleEmail = (contactEmail && contactEmail.trim()) || email;

  // Sincronizar com o user quando muda
  useEffect(() => {
    const profile = user?.profile;
    setEmail(user?.email || "");

    if (profile) {
      setName(profile.name || "");
      setUsername(profile.username || "");
      setContactEmail(profile.contactEmail || user?.email || "");
      setAvatarUrl(profile.avatarUrl || null);
      setSchedule(normalizeUserSchedule(profile.schedule || { days: [] }));
      return;
    }

    setName("");
    setUsername("");
    setContactEmail(user?.email || "");
    setAvatarUrl(null);
    setSchedule({ days: [] });
  }, [user]);

  useEffect(() => {
    if (!hasSchedule && showCalendarPreview) {
      setShowCalendarPreview(false);
    }
  }, [hasSchedule, showCalendarPreview]);

  useEffect(() => () => {
    if (copyTimeoutRef.current) {
      window.clearTimeout(copyTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (!showLanguagePage) {
      setPendingLanguage(language);
    }
  }, [language, showLanguagePage]);

  useEffect(() => {
    if (!openReferral && copyTimeoutRef.current) {
      window.clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = undefined;
    }
    if (!openReferral) {
      setCopiedReferral(false);
    }
  }, [openReferral]);

  useEffect(() => {
    if (!openPassword) {
      resetPasswordForm();
    }
  }, [openPassword]);

  function handlePickPhoto() {
    inputFileRef.current?.click();
  }
  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAvatarUrl(url);
  }

  function handleLogout() {
    onLogout?.();
  }

  function handleDeleteAccount() {
    // TODO: Implementar lógica de apagar conta (funcionalidade futura)
    console.log("Conta apagada");
    onLogout?.();
  }

  function handleSaveProfile() {
    if (!user?.profile) return;
    updateProfile({
      ...user.profile,
      username: username.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined,
      avatarUrl: avatarUrl || undefined,
    });
    setOpenEdit(false);
  }

  function handleSaveSchedule() {
    if (!user?.profile) return;
    const sanitized = normalizeUserSchedule(schedule);
    setSchedule(sanitized);
    updateProfile({
      ...user.profile,
      schedule: sanitized,
    });
    setOpenSchedule(false);
  }

  function handleSavePassword() {
    if (!canSavePassword) {
      setPasswordFeedback({
        tone: "error",
        message: "Confirma se todos os campos estão preenchidos e iguais.",
      });
      return;
    }

    console.log("Alterar palavra-passe (demo)", {
      oldPassword,
      newPassword: newPasswordValue,
    });

    setPasswordFeedback({
      tone: "success",
      message: "Palavra-passe atualizada (modo demonstração).",
    });
  }

  function resetPasswordForm() {
    setOldPassword("");
    setNewPasswordValue("");
    setConfirmPassword("");
    setShowOldPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setPasswordFeedback(null);
  }

  async function handleCopyReferralCode() {
    if (!referralCode) return;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(referralCode);
        setCopiedReferral(true);
        if (copyTimeoutRef.current) {
          window.clearTimeout(copyTimeoutRef.current);
        }
        copyTimeoutRef.current = window.setTimeout(() => {
          setCopiedReferral(false);
          copyTimeoutRef.current = undefined;
        }, 2000);
      }
    } catch (error) {
      console.warn("Não foi possível copiar o código de convite", error);
    }
  }

  if (showLanguagePage) {
    return (
      <LanguageSettingsPage
        current={language}
        selected={pendingLanguage}
        onSelect={setPendingLanguage}
        onBack={() => {
          setPendingLanguage(language);
          setShowLanguagePage(false);
        }}
        onSave={() => {
          if (pendingLanguage !== language) {
            setLanguage(pendingLanguage);
            const newLabel = getLanguageLabel(pendingLanguage);
            showSuccess("Idioma alterado", `A interface está agora em ${newLabel}`);
          }
          setShowLanguagePage(false);
        }}
      />
    );
  }

  return (
    <div className="relative min-h-screen pb-28 text-white overflow-hidden">
      {/* Blur effects coloridos */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-10 w-[28rem] h-[28rem] bg-pink-500/20 blur-[180px]" />
        <div className="absolute top-32 right-0 w-[24rem] h-[24rem] bg-purple-500/20 blur-[160px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[32rem] h-[32rem] bg-amber-200/15 blur-[200px]" />
      </div>
      
      <div className="relative z-10">
      {/* Card topo - design melhorado */}
      <section className="bg-white/5 border border-white/10 mb-4 rounded-xl mx-4 shadow-sm backdrop-blur-sm relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#FF719A]/10 via-[#FFA99F]/5 to-transparent h-32" aria-hidden />
        
        <div className="relative px-4 py-4">
          {/* Layout horizontal: foto + nome e email */}
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#FFE29F] via-[#FFA99F] to-[#FF719A] text-black flex items-center justify-center text-xl font-bold flex-shrink-0 overflow-hidden shadow-lg ring-2 ring-white/10" aria-hidden>
              {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <span>{initials(name)}</span>}
            </div>

            {/* Nome e email na mesma linha */}
            <div className="flex-1 min-w-0">
              {name && <div className="text-base font-semibold text-white truncate">{name}</div>}
              {visibleEmail && <div className="text-sm text-white/70 truncate">{visibleEmail}</div>}
            </div>
          </div>
        </div>
      </section>

      {/* Horário - preview inteligente */}
      <section className="bg-white/5 border border-white/10 px-4 py-4 mb-4 rounded-xl mx-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-white/50 font-semibold">Ritmo semanal</p>
            <h2 className="text-base font-bold text-white">O meu horário</h2>
          </div>
          <button
            className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium hover:bg-primary/20 transition"
            onClick={() => setOpenSchedule(true)}
          >
            {hasSchedule ? "Gerir" : "Adicionar"}
          </button>
        </div>

        {!hasSchedule ? (
          <div className="text-center py-8">
            <p className="text-sm font-semibold text-white mb-1">Ainda não adicionaste aulas</p>
            <p className="text-xs text-white/60">Define o teu horário para desbloquear sugestões automáticas.</p>
          </div>
        ) : (
          <>
            {primaryClass && (
              <div className="mt-4 rounded-2xl bg-gray-900 text-white px-4 py-4 shadow-inner">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-white/60 font-semibold">Próxima aula</p>
                    <p className="text-lg font-semibold leading-tight">{primaryClass.block.title ?? "Aula"}</p>
                    <p className="text-sm text-white/70">
                      {getDayLabel(primaryClass.day)} · {primaryClass.block.room ?? "Sala por definir"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium">
                      {getDayLabel(primaryClass.day, "short")}
                    </span>
                    <p className="mt-2 text-2xl font-black leading-none">{primaryClass.block.start}</p>
                    <p className="text-xs text-white/70">até {primaryClass.block.end}</p>
                  </div>
                </div>
                {secondaryClass && (
                  <div className="mt-4 rounded-xl bg-white/10 px-3 py-2 text-xs flex items-center justify-between gap-3">
                    <span className="font-semibold truncate">{secondaryClass.block.title ?? getDayLabel(secondaryClass.day)}</span>
                    <span className="text-right">
                      {getDayLabel(secondaryClass.day, "short")} · {secondaryClass.block.start}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 grid grid-cols-3 gap-2">
              {daySummaries.map(day => {
                const hasBlocks = day.count > 0;
                return (
                  <button
                    key={day.key}
                    type="button"
                    className={`rounded-2xl border px-3 py-2 text-left transition ${
                      hasBlocks ? "border-[#FF719A] bg-gradient-to-r from-[#FFE29F] via-[#FFA99F] to-[#FF719A] text-black" : "border-dashed border-white/20 bg-white/5 text-white/50"
                    }`}
                    onClick={() => setOpenSchedule(true)}
                  >
                    <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide">
                      <span>{day.short}</span>
                      <span>{hasBlocks ? `${day.count}×` : "—"}</span>
                    </div>
                    {day.firstBlock ? (
                      <>
                        <p className="mt-1 text-sm font-semibold">{day.firstBlock.start}</p>
                        <p className={`text-xs ${hasBlocks ? "text-white/70" : "text-gray-400"}`}>
                          {day.firstBlock.title ?? "Bloco"}
                        </p>
                      </>
                    ) : (
                      <p className={`mt-1 text-xs ${hasBlocks ? "text-white/70" : "text-gray-400"}`}>Livre</p>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex items-center justify-center gap-3 text-xs text-white/60">
              <span>
                {totalBlocks} {totalBlocks === 1 ? "aula" : "aulas"}
              </span>
              <span className="text-gray-300">•</span>
              <span>
                {totalDays} {totalDays === 1 ? "dia" : "dias"}
              </span>
            </div>

            <button
              type="button"
              className="mt-3 w-full px-3 py-2.5 rounded-xl border border-white/20 bg-white/5 text-white text-sm font-semibold hover:bg-white/10 transition"
              onClick={() => setShowCalendarPreview(prev => !prev)}
            >
              {showCalendarPreview ? "Esconder calendário semanal" : "Ver calendário semanal"}
            </button>

            {showCalendarPreview && (
              <div className="mt-3 rounded-2xl border border-gray-200 bg-gray-50 p-2">
                <WeekCalendar schedule={schedule} onBlockClick={() => setOpenSchedule(true)} compact />
              </div>
            )}
          </>
        )}
      </section>

      <nav className="bg-white/5 border border-white/10 rounded-xl mx-4 mb-4 overflow-hidden shadow-sm backdrop-blur-sm" aria-label="Perfil">
        <div className="px-4 py-3 bg-white/5 border-b border-white/10">
          <h3 className="text-xs font-bold text-white/70 uppercase tracking-wide">Perfil</h3>
        </div>
        <ListRow label="Editar perfil" onClick={() => setOpenEdit(true)} />
        <ListRow label="Editar palavra-passe" onClick={() => setOpenPassword(true)} />
        <ListRow label="Veículos" caption="Adicionar/editar" onClick={() => {}} />
        <ListRow label="Verificação" onClick={() => {}} />
        <ListRow label="Preferências de condução" onClick={() => {}} />
        <ListRow label="Pagamentos" caption="MB Way e cartão" onClick={() => setOpenWallet(true)} />
      </nav>

      <nav className="bg-white/5 border border-white/10 rounded-xl mx-4 mb-4 overflow-hidden shadow-sm backdrop-blur-sm" aria-label="Benefícios">
        <div className="px-4 py-3 bg-white/5 border-b border-white/10">
          <h3 className="text-xs font-bold text-white/70 uppercase tracking-wide">Benefícios</h3>
        </div>
        <ListRow
          label="Convidar amigos"
          caption="Partilha o teu código e recebe descontos"
          onClick={() => setOpenReferral(true)}
        />
      </nav>

      <nav className="bg-white/5 border border-white/10 rounded-xl mx-4 mb-4 overflow-hidden shadow-sm backdrop-blur-sm" aria-label="Ajuda e qualidade">
        <div className="px-4 py-3 bg-white/5 border-b border-white/10">
          <h3 className="text-xs font-bold text-white/70 uppercase tracking-wide">Ajuda & Qualidade</h3>
        </div>
        <ListRow
          label="Idioma da app"
          caption={getLanguageLabel(language)}
          onClick={() => {
            setPendingLanguage(language);
            setShowLanguagePage(true);
          }}
        />
        <ListRow label="Avaliações" onClick={() => {}} />
        <ListRow label="Contacta-nos" onClick={() => setOpenSupport(true)} />
        <ListRow
          label="Termos e Condições"
          onClick={() => setOpenTerms(true)}
          ariaHasPopup="dialog"
          ariaControls="profile-terms-sheet"
        />
      </nav>

      <div className="bg-white/5 border border-white/10 rounded-xl mx-4 mb-4 overflow-hidden shadow-sm backdrop-blur-sm">
        <ListRow label="Terminar sessão" tone="danger" onClick={handleLogout} />
        <ListRow label="Apagar conta" tone="danger" onClick={() => setOpenDeleteConfirm(true)} />
      </div>

      {/* Sheet: editar perfil */}
      <Sheet
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        title="Editar perfil"
        height="md"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setOpenEdit(false)}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleSaveProfile}>
              Guardar
            </Button>
          </div>
        }
      >
        <div className="grid gap-6">
          {/* Foto */}
          <div className="flex flex-col items-center gap-3 pb-6 border-b border-gray-200">
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary to-primary/80 text-white flex items-center justify-center text-3xl font-bold overflow-hidden shadow-lg ring-4 ring-primary/10" aria-label="Foto de perfil">
              {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <span>{initials(name)}</span>}
            </div>
            <div className="flex flex-col items-center gap-2">
              <input
                ref={inputFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                title="Selecionar foto de perfil"
                aria-hidden="true"
                onChange={onFileChange}
              />
              <Button variant="secondary" onClick={handlePickPhoto}>
                Alterar foto
              </Button>
              {avatarUrl && (
                <button className="text-sm text-red-600 hover:underline font-medium" onClick={() => setAvatarUrl(null)}>
                  Remover foto
                </button>
              )}
            </div>
          </div>

          {/* Informação pessoal */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              Informação pessoal
            </h3>

            <Field label="Username / apelido público" htmlFor="pf-username" hint="Opcional. Usa um @apelido curto para partilhar o perfil.">
              <input
                id="pf-username"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Ex: joaosilva"
                title="Editar username"
                autoComplete="nickname"
              />
            </Field>
          </div>

          {/* Contactos */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              Contactos
            </h3>

            <Field label="Email preferencial" htmlFor="pf-contact-email" hint="Opcional para recibos, suporte e alertas.">
              <input
                id="pf-contact-email"
                type="email"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={contactEmail}
                onChange={e => setContactEmail(e.target.value)}
                placeholder="Ex: joao@exemplo.com"
                title="Editar email preferencial"
                autoComplete="email"
              />
            </Field>
          </div>
        </div>
      </Sheet>

      {/* Sheet: alterar palavra-passe */}
      <Sheet
        open={openPassword}
        onClose={() => setOpenPassword(false)}
        title="Editar palavra-passe"
        height="md"
        footer={
          <Button
            block
            className="min-h-[48px]"
            onClick={handleSavePassword}
            disabled={!canSavePassword}
          >
            Guardar palavra-passe
          </Button>
        }
      >
        <div className="space-y-6 py-1">
          <p className="text-sm text-gray-600">
            Atualiza regularmente a tua palavra-passe para proteger a conta. Fluxo em modo demonstração.
          </p>

          <div className="space-y-5">
            <PasswordField
              id="pf-old-password"
              label="Palavra-passe atual"
              placeholder="••••••••"
              value={oldPassword}
              onChange={setOldPassword}
              isVisible={showOldPassword}
              onToggle={() => setShowOldPassword(prev => !prev)}
              autoComplete="current-password"
            />

            <div className="space-y-2">
              <PasswordField
                id="pf-new-password"
                label="Nova palavra-passe"
                placeholder="Mínimo 8 caracteres"
                value={newPasswordValue}
                onChange={setNewPasswordValue}
                isVisible={showNewPassword}
                onToggle={() => setShowNewPassword(prev => !prev)}
                autoComplete="new-password"
              />
              <p className={`text-xs ${passwordHasMinChars ? "text-green-600" : "text-gray-500"}`}>
                A nova palavra-passe deve ter pelo menos 8 caracteres.
              </p>
            </div>

            <div className="space-y-2">
              <PasswordField
                id="pf-confirm-password"
                label="Confirmar palavra-passe"
                placeholder="Repete a nova palavra-passe"
                value={confirmPassword}
                onChange={setConfirmPassword}
                isVisible={showConfirmPassword}
                onToggle={() => setShowConfirmPassword(prev => !prev)}
                autoComplete="new-password"
              />
              {confirmPassword.length > 0 && newPasswordValue !== confirmPassword && (
                <p className="text-xs text-red-600">As palavras-passe não coincidem.</p>
              )}
            </div>
          </div>

          {passwordFeedback && (
            <p
              className={`text-sm ${
                passwordFeedback.tone === "success" ? "text-green-600" : "text-red-600"
              }`}
              aria-live="polite"
            >
              {passwordFeedback.message}
            </p>
          )}
        </div>
      </Sheet>

      {/* Sheet: gerir horário */}
      <Sheet
        open={openSchedule}
        onClose={() => setOpenSchedule(false)}
        title="Gerir horário"
        height="lg"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setOpenSchedule(false)}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleSaveSchedule}>
              Guardar alterações
            </Button>
          </div>
        }
      >
        <ScheduleEditor schedule={schedule} onChange={next => setSchedule(normalizeUserSchedule(next))} />
      </Sheet>

      {/* Sheet: convites */}
      <Sheet
        open={openReferral}
        onClose={() => setOpenReferral(false)}
        title="Convidar amigos"
        height="md"
        footer={
          <Button block className="min-h-[48px]" disabled>
            Partilhar convite (brevemente)
          </Button>
        }
      >
        <div className="space-y-6 py-2">
          <div className="text-center space-y-2">
            <p className="text-base font-semibold text-gray-900">Ganha descontos a cada convite</p>
            <p className="text-sm text-gray-500">
              Em breve, quando um amigo usar o teu código, ambos recebem uma percentagem de desconto na próxima viagem.
            </p>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4 shadow-inner">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">O teu código</div>
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-lg tracking-[0.35em] text-gray-900">{referralCode}</span>
              <button
                type="button"
                onClick={handleCopyReferralCode}
                className="p-3 rounded-2xl bg-white border border-gray-200 shadow-sm hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Copiar código de convite"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <rect x="7" y="7" width="12" height="12" rx="3" stroke="currentColor" strokeWidth="2" />
                  <path d="M5 15V7a2 2 0 0 1 2-2h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-3 min-h-[16px]" aria-live="polite">
              {copiedReferral ? "Código copiado! Cola em qualquer app de mensagens." : "Toca para copiar e partilha com colegas."}
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Como vai funcionar</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="h-8 w-8 rounded-2xl bg-primary/10 text-primary font-semibold flex items-center justify-center">1</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Partilha o teu código</p>
                  <p className="text-xs text-gray-500">Copia e envia pelo WhatsApp, Instagram ou onde preferires.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="h-8 w-8 rounded-2xl bg-primary/10 text-primary font-semibold flex items-center justify-center">2</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">O amigo usa o convite</p>
                  <p className="text-xs text-gray-500">Assim que ele confirmar a conta, o desconto fica reservado.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="h-8 w-8 rounded-2xl bg-primary/10 text-primary font-semibold flex items-center justify-center">3</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Desconto aplicado</p>
                  <p className="text-xs text-gray-500">Ambos recebem uma percentagem de desconto na próxima boleia.</p>
                </div>
              </li>
            </ul>
          </div>

          <p className="text-xs text-gray-400 text-center">
            Funcionalidade visual por agora. As recompensas reais chegam em breve. ✌️
          </p>
        </div>
      </Sheet>

      {/* Sheet: confirmação de apagar conta */}
      <Sheet
        open={openDeleteConfirm}
        onClose={() => setOpenDeleteConfirm(false)}
        title="Apagar conta"
        height="md"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setOpenDeleteConfirm(false)}>
              Cancelar
            </Button>
            <Button variant="danger" className="flex-1" onClick={handleDeleteAccount}>
              Apagar conta
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 text-center">
          <h3 className="text-lg font-bold text-gray-900">Tens a certeza?</h3>
          <p className="text-sm text-gray-600">
            Esta ação não pode ser desfeita. Todos os teus dados, boleias e histórico serão permanentemente removidos.
          </p>
          <div className="text-left bg-red-50 rounded-xl p-4 border border-red-200">
            <p className="text-sm font-semibold text-red-900 mb-2"><strong>Será apagado:</strong></p>
            <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
              <li>Perfil e dados pessoais</li>
              <li>Histórico de boleias</li>
              <li>Mensagens e conversas</li>
              <li>Preferências e configurações</li>
            </ul>
          </div>
        </div>
      </Sheet>

      <Sheet
        open={openTerms}
        onClose={() => setOpenTerms(false)}
        title={TERMS_TITLE}
        height="lg"
      >
        <div id="profile-terms-sheet" className="space-y-6 text-sm text-gray-700">
          {TERMS_SECTIONS.map(section => (
            <section key={section.title} className="space-y-2">
              <h4 className="text-base font-semibold text-gray-900">{section.title}</h4>
              <p className="leading-relaxed text-gray-600">{section.content}</p>
            </section>
          ))}
          <p className="text-xs text-gray-500">
            Estes Termos e Condições são preliminares e serão validados juridicamente antes do lançamento público.
            Última atualização: {TERMS_LAST_UPDATED}.
          </p>
        </div>
      </Sheet>

      <WalletSheet open={openWallet} onClose={() => setOpenWallet(false)} />
      <SupportContactSheet open={openSupport} onClose={() => setOpenSupport(false)} />
      </div>
    </div>
  );
}

type PasswordFieldProps = {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  isVisible: boolean;
  onToggle: () => void;
  autoComplete?: string;
};

function PasswordField({
  id,
  label,
  placeholder,
  value,
  onChange,
  isVisible,
  onToggle,
  autoComplete,
}: PasswordFieldProps) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700" htmlFor={id}>
        {label}
      </label>
      <div className="relative mt-2">
        <input
          id={id}
          type={isVisible ? "text" : "password"}
          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-base placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={`${isVisible ? "Ocultar" : "Mostrar"} ${label.toLowerCase()}`}
          aria-pressed={isVisible}
          className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-gray-900 focus:outline-none"
        >
          <EyeIcon crossed={!isVisible} />
        </button>
      </div>
    </div>
  );
}

function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      {crossed && <path d="M4 4l16 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />}
    </svg>
  );
}

function Field({
  label, htmlFor, hint, children,
}: { label: string; htmlFor: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1" htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <div className="text-xs text-gray-500 mt-1">{hint}</div>}
    </div>
  );
}

type ListRowProps = {
  label: string;
  caption?: string;
  tone?: "default" | "danger";
  icon?: string;
  onClick?: () => void;
  ariaHasPopup?: AriaAttributes["aria-haspopup"];
  ariaControls?: string;
};

function ListRow({
  label,
  caption,
  tone = "default",
  icon,
  onClick,
  ariaHasPopup,
  ariaControls,
}: ListRowProps) {
  return (
    <button 
      className={`w-full flex items-center justify-between px-4 py-3.5 border-b border-white/10 last:border-b-0 hover:bg-white/10 transition ${tone === "danger" ? "text-red-300" : "text-white"}`} 
      onClick={onClick}
      aria-haspopup={ariaHasPopup}
      aria-controls={ariaControls}
    >
      <div className="flex items-center gap-3 text-left">
        {icon && <span className="text-xl" aria-hidden>{icon}</span>}
        <div>
          <div className="text-sm font-medium">{label}</div>
          {caption && <div className="text-xs text-white/60 mt-0.5">{caption}</div>}
        </div>
      </div>
      <svg className={tone === "danger" ? "text-red-300" : "text-white/50"} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" />
      </svg>
    </button>
  );
}

function initials(n: string) {
  const parts = n.trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase() ?? "").join("");
}
