import { useState, useEffect } from "react";
import { useAuth } from "./contexts/AuthContext";
import { useSSE } from "./contexts/SSEContext";
import { useNotifications } from "./contexts/NotificationContext";
import { useInbox } from "./contexts/InboxContext";
import { useAppNotifications } from "./contexts/AppNotificationsContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { InboxProvider } from "./contexts/InboxContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { SSEProvider } from "./contexts/SSEContext";
import { AppNotificationsProvider } from "./contexts/AppNotificationsContext";
import { apiRequest } from "./services/api";
import BottomNav from "./components/ui/BottomNav";
import AuthPage from "./pages/AuthPage";
import { hasCompletedOnboarding } from "./pages/OnboardingPage";
import OnboardingPageFull from "./pages/OnboardingPage";
import ProfileSetupPage from "./pages/ProfileSetupPage";
import WelcomeSheet from "./components/ui/WelcomeSheet";
import DiscoverPage from "./pages/DiscoverPage";
import RidesPage from "./pages/RidesPage";
import InboxPage from "./pages/InboxPage";
import ProfilePage from "./pages/ProfilePage";
import Sheet from "./components/ui/Sheet";
import { Button } from "./components/ui/Button";
import { Loading } from "./components/ui/Skeleton";
import OfferRideForm, { type OfferRideFormValues } from "./components/ui/OfferRideForm";
import AppName from "./components/ui/AppName";
import NotificationsSheet from "./components/ui/NotificationsSheet";
import PolicyAcceptanceSheet from "./components/ui/PolicyAcceptanceSheet";

export type Tab = "discover" | "rides" | "inbox" | "profile";

