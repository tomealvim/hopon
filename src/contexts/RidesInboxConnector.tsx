import { useCallback } from "react";
import { RidesProvider } from "./RidesContext";
import { useInbox } from "./InboxContext";
import { useAuth } from "./AuthContext";
import type { ReactNode } from "react";
import type { SystemEvent, Message } from "../pages/types/inbox";

function RidesInboxConnector({ children }: { children: ReactNode }) {
  const { createThread, addMessage } = useInbox();
  const { user } = useAuth();

  const handleCreateThread = useCallback(({ 
    offerUserId, 
    origem, 
    destino, 
    data, 
    hora, 
    message 
  }: { 
    offerId: string; 
    requestId: string; 
    offerUserId: string;
    origem: string;
    destino: string;
    data: string;
    hora: string;
    message?: string 
  }): string | undefined => {
    if (!user) return undefined;

    // Criar thread para o pedido de boleia
    const thread = createThread({
      kind: "ride",
      title: `${origem} → ${destino} (${data} às ${hora})`,
      participants: [offerUserId, user.id], // [condutor, passageiro]
      unreadCount: 1,
      lastEvent: {
        type: "system",
        system: {
          kind: "ride_request",
          byUser: user.id,
          seats: 1,
          message: message
        } as SystemEvent
      },
      meta: { date: "Hoje" }
    });

    // Adicionar mensagem do sistema
    addMessage(thread.id, {
      type: "system",
      system: {
        kind: "ride_request",
        byUser: user.id,
        seats: 1,
        message: message
      } as SystemEvent
    } as Omit<Message, "id" | "threadId" | "ts">);

    // Se há mensagem personalizada, adicionar como mensagem de texto
    if (message) {
      addMessage(thread.id, {
        type: "text",
        text: message,
        authorId: user.id
      } as Omit<Message, "id" | "threadId" | "ts">);
    }

    return thread.id;
  }, [user, createThread, addMessage]);

  return (
    <RidesProvider onCreateThread={handleCreateThread}>
      {children}
    </RidesProvider>
  );
}

export default RidesInboxConnector;

