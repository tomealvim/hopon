import { useCallback } from "react";
import { RidesProvider } from "./RidesContext";
import { useInbox } from "./InboxContext";
import { useAuth } from "./AuthContext";
import type { ReactNode } from "react";

function RidesInboxConnector({ children }: { children: ReactNode }) {
  const { refresh } = useInbox();
  const { user } = useAuth();

  const handleCreateThread = useCallback((_params: {
    offerId: string;
    requestId: string;
    offerUserId: string;
    origem: string;
    destino: string;
    data: string;
    hora: string;
    message?: string;
  }): string | undefined => {
    if (!user) return undefined;
    // A conversa é criada automaticamente no backend quando o booking é criado.
    // Refrescar o inbox para mostrar a nova conversa.
    refresh().catch(console.error);
    return undefined;
  }, [user, refresh]);

  return (
    <RidesProvider onCreateThread={handleCreateThread}>
      {children}
    </RidesProvider>
  );
}

export default RidesInboxConnector;
