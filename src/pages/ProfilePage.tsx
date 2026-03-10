import { useRef, useState, useEffect, useMemo } from "react";
import type { AriaAttributes } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage, type LanguageCode } from "../contexts/LanguageContext";
import { useNotifications } from "../contexts/NotificationContext";
import { cn } from "../utils/cn";
import type { UserSchedule, Vehicle } from "./types/user";
import ScheduleEditor from "../components/ui/ScheduleEditor";
import WeekCalendar from "../components/ui/WeekCalendar";
import Sheet from "../components/ui/Sheet";
import { Button } from "../components/ui/Button";
import WalletSheet from "../components/profile/WalletSheet";
import SupportContactSheet from "../components/profile/SupportContactSheet";
import LanguageSettingsSheet from "../components/profile/LanguageSettingsSheet";
import VehicleFormSheet, { type VehicleFormValues } from "../components/profile/VehicleFormSheet";
import VerificationSheet from "../components/profile/VerificationSheet";
import RatingsSheet from "../components/profile/RatingsSheet";
import HistorySheet from "../components/profile/HistorySheet";
import IdentityVerificationSheet from "../components/profile/IdentityVerificationSheet";
import DriverLicenseSheet from "../components/profile/DriverLicenseSheet";
import CommunitiesSheet from "../components/profile/CommunitiesSheet";
import AdminPanel from "../components/admin/AdminPanel";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { TERMS_LAST_UPDATED, TERMS_SECTIONS, TERMS_TITLE } from "../data/terms";
import AuthPage from "./AuthPage";
import {
  flattenSchedule,
  getDayLabel,
  normalizeUserSchedule,
  sortEntriesByUpcoming,
} from "../utils/userSchedule";

interface ProfilePageProps {
  onLogout?: () => void;
  vehicleSheetTrigger?: number;
  onVehicleSheetTriggerConsumed?: () => void;
  onSheetStateChange?: (isOpen: boolean) => void;
}

type PasswordFeedback = {
  message: string;
  tone: "success" | "error";
};

