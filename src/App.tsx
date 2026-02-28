import { useState, useEffect } from "react";
import { useAuth } from "./contexts/AuthContext";
import { useSSE } from "./contexts/SSEContext";
import { useNotifications } from "./contexts/NotificationContext";
import { useInbox } from "./contexts/InboxContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { InboxProvider } from "./contexts/InboxContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { SSEProvider } from "./contexts/SSEContext";
import { apiRequest } from "./services/api";
import BottomNav from "./components/ui/BottomNav";
import AuthPage from "./pages/AuthPage";
import OnboardingPage, { hasCompletedOnboarding } from "./pages/OnboardingPage";
import ProfileSetupPage from "./pages/ProfileSetupPage";
import DiscoverPage from "./pages/DiscoverPage";
import RidesPage from "./pages/RidesPage";
import InboxPage from "./pages/InboxPage";
import ProfilePage from "./pages/ProfilePage";
import Sheet from "./components/ui/Sheet";
import { Button } from "./components/ui/Button";
import { Loading } from "./components/ui/Skeleton";
import OfferRideForm, { type OfferRideFormValues } from "./components/ui/OfferRideForm";
import AppName from "./components/ui/AppName";

export type Tab = "discover" | "rides" | "inbox" | "profile";

function AppContent() {
  const { user, isLoading, hasCompletedProfile, logout } = useAuth();
  const { subscribe } = useSSE();
  const { showSuccess, showError } = useNotifications();
  const { refresh: refreshInbox } = useInbox();
  const [tab, setTab] = useState<Tab>("discover");

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
  const [profileSheetsOpen, setProfileSheetsOpen] = useState(false);
  const [offerSubmitting, setOfferSubmitting] = useState(false);

  const showGlobalHeader = tab === "rides" || tab === "inbox";
  const hideBottomNav = openOffer || openComposer || profileSheetsOpen;

  const handleRequireVehicleSetup = () => {
    setOpenOffer(false);
    setOpenComposer(false);
    setTab("profile");
    setVehicleSheetTrigger((prev) => prev + 1);
  };

  async function handleSubmitOffer(vals: OfferRideFormValues) {
    setOfferSubmitting(true);
    try {
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
        }),
      });
      showSuccess("Boleia criada!", `${vals.origem} → ${vals.destino}`);
      setOpenOffer(false);
      setTab("rides");
    } catch (err) {
      showError("Erro ao criar boleia", err instanceof Error ? err.message : "Tenta novamente.");
    } finally {
      setOfferSubmitting(false);
    }
  }

  if (isLoading) return <Loading message="A inicializar..." />;
  if (!hasSeenOnboarding) return <OnboardingPage onComplete={() => setHasSeenOnboarding(true)} />;
  if (!user) return <AuthPage onAuthSuccess={() => {}} />;
  if (!hasCompletedProfile) return <ProfileSetupPage />;

  return (
    <div className="min-h-[100svh] overflow-x-hidden bg-white">
      {showGlobalHeader && (
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 backdrop-blur-sm">
          <div className="w-full max-w-mobile md:max-w-tablet lg:max-w-desktop mx-auto px-4 h-14 flex items-center justify-between">
            <h1 className="text-base font-bold text-gray-900"><AppName /></h1>
            <button
              className="flex items-center gap-2 hover:opacity-70 transition"
              onClick={() => setTab("profile")}
              aria-label="Ir para perfil"
            >
              <div className="text-right hidden sm:block">
                <div className="text-xs font-semibold text-gray-900">{user?.profile?.name || "Perfil"}</div>
                <div className="text-[10px] text-gray-500">Ver perfil</div>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gradient-start via-gradient-mid to-gradient-end text-gray-900 flex items-center justify-center text-sm font-bold shadow-sm ring-2 ring-gray-200">
                {user?.profile?.name?.charAt(0).toUpperCase() || "U"}
              </div>
            </button>
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
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <NotificationProvider>
        <SSEProvider>
          <InboxProvider>
            <AppContent />
          </InboxProvider>
        </SSEProvider>
      </NotificationProvider>
    </LanguageProvider>
  );
}
