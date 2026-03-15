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
import { usePushNotifications } from "./hooks/usePushNotifications";
import { hasCompletedOnboarding } from "./pages/OnboardingPage";
import OnboardingPageFull from "./pages/OnboardingPage";
import AuthPage from "./pages/AuthPage";
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
import CommunitiesSheet from "./components/profile/CommunitiesSheet";
import RideRequestSheet from "./components/discover/RideRequestSheet";
import RideSharePreview from "./pages/RideSharePreview";
import SaveRouteSheet from "./components/discover/SaveRouteSheet";
import PublicProfilePage from "./pages/PublicProfilePage";

export type Tab = "discover" | "rides" | "inbox" | "profile";

function AppContent() {
  const { user, isLoading, hasCompletedProfile, logout } = useAuth();
  const { subscribe } = useSSE();
  const { isSupported: pushSupported, subscribed: pushSubscribed, subscribe: subscribePush } = usePushNotifications();
  const { showSuccess, showError } = useNotifications();
  const { refresh: refreshInbox } = useInbox();
  const { unreadCount: notifUnread } = useAppNotifications();
  // Handle ?tab= and ?rateBooking= params set by service worker notification click
  const searchParams = new URLSearchParams(window.location.search);
  const [tab, setTab] = useState<Tab>(() => {
    const param = searchParams.get("tab");
    window.history.replaceState(null, "", window.location.pathname);
    const valid: Tab[] = ["discover", "rides", "inbox", "profile"];
    return valid.includes(param as Tab) ? (param as Tab) : "discover";
  });
  const [initialRateBookingId] = useState<string | undefined>(
    () => searchParams.get("rateBooking") ?? undefined,
  );
  const [notifOpen, setNotifOpen] = useState(false);

  // Auto-subscribe push notifications após login (só se ainda não subscrito e permissão não negada)
  useEffect(() => {
    if (!user || !hasCompletedProfile) return;
    if (!pushSupported || pushSubscribed) return;
    if (typeof Notification !== "undefined" && Notification.permission === "denied") return;
    const t = setTimeout(() => { subscribePush(); }, 4000);
    return () => clearTimeout(t);
  }, [user, hasCompletedProfile, pushSupported, pushSubscribed, subscribePush]);

  // 16.2.3 — Partilhar localização GPS com o backend (para matching "agora")
  useEffect(() => {
    if (!user) return;
    function sendLocation() {
      navigator.geolocation?.getCurrentPosition((pos) => {
        apiRequest("/users/me/location", {
          method: "PATCH",
          body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        }).catch(() => {/* silencioso */});
      });
    }
    sendLocation();
    window.addEventListener("focus", sendLocation);
    return () => window.removeEventListener("focus", sendLocation);
  }, [user]);

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
  const [openRideRequest, setOpenRideRequest] = useState(false);
  const [initialThreadId, setInitialThreadId] = useState<string | undefined>(undefined);
  const [vehicleSheetTrigger, setVehicleSheetTrigger] = useState(0);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(() => hasCompletedOnboarding());
  const [showWelcome, setShowWelcome] = useState(false);
  const [profileSheetsOpen, setProfileSheetsOpen] = useState(false);
  const [openDriverPolicy, setOpenDriverPolicy] = useState(false);
  const [pendingOfferValues, setPendingOfferValues] = useState<OfferRideFormValues | null>(null);
  const [openRouteOnboarding, setOpenRouteOnboarding] = useState(false);

  // Deep link: /ref/:code — store code in localStorage to apply after login
  useEffect(() => {
    const match = window.location.pathname.match(/^\/ref\/([A-Z0-9]{6,10})$/i);
    if (match) {
      localStorage.setItem('hopon_pending_referral', match[1].toUpperCase());
      window.history.replaceState(null, "", "/");
    }
  }, []);

  // Auto-apply pending referral code after login
  useEffect(() => {
    if (!user) return;
    const code = localStorage.getItem('hopon_pending_referral');
    if (!code) return;
    localStorage.removeItem('hopon_pending_referral');
    apiRequest("/users/me/referral/apply", {
      method: "POST",
      body: JSON.stringify({ code }),
    }).catch(() => {});
  }, [user]);

  // Deep link: /join/:code
  const [joinCode, setJoinCode] = useState<string | undefined>(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/join\/([A-Z0-9]{6,10})$/i);
    return match ? match[1].toUpperCase() : undefined;
  });
  const [openJoinSheet, setOpenJoinSheet] = useState(() => {
    const path = window.location.pathname;
    return /^\/join\/[A-Z0-9]{6,10}$/i.test(path);
  });

  // Deep link: /ride/:id
  const [sharedRideId, setSharedRideId] = useState<string | undefined>(() => {
    const match = window.location.pathname.match(/^\/ride\/([a-z0-9-]+)$/i);
    return match ? match[1] : undefined;
  });
  const [openRidePreview, setOpenRidePreview] = useState(() => {
    return /^\/ride\/[a-z0-9-]+$/i.test(window.location.pathname);
  });

  // Deep link: /u/:id
  const [publicProfileId, setPublicProfileId] = useState<string | undefined>(() => {
    const match = window.location.pathname.match(/^\/u\/([a-z0-9-]+)$/i);
    return match ? match[1] : undefined;
  });
  const [openPublicProfile, setOpenPublicProfile] = useState(() => {
    return /^\/u\/[a-z0-9-]+$/i.test(window.location.pathname);
  });

  useEffect(() => {
    if (user && hasCompletedProfile && !localStorage.getItem('hopon_welcome_shown')) {
      setShowWelcome(true);
      localStorage.setItem('hopon_welcome_shown', 'true');
    }
  }, [user, hasCompletedProfile]);

  // Onboarding de rota habitual: mostrar se o utilizador não tem rotas guardadas
  useEffect(() => {
    if (!user || !hasCompletedProfile) return;
    if (localStorage.getItem('hopon_route_onboarding_shown')) return;
    // Delay para não conflituar com o welcome sheet
    const t = setTimeout(() => {
      apiRequest<unknown[]>("/user-routes")
        .then((routes) => {
          if (Array.isArray(routes) && routes.length === 0) {
            setOpenRouteOnboarding(true);
          }
        })
        .catch(() => {});
    }, 1200);
    return () => clearTimeout(t);
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
        instantBooking: vals.instantBooking,
        ...(vals.pontoEncontro && { meetingPoint: vals.pontoEncontro }),
        ...(vals.communityId && { communityId: vals.communityId }),
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
  if (!user) return <AuthPage />;
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
        {tab === "rides" && (
          <RidesPage
            onOpenGroupChat={(threadId) => {
              setInitialThreadId(threadId);
              setTab("inbox");
            }}
            initialRateBookingId={initialRateBookingId}
          />
        )}
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
        <BottomNav current={tab} onChange={setTab} onPlus={user ? () => setOpenComposer(true) : () => setTab("profile")} />
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
          <Button
            variant="outline"
            onClick={() => { setOpenComposer(false); setOpenRideRequest(true); }}
          >
            Pedir boleia (publicar necessidade)
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

      {/* Pedir boleia — publicar necessidade de passageiro */}
      <RideRequestSheet
        open={openRideRequest}
        onClose={() => setOpenRideRequest(false)}
        onSaved={() => setOpenRideRequest(false)}
      />

      {/* Deep link /join/:code — abre sheet de comunidade diretamente */}
      <CommunitiesSheet
        open={openJoinSheet}
        initialInviteCode={joinCode}
        onClose={() => {
          setOpenJoinSheet(false);
          setJoinCode(undefined);
          window.history.replaceState(null, "", "/");
        }}
      />

      {/* Onboarding de rota habitual — utilizadores sem rotas */}
      <SaveRouteSheet
        open={openRouteOnboarding}
        isOnboarding
        onClose={() => {
          setOpenRouteOnboarding(false);
          localStorage.setItem('hopon_route_onboarding_shown', 'true');
        }}
        onSaved={() => {
          setOpenRouteOnboarding(false);
          localStorage.setItem('hopon_route_onboarding_shown', 'true');
          setTab("discover");
        }}
        onSkip={() => {
          setOpenRouteOnboarding(false);
          localStorage.setItem('hopon_route_onboarding_shown', 'true');
        }}
      />

      {/* Deep link /ride/:id — preview público de boleia partilhada */}
      {openRidePreview && sharedRideId && (
        <RideSharePreview
          rideId={sharedRideId}
          onBook={() => {
            setOpenRidePreview(false);
            setSharedRideId(undefined);
            window.history.replaceState(null, "", "/");
            setTab("discover");
          }}
          onClose={() => {
            setOpenRidePreview(false);
            setSharedRideId(undefined);
            window.history.replaceState(null, "", "/");
          }}
        />
      )}

      {/* Deep link /u/:id — perfil público de utilizador */}
      {openPublicProfile && publicProfileId && (
        <PublicProfilePage
          userId={publicProfileId}
          onClose={() => {
            setOpenPublicProfile(false);
            setPublicProfileId(undefined);
            window.history.replaceState(null, "", "/");
          }}
        />
      )}
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
