import { useState } from "react";
import { useAuth } from "./contexts/AuthContext";
import { useRides } from "./contexts/RidesContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { InboxProvider } from "./contexts/InboxContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import RidesInboxConnector from "./contexts/RidesInboxConnector";
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
import RequestRideForm, { type RequestRideFormValues } from "./components/ui/RequestRideForm";
import AppName from "./components/ui/AppName";

export type Tab = "discover" | "rides" | "inbox" | "profile";

function AppContent() {
  const { user, isLoading, hasCompletedProfile, logout } = useAuth();
  const { createOffer, createRequest } = useRides();
  const [tab, setTab] = useState<Tab>("discover");
  const [openComposer, setOpenComposer] = useState(false);
  const [openOffer, setOpenOffer] = useState(false);
  const [openRequest, setOpenRequest] = useState(false);
  const [initialThreadId, setInitialThreadId] = useState<string | undefined>(undefined);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(() => hasCompletedOnboarding());
  // TopBar apenas em Rides e Inbox (para navegação rápida ao menu)
  const showGlobalHeader = tab === "rides" || tab === "inbox";

  // Loading state
  if (isLoading) {
    return <Loading message="A inicializar..." />;
  }

  // Onboarding (antes de tudo)
  if (!hasSeenOnboarding) {
    return <OnboardingPage onComplete={() => setHasSeenOnboarding(true)} />;
  }

  // Not authenticated
  if (!user) {
    return <AuthPage onAuthSuccess={() => {}} />;
  }

  // Authenticated but no profile setup
  if (!hasCompletedProfile) {
    return <ProfileSetupPage />;
  }

  // Authenticated and profile complete
  return (
          <div className="min-h-[100svh] overflow-x-hidden">
      {showGlobalHeader && (
        <header className="sticky top-0 z-30 bg-white shadow-sm">
          <div className="w-full max-w-mobile md:max-w-tablet lg:max-w-desktop mx-auto px-4 h-14 flex items-center justify-between">
            <h1 className="text-base font-bold text-gray-900">
              <AppName />
            </h1>
            
            <button 
              className="flex items-center gap-2 hover:opacity-70 transition"
              onClick={() => setTab("profile")}
              aria-label="Ir para perfil"
            >
              <div className="text-right hidden sm:block">
                <div className="text-xs font-semibold text-gray-900">
                  {user?.profile?.name || "Perfil"}
                </div>
                <div className="text-[10px] text-gray-500">Ver perfil</div>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/80 text-white flex items-center justify-center text-sm font-bold shadow-sm ring-2 ring-white">
                {user?.profile?.name?.charAt(0).toUpperCase() || "U"}
              </div>
            </button>
          </div>
        </header>
      )}

      <main>
        {tab === "discover" && <DiscoverPage onOpenInbox={(threadId) => {
          if (threadId) setInitialThreadId(threadId);
          setTab("inbox");
        }} />}
        {tab === "rides" && <RidesPage />}
        {tab === "inbox" && <InboxPage 
          initialThreadId={initialThreadId} 
          onThreadClosed={() => setInitialThreadId(undefined)}
        />}
        {tab === "profile" && <ProfilePage onLogout={logout} />}
      </main>

      <BottomNav
        current={tab}
        onChange={setTab}
        onPlus={() => setOpenComposer(true)}
      />

      {/* Composer do “+” */}
      <Sheet
        open={openComposer}
        onClose={() => setOpenComposer(false)}
        title="Criar"
        height="md"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={()=>setOpenComposer(false)}>Cancelar</Button>
            <Button className="flex-1" onClick={()=>setOpenComposer(false)}>Continuar</Button>
          </div>
        }
      >
        <div className="grid gap-3">
          <Button onClick={()=>{ setOpenComposer(false); setOpenOffer(true); }}>
            Oferecer boleia
          </Button>
          <Button variant="secondary" onClick={()=>{ setOpenComposer(false); setOpenRequest(true); }}>
            Pedir boleia
          </Button>
          {/* Opcional: */}
          {/* <Button variant="ghost">Guardar pesquisa</Button> */}
        </div>
      </Sheet>

      {/* Sheet do fluxo "Oferecer boleia" */}
      <Sheet
        open={openOffer}
        onClose={() => setOpenOffer(false)}
        title="Oferecer boleia"
        height="lg"
        footer={null}
      >
        <OfferRideForm
          onCancel={()=>setOpenOffer(false)}
          onSubmit={(vals: OfferRideFormValues)=>{
            createOffer(vals);
            setOpenOffer(false);
            setTab("rides");
          }}
        />
      </Sheet>

      {/* Sheet do fluxo "Pedir boleia" */}
      <Sheet
        open={openRequest}
        onClose={() => setOpenRequest(false)}
        title="Pedir boleia"
        height="lg"
        footer={null}
      >
        <RequestRideForm
          onCancel={()=>setOpenRequest(false)}
          onSubmit={(vals: RequestRideFormValues)=>{
            createRequest(vals);
            setOpenRequest(false);
            setTab("discover");
          }}
        />
      </Sheet>
      </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <NotificationProvider>
        <InboxProvider>
          <RidesInboxConnector>
            <AppContent />
          </RidesInboxConnector>
        </InboxProvider>
      </NotificationProvider>
    </LanguageProvider>
  );
}