function AppContent() {
  const { user, isLoading, hasCompletedProfile, logout } = useAuth();
  const { subscribe } = useSSE();
  const { showSuccess, showError } = useNotifications();
  const { refresh: refreshInbox } = useInbox();
  const { unreadCount: notifUnread } = useAppNotifications();
  const [tab, setTab] = useState<Tab>("discover");
  const [notifOpen, setNotifOpen] = useState(false);

  // Notificar o driver quando chega uma nova reserva
  useEffect(() => {
    return subscribe("booking.new", (data) => {
      const passengerName = (data.passengerName as string) ?? "Passageiro";
      const origin = (data.origin as string) ?? "";
      const destination = (data.destination as string) ?? "";
      showSuccess("Nova reserva!", `${passengerName} reservou um lugar em ${origin} → ${destination}`);
    });
  }, [subscribe, showSuccess]);

  // Atualizar inbox quando chega uma nova reserva (conversa criada automaticamente)
  useEffect(() => {
    return subscribe("booking.new", () => { refreshInbox().catch(console.error); });
  }, [subscribe, refreshInbox]);

  const [openComposer, setOpenComposer] = useState(false);
  const [openOffer, setOpenOffer] = useState(false);
  const [initialThreadId, setInitialThreadId] = useState<string | undefined>(undefined);
  const [vehicleSheetTrigger, setVehicleSheetTrigger] = useState(0);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(() => hasCompletedOnboarding());
  const [showWelcome, setShowWelcome] = useState(false);
  const [profileSheetsOpen, setProfileSheetsOpen] = useState(false);
  const [openDriverPolicy, setOpenDriverPolicy] = useState(false);
  const [pendingOfferValues, setPendingOfferValues] = useState<OfferRideFormValues | null>(null);

  useEffect(() => {
    if (user && hasCompletedProfile && !localStorage.getItem('hopon_welcome_shown')) {
      setShowWelcome(true);
      localStorage.setItem('hopon_welcome_shown', 'true');
    }
  }, [user, hasCompletedProfile]);

  const showGlobalHeader = tab === "rides" || tab === "inbox";
  const hideBottomNav = openOffer || openComposer || profileSheetsOpen;

  const handleRequireVehicleSetup = () => {
    setOpenOffer(false);
    setOpenComposer(false);
    setTab("profile");
    setVehicleSheetTrigger((prev) => prev + 1);
  };

  async function doSubmitOffer(vals: OfferRideFormValues) {
    const departureTime = new Date(`${vals.data}T${vals.hora}:00`).toISOString();
    await apiRequest("/rides", {
      method: "POST",
      body: JSON.stringify({
        vehicleId: vals.vehicleId,
        origin: vals.origem,
        destination: vals.destino,
        departureTime,
        availableSeats: vals.lugares,
        price: vals.price ?? null,
        originLat: vals.origemLat,
        originLng: vals.origemLng,
        destinationLat: vals.destinoLat,
        destinationLng: vals.destinoLng,
        routeDistanceKm: vals.routeDistanceKm,
        routeDurationMin: vals.routeDurationMin,
        routeTollCost: vals.routeTollCost,
        platformFee: vals.platformFee,
      }),
    });
    showSuccess("Boleia criada!", `${vals.origem} → ${vals.destino}`);
    setOpenOffer(false);
    setTab("rides");
  }

  async function handleSubmitOffer(vals: OfferRideFormValues) {
    if (!user?.verification?.email) {
      showError(
        "Email não confirmado",
        "Para publicar boleias precisas de confirmar o teu email. Vai ao teu Perfil → Verificações e segue as instruções."
      );
      return;
    }
    try {
      await doSubmitOffer(vals);
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      if (msg.includes("DRIVER_POLICY_NOT_ACCEPTED")) {
        setPendingOfferValues(vals);
        setOpenDriverPolicy(true);
        return;
      }
      if (msg.toLowerCase().includes("verific") && msg.toLowerCase().includes("email")) {
        showError("Email não confirmado", "Confirma o teu email no Perfil → Verificações antes de publicar boleias.");
        return;
      }
      showError("Erro ao criar boleia", err instanceof Error ? err.message : "Tenta novamente.");
    }
  }

  if (isLoading) return <Loading message="A inicializar..." />;
  if (!hasSeenOnboarding) return (
    <OnboardingPageFull
      onComplete={() => {
        setHasSeenOnboarding(true);
      }}
    />
  );
  if (!user) return <AuthPage onAuthSuccess={() => {}} />;
  if (!hasCompletedProfile) return <ProfileSetupPage />;

  return (
    <div className="min-h-[100svh] overflow-x-hidden bg-white">
      {showGlobalHeader && (
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 backdrop-blur-sm">
          <div className="w-full max-w-mobile md:max-w-tablet lg:max-w-desktop mx-auto px-4 h-14 flex items-center justify-between">
            <h1 className="text-base font-bold text-gray-900"><AppName /></h1>
            <div className="flex items-center gap-2">
              {/* Bell icon */}
              <button
                className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
                onClick={() => setNotifOpen(true)}
                aria-label="Notificações"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {notifUnread > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                    {notifUnread > 9 ? "9+" : notifUnread}
                  </span>
                )}
              </button>
              <button
                className="flex items-center gap-2 hover:opacity-70 transition"
                onClick={() => setTab("profile")}
                aria-label="Ir para perfil"
              >
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-gray-900">{user?.profile?.name || "Perfil"}</div>
                  <div className="text-[10px] text-gray-500">Ver perfil</div>
                </div>
                <div className="w-9 h-9 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-bold">
                  {user?.profile?.name?.charAt(0).toUpperCase() || "U"}
                </div>
              </button>
            </div>
          </div>
        </header>
      )}

      <main>
        {tab === "discover" && (
          <DiscoverPage
            onOpenInbox={(threadId) => {
              if (threadId) setInitialThreadId(threadId);
              setTab("inbox");
            }}
          />
        )}
        {tab === "rides" && <RidesPage />}
        {tab === "inbox" && (
          <InboxPage
            initialThreadId={initialThreadId}
            onThreadClosed={() => setInitialThreadId(undefined)}
          />
        )}
        {tab === "profile" && (
          <ProfilePage
            onLogout={logout}
            vehicleSheetTrigger={vehicleSheetTrigger}
            onVehicleSheetTriggerConsumed={() => setVehicleSheetTrigger(0)}
            onSheetStateChange={setProfileSheetsOpen}
          />
        )}
      </main>

      {!hideBottomNav && (
        <BottomNav current={tab} onChange={setTab} onPlus={() => setOpenComposer(true)} />
      )}

      {/* Composer do "+" */}
      <Sheet open={openComposer} onClose={() => setOpenComposer(false)} title="Criar" height="md" footer={null}>
        <div className="grid gap-3 p-1">
          <Button
            variant="outline"
            onClick={() => { setOpenComposer(false); setOpenOffer(true); }}
          >
            Oferecer boleia
          </Button>
          <Button
            variant="outline"
            onClick={() => { setOpenComposer(false); setTab("rides"); }}
          >
            Template de viagem (recorrente)
          </Button>
        </div>
      </Sheet>

      {/* Sheet do fluxo "Oferecer boleia" */}
      <Sheet open={openOffer} onClose={() => setOpenOffer(false)} title="Oferecer boleia" height="lg" footer={null}>
        <OfferRideForm
          onCancel={() => setOpenOffer(false)}
          onSubmit={handleSubmitOffer}
          onRequireVehicleSetup={handleRequireVehicleSetup}
        />
      </Sheet>

      {/* Painel de notificações */}
      <NotificationsSheet open={notifOpen} onClose={() => setNotifOpen(false)} />

      {/* Política de condutor — aparece quando o condutor tenta publicar sem aceitar */}
      <PolicyAcceptanceSheet
        open={openDriverPolicy}
        role="driver"
        onClose={() => { setOpenDriverPolicy(false); setPendingOfferValues(null); }}
        onAccepted={async () => {
          setOpenDriverPolicy(false);
          if (pendingOfferValues) {
            try {
              await doSubmitOffer(pendingOfferValues);
            } catch (err) {
              showError("Erro ao criar boleia", err instanceof Error ? err.message : "Tenta novamente.");
            } finally {
              setPendingOfferValues(null);
            }
          }
        }}
      />

      {/* Bem-vindo — mostrado uma vez após criar perfil */}
      <WelcomeSheet
        open={showWelcome}
        onClose={() => setShowWelcome(false)}
        onGoToProfile={() => { setShowWelcome(false); setTab('profile'); }}
        onGoToRides={() => { setShowWelcome(false); setTab('rides'); }}
      />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <NotificationProvider>
        <SSEProvider>
          <AppNotificationsProvider>
            <InboxProvider>
              <AppContent />
            </InboxProvider>
          </AppNotificationsProvider>
        </SSEProvider>
      </NotificationProvider>
    </LanguageProvider>
  );
}
