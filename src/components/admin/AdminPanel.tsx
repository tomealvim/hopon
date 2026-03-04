import { useState, useEffect, useCallback } from "react";
import Sheet from "../ui/Sheet";
import { Button } from "../ui/Button";
import { cn } from "../../utils/cn";
import { apiRequest } from "../../services/api";

type AdminTab = "saques" | "disputas" | "verificacoes";

// ── Types ────────────────────────────────────────────────────────────────────

interface PayoutRequest {
  id: string;
  amount: number;
  iban: string;
  status: string;
  adminNote?: string | null;
  createdAt: string;
  user: { id: string; email: string; name?: string };
}

interface Dispute {
  id: string;
  reason: string;
  details?: string | null;
  status: string;
  resolution?: string | null;
  refundAmount?: number | null;
  createdAt: string;
  openedBy: { id: string; email: string; profile?: { name?: string } };
  booking: {
    id: string;
    userId: string;
    price: number;
    seats: number;
    ride: { origin: string; destination: string; departureTime: string };
  };
}

interface PendingVerification {
  id: string;
  email: string;
  name?: string;
  identityDocumentUrl?: string | null;
  identityDocumentType?: string | null;
  identityDocumentStatus: string;
  createdAt: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    APPROVED: "bg-blue-100 text-blue-800",
    PROCESSED: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-800",
    OPEN: "bg-yellow-100 text-yellow-800",
    RESOLVED: "bg-green-100 text-green-800",
    DISMISSED: "bg-gray-100 text-gray-600",
    VERIFIED: "bg-green-100 text-green-800",
    NONE: "bg-gray-100 text-gray-500",
  };
  const label: Record<string, string> = {
    PENDING: "Pendente",
    APPROVED: "Aprovado",
    PROCESSED: "Processado",
    REJECTED: "Rejeitado",
    OPEN: "Aberto",
    RESOLVED: "Resolvido",
    DISMISSED: "Descartado",
    VERIFIED: "Verificado",
    NONE: "Nenhum",
  };
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", map[status] ?? "bg-gray-100 text-gray-600")}>
      {label[status] ?? status}
    </span>
  );
}

// ── Payout Requests Tab ──────────────────────────────────────────────────────

