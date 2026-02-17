/**
 * Função utilitária para popular o localStorage com dados realistas para screenshots.
 * 
 * Uso:
 * - Via console do browser: window.populateScreenshotData()
 * - Ou importar e chamar temporariamente no código
 */

import type { User } from "../pages/types/user";
import type { RideOffer, RideRequest } from "../contexts/RidesContext";
import type { Thread, Message } from "../pages/types/inbox";

const STORAGE_KEY_USER = "hopon_user";
const STORAGE_KEY_OFFERS = "hopon_offers";
const STORAGE_KEY_REQUESTS = "hopon_requests";
const STORAGE_KEY_THREADS = "hopon_threads";
const STORAGE_KEY_MESSAGES = "hopon_messages";

export function populateScreenshotData() {
  // 1. Utilizador com perfil completo
  const user: User = {
    id: "user_screenshot",
    email: "maria.silva@example.com",
    phone: "+351 912 345 678",
    profile: {
      name: "Maria Silva",
      avatarUrl: undefined, // Pode adicionar URL de imagem se necessário
      address: "Cascais, Centro",
      schedule: {
        days: [
          {
            day: "segunda",
            blocks: [
              { id: "1", start: "09:00", end: "11:00", title: "PF I-T", room: "TA-A127" },
              { id: "2", start: "14:00", end: "16:00", title: "Matemática", room: "B203" },
            ],
          },
          {
            day: "terca",
            blocks: [
              { id: "3", start: "10:00", end: "12:00", title: "Algoritmos", room: "A101" },
              { id: "4", start: "15:00", end: "17:00", title: "BD", room: "C305" },
            ],
          },
          {
            day: "quarta",
            blocks: [
              { id: "5", start: "09:00", end: "11:00", title: "PF I-T", room: "TA-A127" },
            ],
          },
          {
            day: "quinta",
            blocks: [
              { id: "6", start: "11:00", end: "13:00", title: "Web Dev", room: "D401" },
            ],
          },
          {
            day: "sexta",
            blocks: [
              { id: "7", start: "14:00", end: "16:00", title: "Projeto", room: "Lab-1" },
            ],
          },
        ],
      },
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias atrás
    },
  };

  // 2. Ofertas de boleia realistas
  const offers: RideOffer[] = [
    {
      id: "offer_1",
      userId: "user_joao",
      origem: "Cascais",
      destino: "Universidade Nova de Lisboa",
      data: "2024-12-16",
      hora: "08:30",
      lugares: 4,
      lugaresDisponiveis: 2,
      aceitaDesvios: true,
      desvioMaxMin: 15,
      pontoEncontro: "Estação Cascais",
      recorrente: true,
      diasSemana: ["seg", "ter", "qua", "qui", "sex"],
      observacoes: "Passo na estação de comboios. Aceito desvios até 15 min.",
      preferencias: {
        musica: true,
        falar: true,
        bagagem: false,
        animais: false,
      },
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      status: "active",
      pedidos: ["request_1"],
      vehicle: {
        id: "v1",
        brand: "Toyota",
        model: "Corolla",
        color: "Cinza",
        plate: "AA-00-AA"
      },
    },
    {
      id: "offer_2",
      userId: "user_ana",
      origem: "Sintra",
      destino: "Universidade Nova de Lisboa",
      data: "2024-12-17",
      hora: "09:00",
      lugares: 3,
      lugaresDisponiveis: 3,
      aceitaDesvios: false,
      desvioMaxMin: 0,
      recorrente: false,
      diasSemana: [],
      preferencias: {
        musica: false,
        falar: false,
        bagagem: true,
        animais: false,
      },
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      status: "active",
      pedidos: [],
      vehicle: {
        id: "v2",
        brand: "BMW",
        model: "Série 1",
        color: "Preto",
        plate: "BB-11-BB"
      },
    },
    {
      id: "offer_3",
      userId: "user_pedro",
      origem: "Oeiras",
      destino: "Universidade Nova de Lisboa",
      data: "2024-12-18",
      hora: "07:45",
      lugares: 5,
      lugaresDisponiveis: 4,
      aceitaDesvios: true,
      desvioMaxMin: 20,
      recorrente: true,
      diasSemana: ["seg", "qua", "sex"],
      observacoes: "Boleia regular. Preferência por estudantes da mesma zona.",
      preferencias: {
        musica: true,
        falar: true,
        bagagem: false,
        animais: true,
      },
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: "active",
      pedidos: [],
      vehicle: {
        id: "v3",
        brand: "Renault",
        model: "Clio",
        color: "Branco",
        plate: "CC-22-CC"
      },
    },
  ];

  // 3. Pedidos de boleia realistas
  const requests: RideRequest[] = [
    {
      id: "request_1",
      userId: "user_screenshot",
      origem: "Cascais",
      destino: "Universidade Nova de Lisboa",
      data: "2024-12-16",
      horaMin: "08:00",
      horaMax: "09:00",
      passageiros: 1,
      aceitaDesvios: true,
      desvioMaxMin: 10,
      orcamentoMax: 5,
      preferencias: {
        musica: true,
        falar: true,
        bagagem: false,
        animais: false,
        fumador: false,
      },
      urgencia: "media",
      observacoes: "Preciso de boleia regular para as aulas.",
      contacto: "+351 912 345 678",
      disponibilidade: {
        manha: true,
        tarde: false,
        noite: false,
      },
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      status: "pending",
      requestMessage: "Olá! Gostaria de pedir um lugar na tua boleia.",
    },
    {
      id: "request_2",
      userId: "user_carlos",
      origem: "Lisboa",
      destino: "Universidade Nova de Lisboa",
      data: "2024-12-17",
      horaMin: "08:30",
      horaMax: "09:30",
      passageiros: 2,
      aceitaDesvios: false,
      desvioMaxMin: 0,
      orcamentoMax: 8,
      preferencias: {
        musica: false,
        falar: false,
        bagagem: true,
        animais: false,
        fumador: false,
      },
      urgencia: "alta",
      contacto: "+351 923 456 789",
      disponibilidade: {
        manha: true,
        tarde: false,
        noite: false,
      },
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      status: "pending",
    },
  ];

  // 4. Threads da inbox
  const threads: Thread[] = [
    {
      id: "thread_1",
      kind: "ride",
      title: "Cascais → UNL",
      participants: ["user_screenshot", "user_joao"],
      unreadCount: 2,
      lastEvent: {
        type: "text",
        text: "Perfeito! Encontramo-nos às 08:30 na estação.",
      },
      meta: { date: "2024-12-16" },
    },
    {
      id: "thread_2",
      kind: "ride",
      title: "Pedido de boleia",
      participants: ["user_screenshot", "user_ana"],
      unreadCount: 0,
      lastEvent: {
        type: "system",
        system: {
          kind: "ride_request",
          byUser: "user_screenshot",
          seats: 1,
          when: "2024-12-17 às 09:00",
          origin: "Cascais",
          dest: "Universidade Nova de Lisboa",
          message: "Olá! Gostaria de pedir um lugar na tua boleia.",
        },
      },
      meta: { date: "2024-12-17" },
    },
    {
      id: "thread_3",
      kind: "dm",
      title: "Tomás Silva",
      participants: ["user_screenshot", "user_tomas"],
      unreadCount: 1,
      lastEvent: {
        type: "text",
        text: "Obrigado pela boleia de ontem! Foi tudo perfeito.",
      },
    },
  ];

  // 5. Mensagens
  const messages: Record<string, Message[]> = {
    thread_1: [
      {
        id: "msg_1",
        threadId: "thread_1",
        type: "system",
        ts: Date.now() - 3 * 24 * 60 * 60 * 1000,
        system: {
          kind: "ride_request",
          byUser: "user_screenshot",
          seats: 1,
          when: "2024-12-16 às 08:30",
          origin: "Cascais",
          dest: "Universidade Nova de Lisboa",
          message: "Olá! Gostaria de pedir um lugar na tua boleia.",
        },
      },
      {
        id: "msg_2",
        threadId: "thread_1",
        type: "text",
        authorId: "user_joao",
        text: "Olá! Claro, ainda tenho lugares disponíveis.",
        ts: Date.now() - 2 * 24 * 60 * 60 * 1000,
      },
      {
        id: "msg_3",
        threadId: "thread_1",
        type: "text",
        authorId: "user_screenshot",
        text: "Ótimo! Onde é o ponto de encontro?",
        ts: Date.now() - 2 * 24 * 60 * 60 * 1000 + 1000 * 60 * 30,
      },
      {
        id: "msg_4",
        threadId: "thread_1",
        type: "text",
        authorId: "user_joao",
        text: "Perfeito! Encontramo-nos às 08:30 na estação.",
        ts: Date.now() - 1 * 24 * 60 * 60 * 1000,
      },
    ],
    thread_2: [
      {
        id: "msg_5",
        threadId: "thread_2",
        type: "system",
        ts: Date.now() - 1 * 24 * 60 * 60 * 1000,
        system: {
          kind: "ride_request",
          byUser: "user_screenshot",
          seats: 1,
          when: "2024-12-17 às 09:00",
          origin: "Cascais",
          dest: "Universidade Nova de Lisboa",
          message: "Olá! Gostaria de pedir um lugar na tua boleia.",
        },
      },
    ],
    thread_3: [
      {
        id: "msg_6",
        threadId: "thread_3",
        type: "text",
        authorId: "user_tomas",
        text: "Obrigado pela boleia de ontem! Foi tudo perfeito.",
        ts: Date.now() - 12 * 60 * 60 * 1000, // 12 horas atrás
      },
    ],
  };

  // Guardar tudo no localStorage
  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
  localStorage.setItem(STORAGE_KEY_OFFERS, JSON.stringify(offers));
  localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(requests));
  localStorage.setItem(STORAGE_KEY_THREADS, JSON.stringify(threads));
  localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages));

  console.log("✅ Dados de screenshot populados com sucesso!");
  console.log("Recarrega a página para ver os dados.");
}

// Expor globalmente para uso via console do browser
if (typeof window !== "undefined") {
  (window as any).populateScreenshotData = populateScreenshotData;
}