export default function ProfilePage({ onLogout, vehicleSheetTrigger, onVehicleSheetTriggerConsumed, onSheetStateChange }: ProfilePageProps) {
  const { user, updateProfile, upsertVehicle, removeVehicle, setActiveVehicle } = useAuth();
  const { language, setLanguage, getLanguageLabel } = useLanguage();
  const { showSuccess, showError } = useNotifications();
  
  // Dados do utilizador - sempre com valores definidos
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<UserSchedule>({ days: [] });
  const [showCalendarPreview, setShowCalendarPreview] = useState(false);

  const [openEdit, setOpenEdit] = useState(false);
  const [openSchedule, setOpenSchedule] = useState(false);
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
  const [openLogoutConfirm, setOpenLogoutConfirm] = useState(false);
  const [openWallet, setOpenWallet] = useState(false);
  const [openReferral, setOpenReferral] = useState(false);
  const [openPassword, setOpenPassword] = useState(false);
  const [openSupport, setOpenSupport] = useState(false);
  const [openTerms, setOpenTerms] = useState(false);
  const [openRatings, setOpenRatings] = useState(false);
  const [openHistory, setOpenHistory] = useState(false);
  const [openVehicleSheet, setOpenVehicleSheet] = useState(false);
  const [openVehicleList, setOpenVehicleList] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  const [verificationSheetOpen, setVerificationSheetOpen] = useState(false);
  const [verificationChannel, setVerificationChannel] = useState<"email" | "phone" | null>(null);
  const [openIdentitySheet, setOpenIdentitySheet] = useState(false);
  const [openDriverLicenseSheet, setOpenDriverLicenseSheet] = useState(false);
  const [openCommunities, setOpenCommunities] = useState(false);
  const [openAdminPanel, setOpenAdminPanel] = useState(false);
  const [profileSection, setProfileSection] = useState<"overview" | "driver" | "account">("overview");
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPasswordValue, setNewPasswordValue] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<PasswordFeedback | null>(null);
  const [openLanguageSheet, setOpenLanguageSheet] = useState(false);
  const [pendingLanguage, setPendingLanguage] = useState<LanguageCode>(language);
  const inputFileRef = useRef<HTMLInputElement | null>(null);
  const copyTimeoutRef = useRef<number | undefined>(undefined);
  const externalVehicleTriggerRef = useRef<number>(0);

  const scheduleEntries = useMemo(() => flattenSchedule(schedule, true), [schedule]);
  const hasSchedule = scheduleEntries.length > 0;
  const upcomingEntries = useMemo(() => sortEntriesByUpcoming(scheduleEntries), [scheduleEntries]);
  const primaryRide = upcomingEntries[0];
  const vehicles = useMemo(() => user?.vehicles ?? [], [user?.vehicles]);
  const activeVehicleId = user?.activeVehicleId ?? null;
  const verification = user?.verification ?? { email: false, phone: false };
  const editingVehicle = useMemo(
    () => vehicles.find(vehicle => vehicle.id === editingVehicleId) ?? null,
    [vehicles, editingVehicleId]
  );

  const activeVehicle = useMemo(
    () => vehicles.find(vehicle => vehicle.id === activeVehicleId) ?? null,
    [vehicles, activeVehicleId]
  );

  const { isSupported: pushSupported, subscribed: pushSubscribed, subscribe: subscribePush, unsubscribe: unsubscribePush } = usePushNotifications();

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
    const accountEmail = user?.email || "";
    const accountPhone = user?.phone || "";

    setEmail(accountEmail);
    setPhone(accountPhone);

    if (profile) {
      setName(profile.name || "");
      setUsername(profile.username || "");
      setContactEmail(profile.contactEmail || accountEmail);
      setAvatarUrl(profile.avatarUrl || null);
      setSchedule(normalizeUserSchedule(profile.schedule || { days: [] }));
      return;
    }

    setName("");
    setUsername("");
    setContactEmail(accountEmail);
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
    if (!openLanguageSheet) {
      setPendingLanguage(language);
    }
  }, [language, openLanguageSheet]);

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

  useEffect(() => {
    if (
      typeof vehicleSheetTrigger === "number" &&
      vehicleSheetTrigger > 0 &&
      vehicleSheetTrigger !== externalVehicleTriggerRef.current
    ) {
      externalVehicleTriggerRef.current = vehicleSheetTrigger;
      handleOpenVehicle(null);
      onVehicleSheetTriggerConsumed?.();
    }
  }, [vehicleSheetTrigger, onVehicleSheetTriggerConsumed]);

  // Rastrear quando qualquer sheet está aberto e notificar o App
  useEffect(() => {
    const isAnySheetOpen = 
      openEdit ||
      openSchedule ||
      openDeleteConfirm ||
      openLogoutConfirm ||
      openWallet ||
      openReferral ||
      openPassword ||
      openSupport ||
      openTerms ||
      openRatings ||
      openHistory ||
      openLanguageSheet ||
      openVehicleSheet ||
      openVehicleList ||
      verificationSheetOpen ||
      openIdentitySheet ||
      openDriverLicenseSheet ||
      openCommunities ||
      openAdminPanel;

    onSheetStateChange?.(isAnySheetOpen);
  }, [
    openEdit,
    openSchedule,
    openDeleteConfirm,
    openLogoutConfirm,
    openWallet,
    openReferral,
    openPassword,
    openSupport,
    openTerms,
    openRatings,
    openHistory,
    openLanguageSheet,
    openVehicleSheet,
    openVehicleList,
    verificationSheetOpen,
    openIdentitySheet,
    openDriverLicenseSheet,
    openCommunities,
    openAdminPanel,
    onSheetStateChange,
  ]);

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

  async function handleSaveProfile() {
    if (!user?.profile) return;
    try {
      await updateProfile({
        name: name.trim() || user.profile.name,
        username: username.trim() || undefined,
        phone: phone.trim() || user.phone,
        contactEmail: contactEmail.trim() || undefined,
        avatarUrl: avatarUrl || undefined,
      });
      setOpenEdit(false);
      showSuccess("Perfil atualizado", "As alterações foram guardadas com sucesso.");
    } catch (err) {
      console.error("Erro ao guardar perfil:", err);
      // O erro já é mostrado pelo updateProfile, mas podemos adicionar notificação aqui se necessário
    }
  }

  function handleOpenVehicleManager() {
    if (vehicles.length > 0) {
      setOpenVehicleList(true);
    } else {
      handleOpenVehicle(null);
    }
  }

  function handleOpenVehicle(vehicleId?: string | null) {
    setEditingVehicleId(vehicleId ?? null);
    setOpenVehicleSheet(true);
  }

  function handleCloseVehicle() {
    setOpenVehicleSheet(false);
    setEditingVehicleId(null);
  }

  async function handleVehicleSubmit(values: VehicleFormValues) {
    const isEditingExisting = Boolean(editingVehicle);
    try {
      const savedVehicle = await upsertVehicle({
        id: editingVehicle?.id,
        brand: values.brand.trim(),
        model: values.model.trim(),
        plate: values.plate.trim() || undefined,
        color: values.color.trim() || undefined,
        imageUrl: values.imageUrl || undefined,
        seats: editingVehicle?.seats,
        features: {
          airConditioning: values.airConditioning,
          heater: values.heater,
        },
        fuelType: values.fuelType || undefined,
        avgConsumption: values.avgConsumption,
      });

      if (!isEditingExisting && savedVehicle) {
        setActiveVehicle(savedVehicle.id);
      }

      showSuccess(
        editingVehicle ? "Veículo atualizado" : "Veículo guardado",
        "Dados prontos para estimar consumos.",
      );
      handleCloseVehicle();
    } catch (error) {
      console.error("Erro ao guardar veículo:", error);
      showError("Erro ao guardar veículo", error instanceof Error ? error.message : "Não foi possível guardar. Tenta novamente.");
    }
  }

  function openVerification(channel: "email" | "phone") {
    setVerificationChannel(channel);
    setVerificationSheetOpen(true);
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

  if (!user) {
    return <AuthPage onAuthSuccess={() => {}} />;
  }

  return (
    <div className="relative min-h-screen pb-32 bg-white text-gray-900 overflow-hidden">
      {/* Blur effects coloridos */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-10 w-[28rem] h-[28rem] bg-gray-300/5 blur-[180px]" />
        <div className="absolute top-32 right-0 w-[24rem] h-[24rem] bg-gray-300/5 blur-[160px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[32rem] h-[32rem] bg-gray-200/5 blur-[200px]" />
      </div>
      
      <div className="relative z-10">
      {/* ========== HEADER COMPACTO ========== */}
      <section className="mt-6 mb-4 mx-4">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-gray-900 text-white flex items-center justify-center text-xl font-bold flex-shrink-0 overflow-hidden ring-2 ring-gray-200" aria-hidden>
            {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <span>{initials(name)}</span>}
          </div>

          {/* Info + badges */}
          <div className="flex-1 min-w-0">
            {name && <h1 className="text-lg font-bold text-gray-900 truncate drop-shadow-sm">{name}</h1>}
            {visibleEmail && <p className="text-sm text-gray-700 truncate">{visibleEmail}</p>}
            
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {(verification.email || verification.phone) && (
                <span className="text-xs text-green-700 flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full bg-green-50 ring-1 ring-green-200">
                  ✓ Verificado
                </span>
              )}
              {user?.reliability?.score !== null && user?.reliability?.score !== undefined && (
                <span className={cn(
                  "text-xs font-semibold px-2 py-0.5 rounded-full ring-1",
                  user.reliability.score >= 95 ? "text-emerald-700 bg-emerald-50 ring-emerald-200" :
                  user.reliability.score >= 80 ? "text-blue-700 bg-blue-50 ring-blue-200" :
                  "text-amber-700 bg-amber-50 ring-amber-200"
                )}>
                  {user.reliability.score}% fiabilidade
                </span>
              )}
            </div>
          </div>
        </div>

      </section>

      {/* ========== NAVEGAÇÃO RÁPIDA ========== */}
      <div className="flex gap-1 overflow-x-auto scrollbar-none px-4 mb-4 pb-1">
        {([
          { key: "overview", label: "Geral" },
          { key: "driver", label: "Condutor" },
          { key: "account", label: "Conta" },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setProfileSection(key)}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-colors ${
              profileSection === key
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ========== BLOCO 1: O MEU HORÁRIO ========== */}
      {profileSection === "driver" && (
      <section className="bg-white border border-gray-200 px-4 py-4 mb-4 rounded-2xl mx-4 animate-fade-in-up">
        <div className="flex items-start justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
            O meu horário
          </h2>
          <button
            className="text-xs text-primary font-semibold hover:underline"
            onClick={() => setOpenSchedule(true)}
          >
            Gerir
          </button>
        </div>

        {!hasSchedule ? (
          <div className="text-center py-8 animate-fade-in">
            <p className="text-base font-semibold text-gray-900/95 mb-2">Ainda sem horário</p>
            <p className="text-sm text-gray-900/70 mb-4 max-w-[240px] mx-auto">
              Define os teus horários para sugestões automáticas de boleias
            </p>
            <Button variant="outline" size="sm" onClick={() => setOpenSchedule(true)}>
              Adicionar horário
            </Button>
          </div>
        ) : (
          <>
            {/* Próxima boleia - card simples */}
            {primaryRide && (
              <div className="rounded-2xl bg-gray-900 text-white px-4 py-3 mb-3 shadow-sm animate-fade-in">
                <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Próxima boleia</p>
                <p className="text-base font-bold mt-0.5">{primaryRide.block.title ?? "Boleia"}</p>
                <p className="text-sm text-gray-300 mt-0.5">
                  {getDayLabel(primaryRide.day)} · {primaryRide.block.start}–{primaryRide.block.end}
                </p>
              </div>
            )}
            
            <Button 
              variant="outline" 
              block 
              size="sm"
              onClick={() => setShowCalendarPreview(prev => !prev)}
            >
              {showCalendarPreview ? "Esconder calendário" : "Ver calendário semanal"}
            </Button>

            {showCalendarPreview && (
              <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-2">
                <WeekCalendar schedule={schedule} onBlockClick={() => setOpenSchedule(true)} compact />
              </div>
            )}
          </>
        )}
      </section>
      )}

      {/* ========== VERIFICAÇÃO ========== */}
      {profileSection === "overview" && (
      {(() => {
        const dlStatus = user?.verification?.driverLicense ?? "NONE";
        const idStatus = user?.verification?.identity ?? "NONE";
        const emailDone = !!verification.email;
        const dlDone = dlStatus === "APPROVED";
        const idDone = idStatus === "VERIFIED";
        const verifiedCount = (emailDone ? 1 : 0) + (dlDone ? 1 : 0) + (idDone ? 1 : 0);
        const totalCount = 3;

        function VerifRow({
          icon, label, description, descColor, onClick, badge, disabled,
        }: {
          icon: string; label: string; description: string; descColor: string;
          onClick?: () => void; badge?: string; disabled?: boolean;
        }) {
          const inner = (
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0",
                icon === "✓" ? "bg-emerald-100 text-emerald-700" :
                icon === "…" ? "bg-amber-100 text-amber-700" :
                icon === "✗" ? "bg-red-100 text-red-700" :
                "bg-gray-100 text-gray-400"
              )}>
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">{label}</p>
                  {badge && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">{badge}</span>
                  )}
                </div>
                <p className={cn("text-xs mt-0.5", descColor)}>{description}</p>
              </div>
              {onClick && !disabled && (
                <svg className="text-gray-300 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" />
                </svg>
              )}
            </div>
          );
          if (onClick && !disabled) {
            return (
              <button
                type="button"
                className="w-full text-left rounded-xl border border-gray-100 bg-gray-50 px-3 py-3 hover:bg-gray-100 transition"
                onClick={onClick}
              >
                {inner}
              </button>
            );
          }
          return (
            <div className="w-full rounded-xl border border-gray-100 bg-gray-50 px-3 py-3">
              {inner}
            </div>
          );
        }

        return (
          <section className="bg-white border border-gray-200 px-4 py-4 mb-4 rounded-2xl mx-4 animate-fade-in-up">
            {/* Cabeçalho com progresso */}
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Verificação</h2>
              <span className={cn(
                "text-xs font-semibold",
                verifiedCount === totalCount ? "text-emerald-600" : "text-gray-400"
              )}>
                {verifiedCount}/{totalCount}
              </span>
            </div>

            {/* Barra de progresso */}
            <div className="h-1.5 bg-gray-100 rounded-full mb-4 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  verifiedCount === totalCount ? "bg-emerald-500" : "bg-gray-800"
                )}
                style={{ width: `${(verifiedCount / totalCount) * 100}%` }}
              />
            </div>

            <div className="space-y-2">

              {/* Email */}
              <VerifRow
                icon={emailDone ? "✓" : "!"}
                label="Email"
                description={emailDone ? "Verificado - podes reservar boleias" : "Necessário para reservar e publicar boleias"}
                descColor={emailDone ? "text-emerald-600" : "text-amber-600"}
                onClick={!emailDone ? () => openVerification("email") : undefined}
              />

              {/* Telemóvel */}
              <VerifRow
                icon={verification.phone ? "✓" : "–"}
                label="Telemóvel"
                description={verification.phone ? "Verificado - contacto direto ativo" : "Para contacto direto em boleias confirmadas"}
                descColor={verification.phone ? "text-emerald-600" : "text-gray-400"}
                badge={!verification.phone ? "Em breve" : undefined}
                disabled
              />

              {/* Carta de condução */}
              <VerifRow
                icon={dlDone ? "✓" : dlStatus === "PENDING" ? "…" : dlStatus === "REJECTED" ? "✗" : "!"}
                label="Carta de condução"
                description={
                  dlDone ? "Aprovada - podes oferecer boleias" :
                  dlStatus === "PENDING" ? "Em análise pela equipa HopOn" :
                  dlStatus === "REJECTED" ? "Rejeitada - clica para enviares novamente" :
                  "Obrigatória para publicares boleias como condutor"
                }
                descColor={
                  dlDone ? "text-emerald-600" :
                  dlStatus === "PENDING" ? "text-amber-600" :
                  dlStatus === "REJECTED" ? "text-red-600" :
                  "text-gray-500"
                }
                onClick={() => setOpenDriverLicenseSheet(true)}
              />

              {/* Identidade */}
              <VerifRow
                icon={idDone ? "✓" : idStatus === "PENDING" ? "…" : idStatus === "REJECTED" ? "✗" : "–"}
                label="Cartão de Cidadão / Passaporte"
                description={
                  idDone ? "Identidade confirmada - badge de confiança ativo" :
                  idStatus === "PENDING" ? "Em análise pela equipa HopOn" :
                  idStatus === "REJECTED" ? "Rejeitado - clica para enviares novamente" :
                  "Opcional - aumenta a confiança de condutores e passageiros"
                }
                descColor={
                  idDone ? "text-emerald-600" :
                  idStatus === "PENDING" ? "text-amber-600" :
                  idStatus === "REJECTED" ? "text-red-600" :
                  "text-gray-400"
                }
                onClick={() => setOpenIdentitySheet(true)}
              />

            </div>

            {verifiedCount === totalCount && (
              <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-700 font-semibold text-center">
                Perfil totalmente verificado
              </div>
            )}
          </section>
        );
      })()}

      {/* ========== COMUNIDADES ========== */}
      <section className="bg-white border border-gray-200 px-4 py-4 mb-4 rounded-2xl mx-4 animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Comunidades</h2>
            <p className="text-xs text-gray-500 mt-0.5">Empresa, faculdade ou grupo de confiança</p>
          </div>
          <button
            type="button"
            className="text-xs font-semibold text-gray-900"
            onClick={() => setOpenCommunities(true)}
          >
            Ver
          </button>
        </div>
      </section>
      )}

      {/* ========== BLOCO 2: CARRO EM USO ========== */}
      {profileSection === "driver" && (
      <section className="bg-white border border-gray-200 px-4 py-4 mb-4 rounded-2xl mx-4 animate-fade-in-up">
        <div className="flex items-start justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
            Carro em uso
          </h2>
        </div>

        {!activeVehicle ? (
          <div className="text-center py-8 animate-fade-in">
            <p className="text-base font-semibold text-gray-900/95 mb-2">Ainda sem veículo</p>
            <p className="text-sm text-gray-900/70 mb-4 max-w-[240px] mx-auto">
              Adiciona marca e modelo para cálculo automático de custos
            </p>
            <Button variant="outline" size="sm" onClick={() => handleOpenVehicle(null)}>
              Adicionar veículo
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1">
                <p className="text-base font-semibold text-gray-900">
                  {activeVehicle.brand} {activeVehicle.model}
                </p>
                {activeVehicle.plate && (
                  <p className="text-sm text-gray-900/70 mt-0.5">{activeVehicle.plate}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  {activeVehicle.color && (
                    <span className="text-xs rounded-full border border-gray-200 px-2 py-0.5 text-gray-700">
                      {activeVehicle.color}
                    </span>
                  )}
                  {activeVehicle.features.airConditioning && (
                    <span className="text-xs rounded-full border border-gray-200 px-2 py-0.5 text-gray-700">
                      A/C
                    </span>
                  )}
                  {activeVehicle.features.heater && (
                    <span className="text-xs rounded-full border border-gray-200 px-2 py-0.5 text-gray-700">
                      Aquecimento
                    </span>
                  )}
                </div>
              </div>
              {activeVehicle.imageUrl && (
                <img 
                  src={activeVehicle.imageUrl} 
                  alt="" 
                  className="w-20 h-20 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                />
              )}
            </div>
            
            <Button 
              variant="outline" 
              block 
              size="sm"
              onClick={handleOpenVehicleManager}
            >
              Gerir veículos ({vehicles.length})
            </Button>
          </>
        )}
      </section>
      )}

      {/* ========== CONVIDAR AMIGOS (destacado) ========== */}
      {profileSection === "overview" && (
      <section 
        className="bg-gray-100 border border-gray-200 px-4 py-4 mb-4 rounded-2xl mx-4 cursor-pointer hover:bg-gray-200/80 hover:border-gray-300 transition-all duration-200 active:scale-[0.99] animate-fade-in-up"
        onClick={() => setOpenReferral(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpenReferral(true);
          }
        }}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900 mb-1">Convidar amigos</h3>
            <p className="text-sm text-gray-700">Partilha o teu código e recebe descontos</p>
          </div>
          <svg className="text-gray-900/70 shrink-0 mt-1" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>
      </section>

      {/* ========== AJUDA (Geral) ========== */}
      <nav className="bg-white border border-gray-200 rounded-2xl mx-4 mb-4 overflow-hidden animate-fade-in-up" aria-label="Ajuda Geral">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-xs font-bold text-gray-900/70 uppercase tracking-wide">Histórico & Avaliações</h3>
        </div>
        <ListRow label="Histórico de boleias" onClick={() => setOpenHistory(true)} />
        <ListRow label="Avaliações" onClick={() => setOpenRatings(true)} />
      </nav>
      )}

      {/* ========== DEFINIÇÕES & AJUDA (lista simples) ========== */}
      {profileSection === "account" && (
      <nav className="bg-white border border-gray-200 rounded-2xl mx-4 mb-4 overflow-hidden animate-fade-in-up" aria-label="Conta e pagamentos">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-xs font-bold text-gray-900/70 uppercase tracking-wide">Conta & Pagamentos</h3>
        </div>
        <ListRow label="Editar perfil" onClick={() => setOpenEdit(true)} />
        <ListRow label="Editar palavra-passe" onClick={() => setOpenPassword(true)} />
        <ListRow label="Pagamentos" caption="MB Way e cartão" onClick={() => setOpenWallet(true)} />
        <ListRow
          label="Idioma da app"
          caption={getLanguageLabel(language)}
          onClick={() => {
            setPendingLanguage(language);
            setOpenLanguageSheet(true);
          }}
        />
        {pushSupported && (
          <ListRow
            label="Notificações push"
            caption={pushSubscribed ? "Ativas" : "Desativadas"}
            onClick={() => pushSubscribed ? unsubscribePush() : subscribePush()}
          />
        )}
      </nav>

      <nav className="bg-white border border-gray-200 rounded-2xl mx-4 mb-4 overflow-hidden animate-fade-in-up" aria-label="Ajuda">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-xs font-bold text-gray-900/70 uppercase tracking-wide">Ajuda</h3>
        </div>
        <ListRow label="Contacta-nos" onClick={() => setOpenSupport(true)} />
        <ListRow
          label="Termos e Condições"
          onClick={() => setOpenTerms(true)}
          ariaHasPopup="dialog"
          ariaControls="profile-terms-sheet"
        />
      </nav>

      {/* ========== ADMIN (apenas visível para admins) ========== */}
      {user?.isAdmin && (
        <nav className="bg-white border border-gray-200 rounded-2xl mx-4 mb-4 overflow-hidden animate-fade-in-up" aria-label="Admin">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Administração</h3>
          </div>
          <ListRow label="Painel Admin" onClick={() => setOpenAdminPanel(true)} />
        </nav>
      )}

      {/* ========== ZONA DE RISCO ========== */}
      <div className="bg-white border border-gray-200 rounded-2xl mx-4 mb-4 overflow-hidden animate-fade-in-up" aria-label="Zona de risco">
        <ListRow label="Terminar sessão" tone="danger" onClick={() => setOpenLogoutConfirm(true)} />
        <ListRow label="Apagar conta" tone="danger" onClick={() => setOpenDeleteConfirm(true)} />
      </div>
      )}

      {/* Sheet: editar perfil */}
      <Sheet
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        title="Editar perfil"
        height="md"
        footer={
          <Button block variant="outline" className="min-h-[48px]" onClick={handleSaveProfile}>
            Guardar alterações
          </Button>
        }
      >
        <div className="grid gap-6">
          {/* Foto */}
          <div className="flex flex-col items-center gap-3 pb-6 border-b border-gray-200">
            <div className="w-28 h-28 rounded-full bg-gray-900 text-white flex items-center justify-center text-3xl font-bold overflow-hidden ring-4 ring-gray-100" aria-label="Foto de perfil">
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
              <Button variant="outline" onClick={handlePickPhoto}>
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
            <h3 className="text-xs font-bold text-gray-900/60 uppercase tracking-wide">
              Informação pessoal
            </h3>

            <Field label="Nome completo" htmlFor="pf-name" hint="O teu nome completo como aparece no perfil.">
              <input
                id="pf-name"
                className="w-full px-3 py-2.5 border border-gray-200 bg-gray-50 text-gray-900 rounded-xl outline-none placeholder:text-gray-900/40 focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: João Silva"
                title="Editar nome"
                autoComplete="name"
                required
              />
            </Field>

            <Field label="Username / apelido público" htmlFor="pf-username" hint="Opcional. Usa um @apelido curto para partilhar o perfil.">
              <input
                id="pf-username"
                className="w-full px-3 py-2.5 border border-gray-200 bg-gray-50 text-gray-900 rounded-xl outline-none placeholder:text-gray-900/40 focus:border-primary focus:ring-2 focus:ring-primary/20"
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
            <h3 className="text-xs font-bold text-gray-900/60 uppercase tracking-wide">
              Contactos
            </h3>

            <Field label="Telemóvel" htmlFor="pf-phone" hint="Opcional. Usado para notificações e verificação.">
              <input
                id="pf-phone"
                type="tel"
                className="w-full px-3 py-2.5 border border-gray-200 bg-gray-50 text-gray-900 rounded-xl outline-none placeholder:text-gray-900/40 focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Ex: +351912345678"
                title="Editar telemóvel"
                autoComplete="tel"
              />
            </Field>

            <Field label="Email preferencial" htmlFor="pf-contact-email" hint="Opcional para recibos, suporte e alertas.">
              <input
                id="pf-contact-email"
                type="email"
                className="w-full px-3 py-2.5 border border-gray-200 bg-gray-50 text-gray-900 rounded-xl outline-none placeholder:text-gray-900/40 focus:border-primary focus:ring-2 focus:ring-primary/20"
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
            variant="outline"
            className="min-h-[48px]"
            onClick={handleSavePassword}
            disabled={!canSavePassword}
          >
            Guardar palavra-passe
          </Button>
        }
      >
        <div className="space-y-6 py-1">
          <p className="text-sm text-gray-900/60">
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
              <p className={`text-xs ${passwordHasMinChars ? "text-emerald-400" : "text-gray-900/50"}`}>
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
                <p className="text-xs text-red-400">As palavras-passe não coincidem.</p>
              )}
            </div>
          </div>

          {passwordFeedback && (
            <p
              className={`text-sm ${
                passwordFeedback.tone === "success" ? "text-emerald-400" : "text-red-400"
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
            <Button variant="outline" className="flex-1" onClick={() => setOpenSchedule(false)}>
              Cancelar
            </Button>
            <Button variant="outline" className="flex-1" onClick={handleSaveSchedule}>
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
          <Button block variant="outline" className="min-h-[48px]" disabled>
            Partilhar convite (brevemente)
          </Button>
        }
      >
        <div className="space-y-6 py-2">
          <div className="text-center space-y-2">
            <p className="text-base font-semibold text-gray-900">Ganha descontos a cada convite</p>
            <p className="text-sm text-gray-900/60">
              Em breve, quando um amigo usar o teu código, ambos recebem uma percentagem de desconto na próxima viagem.
            </p>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4">
            <div className="text-xs font-semibold text-gray-900/60 uppercase tracking-wide mb-3">O teu código</div>
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-lg tracking-[0.35em] text-gray-900">{referralCode}</span>
              <button
                type="button"
                onClick={handleCopyReferralCode}
                className="p-3 rounded-2xl bg-gray-100 border border-gray-200 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary text-gray-900"
                aria-label="Copiar código de convite"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <rect x="7" y="7" width="12" height="12" rx="3" stroke="currentColor" strokeWidth="2" />
                  <path d="M5 15V7a2 2 0 0 1 2-2h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-gray-900/50 mt-3 min-h-[16px]" aria-live="polite">
              {copiedReferral ? "Código copiado! Cola em qualquer app de mensagens." : "Toca para copiar e partilha com colegas."}
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-900/60 uppercase tracking-wide">Como vai funcionar</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="h-8 w-8 rounded-2xl bg-primary/20 text-primary font-semibold flex items-center justify-center">1</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Partilha o teu código</p>
                  <p className="text-xs text-gray-900/60">Copia e envia pelo WhatsApp, Instagram ou onde preferires.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="h-8 w-8 rounded-2xl bg-primary/20 text-primary font-semibold flex items-center justify-center">2</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">O amigo usa o convite</p>
                  <p className="text-xs text-gray-900/60">Assim que ele confirmar a conta, o desconto fica reservado.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="h-8 w-8 rounded-2xl bg-primary/20 text-primary font-semibold flex items-center justify-center">3</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Desconto aplicado</p>
                  <p className="text-xs text-gray-900/60">Ambos recebem uma percentagem de desconto na próxima boleia.</p>
                </div>
              </li>
            </ul>
          </div>

          <p className="text-xs text-gray-400 text-center">
            Funcionalidade visual por agora. As recompensas reais chegam em breve. ✌️
          </p>
        </div>
      </Sheet>

      {/* Sheet: confirmação de terminar sessão */}
      <Sheet
        open={openLogoutConfirm}
        onClose={() => setOpenLogoutConfirm(false)}
        title="Terminar sessão"
        height="md"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setOpenLogoutConfirm(false)}>
              Cancelar
            </Button>
            <Button variant="danger" className="flex-1" onClick={handleLogout}>
              Terminar sessão
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 text-center">
          <h3 className="text-lg font-bold text-gray-900">Tens a certeza?</h3>
          <p className="text-sm text-gray-900/70">
            Vais terminar a tua sessão. Podes sempre voltar e fazer login novamente.
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
            <Button variant="outline" className="flex-1" onClick={() => setOpenDeleteConfirm(false)}>
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
          <p className="text-sm text-gray-900/70">
            Esta ação não pode ser desfeita. Todos os teus dados, boleias e histórico serão permanentemente removidos.
          </p>
          <div className="text-left bg-red-500/20 rounded-xl p-4 border border-red-500/30">
            <p className="text-sm font-semibold text-red-700 mb-2"><strong>Será apagado:</strong></p>
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
              <p className="leading-relaxed text-gray-900/70">{section.content}</p>
            </section>
          ))}
          <p className="text-xs text-gray-900/50">
            Estes Termos e Condições são preliminares e serão validados juridicamente antes do lançamento público.
            Última atualização: {TERMS_LAST_UPDATED}.
          </p>
        </div>
      </Sheet>

      {/* Sheet: lista de veículos */}
      <Sheet
        open={openVehicleList}
        onClose={() => setOpenVehicleList(false)}
        title="Gerir veículos"
        height="lg"
        footer={
          <Button 
            block 
            variant="outline"
            className="min-h-[48px]"
            onClick={() => {
              setOpenVehicleList(false);
              handleOpenVehicle(null);
            }}
          >
            + Adicionar veículo
          </Button>
        }
      >
        <div className="space-y-3">
          {vehicles.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm font-semibold text-gray-900 mb-1">Ainda sem veículos</p>
              <p className="text-xs text-gray-900/50">Adiciona marca e modelo para desbloquear custos automáticos.</p>
            </div>
          ) : (
            vehicles.map(vehicle => (
              <div 
                key={vehicle.id}
                className="rounded-2xl border border-gray-200 bg-gray-50 backdrop-blur-sm p-4"
              >
                {vehicle.imageUrl && (
                  <div className="mb-3 overflow-hidden rounded-xl border border-gray-200">
                    <img src={vehicle.imageUrl} alt={vehicle.brand} className="h-32 w-full object-cover" />
                  </div>
                )}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{vehicle.brand}</p>
                    <p className="text-xs text-gray-900/70">{vehicle.model}</p>
                    {vehicle.id === activeVehicleId && (
                      <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-emerald-500/50 bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        ✓ Em uso
                      </span>
                    )}
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      setOpenVehicleList(false);
                      handleOpenVehicle(vehicle.id);
                    }}
                  >
                    Editar
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] text-gray-900/70">
                  {vehicle.plate && (
                    <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-1 uppercase tracking-wide">{vehicle.plate}</span>
                  )}
                  {vehicle.color && (
                    <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-1">{vehicle.color}</span>
                  )}
                  <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-1">
                    {vehicle.features.airConditioning ? "Ar condicionado" : "Sem A/C"}
                  </span>
                  <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-1">
                    {vehicle.features.heater ? "Aquecimento" : "Sem aquecimento"}
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  {vehicle.id !== activeVehicleId && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setActiveVehicle(vehicle.id);
                        showSuccess("Veículo ativado", `${vehicle.brand} ${vehicle.model} está agora em uso.`);
                      }}
                    >
                      Usar este carro
                    </Button>
                  )}
                  <button
                    type="button"
                    className={cn(
                      "h-9 px-3 text-sm font-medium rounded-xl transition border",
                      vehicle.id === activeVehicleId ? "w-full" : "flex-1",
                      "bg-gray-50 text-gray-900/70 border-gray-200 hover:bg-gray-100 hover:text-gray-900/90 hover:border-gray-200"
                    )}
                    onClick={() => setVehicleToDelete(vehicle)}
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </Sheet>

      {/* Sheet: confirmação de remover veículo */}
      <Sheet
        open={vehicleToDelete !== null}
        onClose={() => setVehicleToDelete(null)}
        title="Remover veículo"
        height="md"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setVehicleToDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={async () => {
                if (!vehicleToDelete) return;
                try {
                  await removeVehicle(vehicleToDelete.id);
                  showSuccess(
                    "Veículo removido",
                    `${vehicleToDelete.brand} ${vehicleToDelete.model} foi removido.`,
                  );
                  setVehicleToDelete(null);
                  if (vehicles.length === 1) {
                    setOpenVehicleList(false);
                  }
                } catch (error) {
                  console.error("Erro ao remover veículo:", error);
                  showError("Erro ao remover veículo", error instanceof Error ? error.message : "Não foi possível remover. Tenta novamente.");
                }
              }}
            >
              Remover
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 text-center">
          <h3 className="text-lg font-bold text-gray-900">Tens a certeza?</h3>
          <p className="text-sm text-gray-900/70">
            {vehicleToDelete && vehicleToDelete.id === activeVehicleId && (
              <>Este veículo está em uso. Ao removê-lo, {vehicles.length > 1 ? "outro veículo será ativado automaticamente" : "não terás nenhum veículo ativo"}.</>
            )}
            {vehicleToDelete && vehicleToDelete.id !== activeVehicleId && (
              <>Vais remover <strong>{vehicleToDelete.brand} {vehicleToDelete.model}</strong> da tua lista de veículos.</>
            )}
          </p>
          {vehicleToDelete && (
            <div className="text-left bg-red-500/20 rounded-xl p-4 border border-red-500/30">
              <p className="text-sm font-semibold text-red-700 mb-2">Esta ação não pode ser desfeita.</p>
            </div>
          )}
        </div>
      </Sheet>

      <VehicleFormSheet
        open={openVehicleSheet}
        mode={editingVehicle ? "edit" : "create"}
        initialValues={
          editingVehicle
            ? {
                brand: editingVehicle.brand,
                model: editingVehicle.model,
                plate: editingVehicle.plate ?? "",
                color: editingVehicle.color ?? "",
                imageUrl: editingVehicle.imageUrl ?? "",
                airConditioning: editingVehicle.features.airConditioning,
                heater: editingVehicle.features.heater,
                fuelType: (editingVehicle as any).fuelType ?? "",
                avgConsumption: (editingVehicle as any).avgConsumption ?? undefined,
              }
            : undefined
        }
        onClose={handleCloseVehicle}
        onSubmit={handleVehicleSubmit}
      />

      <VerificationSheet
        open={verificationSheetOpen}
        channel={verificationChannel}
        value={verificationChannel === "email" ? (user?.email || visibleEmail) : phone}
        onClose={() => {
          setVerificationSheetOpen(false);
          setVerificationChannel(null);
        }}
        onVerified={() => {
          if (!verificationChannel) return;
          // O verifyOtp já atualizou o user com a resposta da API (email + verification); não sobrescrever
          showSuccess(
            "Verificação concluída",
            `Confirmámos o teu ${verificationChannel === "email" ? "email" : "telemóvel"}.`
          );
        }}
      />

      <LanguageSettingsSheet
        open={openLanguageSheet}
        current={language}
        selected={pendingLanguage}
        onSelect={setPendingLanguage}
        onClose={() => {
          setPendingLanguage(language);
          setOpenLanguageSheet(false);
        }}
        onSave={() => {
          if (pendingLanguage !== language) {
            setLanguage(pendingLanguage);
            const newLabel = getLanguageLabel(pendingLanguage);
            showSuccess("Idioma alterado", `A interface está agora em ${newLabel}`);
          }
          setOpenLanguageSheet(false);
        }}
      />

      <WalletSheet open={openWallet} onClose={() => setOpenWallet(false)} />
      <SupportContactSheet open={openSupport} onClose={() => setOpenSupport(false)} />
      <RatingsSheet open={openRatings} onClose={() => setOpenRatings(false)} />
      <HistorySheet open={openHistory} onClose={() => setOpenHistory(false)} />
      <IdentityVerificationSheet
        open={openIdentitySheet}
        onClose={() => setOpenIdentitySheet(false)}
        currentStatus={user?.identityDocumentStatus}
      />
      <DriverLicenseSheet
        open={openDriverLicenseSheet}
        onClose={() => setOpenDriverLicenseSheet(false)}
        currentStatus={user?.verification?.driverLicense}
        adminNote={user?.driverLicenseAdminNote}
        onUploaded={() => { /* o AuthContext fará refresh do user */ }}
      />
      <CommunitiesSheet open={openCommunities} onClose={() => setOpenCommunities(false)} />
      <AdminPanel open={openAdminPanel} onClose={() => setOpenAdminPanel(false)} />
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
          className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900 placeholder:text-gray-900/40 focus:border-primary focus:ring-2 focus:ring-primary/20"
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
          className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-900/60 hover:text-gray-900 focus:outline-none"
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
      {hint && <div className="text-xs text-gray-900/50 mt-1">{hint}</div>}
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
      className={`w-full flex items-center justify-between px-4 py-3.5 border-b border-gray-200 last:border-b-0 hover:bg-gray-100 transition ${tone === "danger" ? "text-red-700" : "text-gray-900"}`} 
      onClick={onClick}
      aria-haspopup={ariaHasPopup}
      aria-controls={ariaControls}
    >
      <div className="flex items-center gap-3 text-left">
        {icon && <span className="text-xl" aria-hidden>{icon}</span>}
        <div>
          <div className="text-sm font-medium">{label}</div>
          {caption && <div className="text-xs text-gray-900/60 mt-0.5">{caption}</div>}
        </div>
      </div>
      <svg className={tone === "danger" ? "text-red-700" : "text-gray-900/50"} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" />
      </svg>
    </button>
  );
}

function initials(n: string) {
  const parts = n.trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase() ?? "").join("");
}