function PayoutRequestsTab() {
  const [items, setItems] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("PENDING");
  const [acting, setActing] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest<PayoutRequest[]>(`/admin/payout-requests?status=${filter}`);
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function act(id: string, status: string, adminNote?: string) {
    setActing(id);
    try {
      await apiRequest(`/admin/payout-requests/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, adminNote }),
      });
      await load();
    } finally {
      setActing(null);
      setNoteFor(null);
      setNote("");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {["PENDING", "APPROVED", "PROCESSED", "REJECTED"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-semibold border transition-colors",
              filter === s ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200"
            )}
          >
            {s === "PENDING" ? "Pendentes" : s === "APPROVED" ? "Aprovados" : s === "PROCESSED" ? "Processados" : "Rejeitados"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-gray-400">A carregar…</div>
      ) : items.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-400">Nenhum pedido encontrado.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <div key={item.id} className="border border-gray-200 rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{item.user.name ?? item.user.email}</p>
                  <p className="text-xs text-gray-500">{item.user.email}</p>
                </div>
                <StatusBadge status={item.status} />
              </div>

              <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
                <span>Valor: <strong>€{item.amount.toFixed(2)}</strong></span>
                <span>{fmtDate(item.createdAt)}</span>
                <span className="col-span-2 font-mono break-all">IBAN: {item.iban}</span>
              </div>

              {item.adminNote && (
                <p className="text-xs text-gray-500 italic">Nota: {item.adminNote}</p>
              )}

              {item.status === "PENDING" && (
                <div className="flex gap-2 mt-1 flex-wrap">
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={acting === item.id}
                    onClick={() => act(item.id, "APPROVED")}
                  >
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    disabled={acting === item.id}
                    onClick={() => setNoteFor(item.id)}
                  >
                    Rejeitar
                  </Button>
                </div>
              )}

              {item.status === "APPROVED" && (
                <Button
                  size="sm"
                  className="w-full mt-1"
                  disabled={acting === item.id}
                  onClick={() => act(item.id, "PROCESSED")}
                >
                  Marcar como Processado
                </Button>
              )}

              {noteFor === item.id && (
                <div className="flex flex-col gap-2 mt-1">
                  <input
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                    placeholder="Motivo da rejeição (opcional)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => { setNoteFor(null); setNote(""); }}>
                      Cancelar
                    </Button>
                    <Button size="sm" className="flex-1 bg-red-500 hover:bg-red-600" disabled={acting === item.id} onClick={() => act(item.id, "REJECTED", note || undefined)}>
                      Confirmar rejeição
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Disputes Tab ─────────────────────────────────────────────────────────────

function DisputesTab() {
  const [items, setItems] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("OPEN");
  const [resolving, setResolving] = useState<string | null>(null);
  const [action, setAction] = useState<"REFUND" | "DISMISS" | null>(null);
  const [refundAmt, setRefundAmt] = useState("");
  const [resolution, setResolution] = useState("");
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest<Dispute[]>(`/admin/disputes?status=${filter}`);
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  function startResolve(id: string, act: "REFUND" | "DISMISS") {
    setResolving(id);
    setAction(act);
    setRefundAmt("");
    setResolution("");
  }

  async function submitResolve(id: string) {
    if (!action) return;
    setActing(id);
    try {
      await apiRequest(`/admin/disputes/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          action,
          refundAmount: action === "REFUND" ? parseFloat(refundAmt) : undefined,
          resolution: resolution || undefined,
        }),
      });
      await load();
    } finally {
      setActing(null);
      setResolving(null);
      setAction(null);
    }
  }

  const REASON_MAP: Record<string, string> = {
    WRONG_AMOUNT: "Valor errado",
    NO_SHOW: "Não compareceu",
    SAFETY: "Segurança",
    SERVICE_QUALITY: "Qualidade de serviço",
    OTHER: "Outro",
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 flex-wrap">
        {["OPEN", "RESOLVED", "DISMISSED"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-semibold border transition-colors",
              filter === s ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200"
            )}
          >
            {s === "OPEN" ? "Abertos" : s === "RESOLVED" ? "Resolvidos" : "Descartados"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-gray-400">A carregar…</div>
      ) : items.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-400">Nenhuma disputa encontrada.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <div key={item.id} className="border border-gray-200 rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {item.openedBy.profile?.name ?? item.openedBy.email}
                  </p>
                  <p className="text-xs text-gray-500">{item.openedBy.email}</p>
                </div>
                <StatusBadge status={item.status} />
              </div>

              <div className="text-xs text-gray-600 flex flex-col gap-0.5">
                <span>Motivo: <strong>{REASON_MAP[item.reason] ?? item.reason}</strong></span>
                <span>
                  Viagem: {item.booking.ride.origin} → {item.booking.ride.destination}
                </span>
                <span>
                  Valor reserva: €{(item.booking.price * item.booking.seats).toFixed(2)} ({item.booking.seats} lugar{item.booking.seats > 1 ? "es" : ""})
                </span>
                {item.details && <span className="italic text-gray-500">{item.details}</span>}
                <span>{fmtDate(item.createdAt)}</span>
              </div>

              {item.status === "RESOLVED" && item.refundAmount != null && (
                <p className="text-xs text-green-700 font-semibold">Reembolso: €{item.refundAmount.toFixed(2)}</p>
              )}
              {item.resolution && (
                <p className="text-xs text-gray-500 italic">Resolução: {item.resolution}</p>
              )}

              {item.status === "OPEN" && resolving !== item.id && (
                <div className="flex gap-2 mt-1">
                  <Button size="sm" className="flex-1" onClick={() => startResolve(item.id, "REFUND")}>
                    Reembolsar
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => startResolve(item.id, "DISMISS")}>
                    Descartar
                  </Button>
                </div>
              )}

              {resolving === item.id && (
                <div className="flex flex-col gap-2 mt-1 border-t border-gray-100 pt-2">
                  <p className="text-xs font-semibold text-gray-700">
                    {action === "REFUND" ? "Reembolsar passageiro" : "Descartar disputa"}
                  </p>
                  {action === "REFUND" && (
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                      placeholder="Valor a reembolsar (€)"
                      value={refundAmt}
                      onChange={(e) => setRefundAmt(e.target.value)}
                    />
                  )}
                  <input
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                    placeholder="Nota de resolução (opcional)"
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => { setResolving(null); setAction(null); }}>
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={acting === item.id || (action === "REFUND" && !refundAmt)}
                      onClick={() => submitResolve(item.id)}
                    >
                      Confirmar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Verifications Tab ────────────────────────────────────────────────────────

function VerificationsTab() {
  const [items, setItems] = useState<PendingVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [imgOpen, setImgOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest<PendingVerification[]>("/admin/verifications/pending");
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function approve(id: string) {
    setActing(id);
    try {
      await apiRequest(`/admin/users/${id}/verify`, { method: "PATCH" });
      await load();
    } finally {
      setActing(null);
    }
  }

  async function reject(id: string) {
    setActing(id);
    try {
      await apiRequest(`/admin/users/${id}/verify/reject`, { method: "POST" });
      await load();
    } finally {
      setActing(null);
    }
  }

  const DOC_TYPE: Record<string, string> = {
    cc: "Cartão de Cidadão",
    passport: "Passaporte",
    driving_license: "Carta de Condução",
  };

  return (
    <div className="flex flex-col gap-4">
      {loading ? (
        <div className="py-8 text-center text-sm text-gray-400">A carregar…</div>
      ) : items.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-400">Nenhuma verificação pendente.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <div key={item.id} className="border border-gray-200 rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{item.name ?? item.email}</p>
                  <p className="text-xs text-gray-500">{item.email}</p>
                </div>
                <StatusBadge status={item.identityDocumentStatus} />
              </div>

              <div className="text-xs text-gray-600 flex flex-col gap-0.5">
                <span>Tipo: <strong>{DOC_TYPE[item.identityDocumentType ?? ""] ?? item.identityDocumentType ?? "—"}</strong></span>
                <span>{fmtDate(item.createdAt)}</span>
              </div>

              {item.identityDocumentUrl && (
                <button
                  className="w-full rounded-lg overflow-hidden border border-gray-200 bg-gray-50 hover:opacity-80 transition"
                  onClick={() => setImgOpen(item.identityDocumentUrl!)}
                >
                  <img
                    src={item.identityDocumentUrl}
                    alt="Documento"
                    className="w-full max-h-40 object-contain"
                  />
                  <p className="text-xs text-gray-500 py-1">Clica para ampliar</p>
                </button>
              )}

              <div className="flex gap-2 mt-1">
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={acting === item.id}
                  onClick={() => approve(item.id)}
                >
                  Aprovar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  disabled={acting === item.id}
                  onClick={() => reject(item.id)}
                >
                  Rejeitar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {imgOpen && (
        <div
          className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setImgOpen(null)}
        >
          <img src={imgOpen} alt="Documento" className="max-w-full max-h-full rounded-xl" />
        </div>
      )}
    </div>
  );
}

// ── AdminPanel ───────────────────────────────────────────────────────────────

type Props = {
  open: boolean;
  onClose: () => void;
};

const TABS: { key: AdminTab; label: string }[] = [
  { key: "saques", label: "Saques" },
  { key: "disputas", label: "Disputas" },
  { key: "verificacoes", label: "Identidade" },
];

export default function AdminPanel({ open, onClose }: Props) {
  const [tab, setTab] = useState<AdminTab>("saques");

  return (
    <Sheet open={open} onClose={onClose} title="Painel Admin" height="lg">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 mb-4 -mt-2">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex-1 py-2.5 text-sm font-semibold border-b-2 transition-colors",
              tab === key
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-400 hover:text-gray-700"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "saques" && <PayoutRequestsTab />}
      {tab === "disputas" && <DisputesTab />}
      {tab === "verificacoes" && <VerificationsTab />}
    </Sheet>
  );
}
