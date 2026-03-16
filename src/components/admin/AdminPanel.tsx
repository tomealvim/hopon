import { useState, useEffect, useCallback } from "react";
import Sheet from "../ui/Sheet";
import { Button } from "../ui/Button";
import { cn } from "../../utils/cn";
import { apiRequest } from "../../services/api";
import {
  Users, Car, TrendingUp, AlertTriangle, Clock, CheckCircle,
  XCircle, ChevronLeft, ChevronRight, Search, Shield, FileText,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type AdminTab = "overview" | "utilizadores" | "boleias" | "denuncias" | "saques" | "disputas" | "cartas" | "identidade";

interface Metrics {
  users: { total: number; newToday: number; newWeek: number; newMonth: number; suspended: number; verified: number };
  rides: { total: number; thisWeek: number; scheduled: number; completed: number; cancelled: number };
  bookings: { total: number; confirmed: number; cancelled: number; cancellationRate: number };
  pending: { disputes: number; payouts: number; verifications: number; licenses: number };
  topRoutes: { origin: string; destination: string; count: number }[];
  totalWalletBalance: number;
}

interface AdminUser {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  isAdmin: boolean;
  isIdentityVerified: boolean;
  identityDocumentStatus?: string;
  driverLicenseStatus?: string;
  suspendedAt?: string | null;
  suspensionReason?: string | null;
  createdAt: string;
  ridesOffered: number;
  bookingsMade: number;
}

interface AdminRide {
  id: string;
  origin: string;
  destination: string;
  departureTime: string;
  status: string;
  availableSeats: number;
  price?: number | null;
  createdAt: string;
  cancelledAt?: string | null;
  driver: { id: string; email: string; name?: string };
  bookingsCount: number;
}

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

interface PendingDriverLicense {
  id: string;
  email: string;
  name?: string;
  driverLicenseUrl?: string | null;
  driverLicenseStatus: string;
  driverLicenseCcNumber?: string | null;
  createdAt: string;
}

interface Report {
  id: string;
  reason: string;
  details?: string | null;
  status: string;
  createdAt: string;
  reporter: { id: string; email: string; name?: string };
  target: { id: string; email: string; name?: string; suspendedAt?: string | null; isIdentityVerified: boolean };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pt-PT", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
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
    SCHEDULED: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
    IN_PROGRESS: "bg-purple-100 text-purple-800",
    REVIEWED: "bg-gray-100 text-gray-600",
  };
  const label: Record<string, string> = {
    PENDING: "Pendente", APPROVED: "Aprovado", PROCESSED: "Processado", REJECTED: "Rejeitado",
    OPEN: "Aberto", RESOLVED: "Resolvido", DISMISSED: "Descartado", VERIFIED: "Verificado",
    NONE: "Nenhum", SCHEDULED: "Agendada", COMPLETED: "Concluída", CANCELLED: "Cancelada",
    IN_PROGRESS: "Em curso", REVIEWED: "Revisto",
  };
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", map[status] ?? "bg-gray-100 text-gray-600")}>
      {label[status] ?? status}
    </span>
  );
}

function MetricCard({ label, value, sub, color = "gray" }: { label: string; value: string | number; sub?: string; color?: string }) {
  const colorMap: Record<string, string> = {
    gray: "bg-gray-50 border-gray-200",
    blue: "bg-blue-50 border-blue-200",
    green: "bg-green-50 border-green-200",
    red: "bg-red-50 border-red-200",
    yellow: "bg-yellow-50 border-yellow-200",
  };
  return (
    <div className={cn("rounded-xl border p-3 flex flex-col gap-0.5", colorMap[color] ?? colorMap.gray)}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

function Paginator({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-3 text-sm">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        className="flex items-center gap-1 text-gray-500 disabled:opacity-30"
      >
        <ChevronLeft size={16} /> Anterior
      </button>
      <span className="text-gray-400">{page} / {pages}</span>
      <button
        onClick={() => onPage(page + 1)}
        disabled={page >= pages}
        className="flex items-center gap-1 text-gray-500 disabled:opacity-30"
      >
        Seguinte <ChevronRight size={16} />
      </button>
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab() {
  const [data, setData] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<Metrics>("/admin/metrics")
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-8 text-center text-sm text-gray-400">A carregar…</div>;
  if (!data) return <div className="py-8 text-center text-sm text-red-400">Erro ao carregar métricas.</div>;

  const totalPending = data.pending.disputes + data.pending.payouts + data.pending.verifications + data.pending.licenses;

  return (
    <div className="flex flex-col gap-5">
      {/* Alertas pendentes */}
      {totalPending > 0 && (
        <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-3 flex items-center gap-3">
          <AlertTriangle size={18} className="text-yellow-600 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-semibold text-yellow-800">Itens que precisam de atenção</p>
            <p className="text-yellow-700 text-xs mt-0.5">
              {data.pending.disputes > 0 && `${data.pending.disputes} disputa${data.pending.disputes > 1 ? "s" : ""} abertas  `}
              {data.pending.payouts > 0 && `${data.pending.payouts} saque${data.pending.payouts > 1 ? "s" : ""} pendentes  `}
              {data.pending.verifications > 0 && `${data.pending.verifications} identidade${data.pending.verifications > 1 ? "s" : ""} para verificar  `}
              {data.pending.licenses > 0 && `${data.pending.licenses} carta${data.pending.licenses > 1 ? "s" : ""} para verificar`}
            </p>
          </div>
        </div>
      )}

      {/* Utilizadores */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <Users size={12} /> Utilizadores
        </p>
        <div className="grid grid-cols-2 gap-2">
          <MetricCard label="Total" value={data.users.total} color="blue" />
          <MetricCard label="Novos hoje" value={data.users.newToday} sub={`${data.users.newWeek} esta semana`} />
          <MetricCard label="Verificados" value={data.users.verified} sub={`${Math.round((data.users.verified / Math.max(data.users.total, 1)) * 100)}% do total`} color="green" />
          <MetricCard label="Suspensos" value={data.users.suspended} color={data.users.suspended > 0 ? "red" : "gray"} />
        </div>
      </div>

      {/* Boleias */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <Car size={12} /> Boleias
        </p>
        <div className="grid grid-cols-2 gap-2">
          <MetricCard label="Total" value={data.rides.total} color="blue" />
          <MetricCard label="Esta semana" value={data.rides.thisWeek} />
          <MetricCard label="Agendadas" value={data.rides.scheduled} color="blue" />
          <MetricCard label="Concluídas" value={data.rides.completed} color="green" />
        </div>
      </div>

      {/* Reservas */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <TrendingUp size={12} /> Reservas
        </p>
        <div className="grid grid-cols-2 gap-2">
          <MetricCard label="Total" value={data.bookings.total} color="blue" />
          <MetricCard label="Confirmadas" value={data.bookings.confirmed} color="green" />
          <MetricCard label="Canceladas" value={data.bookings.cancelled} color={data.bookings.cancelled > 10 ? "red" : "gray"} />
          <MetricCard label="Taxa cancelamento" value={`${data.bookings.cancellationRate}%`} color={data.bookings.cancellationRate > 20 ? "red" : data.bookings.cancellationRate > 10 ? "yellow" : "green"} />
        </div>
      </div>

      {/* Saldo total na plataforma */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Carteiras</p>
        <MetricCard label="Saldo total na plataforma" value={`€${data.totalWalletBalance.toFixed(2)}`} color="green" />
      </div>

      {/* Top rotas */}
      {data.topRoutes.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Top Rotas</p>
          <div className="flex flex-col gap-1.5">
            {data.topRoutes.map((r, i) => (
              <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 text-xs">
                <span className="text-gray-400 font-mono w-4">{i + 1}.</span>
                <span className="flex-1 text-gray-700 truncate">{r.origin} → {r.destination}</span>
                <span className="font-semibold text-gray-900">{r.count}x</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Users Tab ─────────────────────────────────────────────────────────────────

function UsersTab() {
  const [items, setItems] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [acting, setActing] = useState<string | null>(null);
  const [suspendFor, setSuspendFor] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState("");

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p) });
      if (search) params.set("search", search);
      if (filter) params.set("filter", filter);
      const data = await apiRequest<{ users: AdminUser[]; total: number; page: number; pages: number }>(`/admin/users?${params}`);
      setItems(data.users);
      setTotal(data.total);
      setPage(data.page);
      setPages(data.pages);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [search, filter]);

  useEffect(() => { load(1); }, [load]);

  async function suspend(id: string) {
    if (!suspendReason.trim()) return;
    setActing(id);
    try {
      await apiRequest(`/admin/users/${id}/suspend`, {
        method: "PATCH",
        body: JSON.stringify({ reason: suspendReason }),
      });
      setSuspendFor(null);
      setSuspendReason("");
      await load(page);
    } finally {
      setActing(null);
    }
  }

  async function unsuspend(id: string) {
    setActing(id);
    try {
      await apiRequest(`/admin/users/${id}/suspend`, { method: "DELETE" });
      await load(page);
    } finally {
      setActing(null);
    }
  }

  async function verify(id: string) {
    setActing(id);
    try {
      await apiRequest(`/admin/users/${id}/verify`, { method: "PATCH" });
      await load(page);
    } finally {
      setActing(null);
    }
  }

  const FILTERS = [
    { key: "", label: "Todos" },
    { key: "suspended", label: "Suspensos" },
    { key: "verified", label: "Verificados" },
    { key: "admin", label: "Admins" },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
          placeholder="Pesquisar por nome ou email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-semibold border whitespace-nowrap transition-colors",
              filter === f.key ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-400">{total} utilizador{total !== 1 ? "es" : ""}</p>

      {loading ? (
        <div className="py-8 text-center text-sm text-gray-400">A carregar…</div>
      ) : items.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-400">Nenhum utilizador encontrado.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((u) => (
            <div key={u.id} className="border border-gray-200 rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                    {u.name ?? u.email}
                    {u.isAdmin && <Shield size={12} className="text-blue-500" />}
                    {u.isIdentityVerified && <CheckCircle size={12} className="text-green-500" />}
                  </p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </div>
                {u.suspendedAt ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">Suspenso</span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">Ativo</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-1 text-xs text-gray-500">
                <span>{u.ridesOffered} boleia{u.ridesOffered !== 1 ? "s" : ""} oferecidas</span>
                <span>{u.bookingsMade} reserva{u.bookingsMade !== 1 ? "s" : ""} feitas</span>
                <span>Registado {fmtShort(u.createdAt)}</span>
                {u.driverLicenseStatus && u.driverLicenseStatus !== "NONE" && (
                  <span>Carta: <strong>{u.driverLicenseStatus === "APPROVED" ? "aprovada" : u.driverLicenseStatus === "PENDING" ? "pendente" : "rejeitada"}</strong></span>
                )}
              </div>

              {u.suspendedAt && u.suspensionReason && (
                <p className="text-xs text-red-600 italic">Motivo: {u.suspensionReason}</p>
              )}

              {suspendFor !== u.id ? (
                <div className="flex gap-2 flex-wrap mt-1">
                  {!u.isIdentityVerified && (
                    <Button size="sm" variant="outline" className="text-xs" disabled={acting === u.id} onClick={() => verify(u.id)}>
                      Verificar identidade
                    </Button>
                  )}
                  {u.suspendedAt ? (
                    <Button size="sm" className="flex-1" disabled={acting === u.id} onClick={() => unsuspend(u.id)}>
                      Reativar
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                      disabled={acting === u.id}
                      onClick={() => { setSuspendFor(u.id); setSuspendReason(""); }}
                    >
                      Suspender
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2 mt-1 border-t border-gray-100 pt-2">
                  <input
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                    placeholder="Motivo da suspensão (obrigatório)"
                    value={suspendReason}
                    onChange={(e) => setSuspendReason(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => { setSuspendFor(null); setSuspendReason(""); }}>
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-red-500 hover:bg-red-600"
                      disabled={acting === u.id || !suspendReason.trim()}
                      onClick={() => suspend(u.id)}
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

      <Paginator page={page} pages={pages} onPage={(p) => load(p)} />
    </div>
  );
}

// ── Rides Tab ─────────────────────────────────────────────────────────────────

function RidesTab() {
  const [items, setItems] = useState<AdminRide[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p) });
      if (status) params.set("status", status);
      const data = await apiRequest<{ rides: AdminRide[]; total: number; page: number; pages: number }>(`/admin/rides?${params}`);
      setItems(data.rides);
      setTotal(data.total);
      setPage(data.page);
      setPages(data.pages);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(1); }, [load]);

  const STATUSES = [
    { key: "", label: "Todas" },
    { key: "SCHEDULED", label: "Agendadas" },
    { key: "IN_PROGRESS", label: "Em curso" },
    { key: "COMPLETED", label: "Concluídas" },
    { key: "CANCELLED", label: "Canceladas" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
        {STATUSES.map((s) => (
          <button
            key={s.key}
            onClick={() => setStatus(s.key)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-semibold border whitespace-nowrap transition-colors",
              status === s.key ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-400">{total} boleia{total !== 1 ? "s" : ""}</p>

      {loading ? (
        <div className="py-8 text-center text-sm text-gray-400">A carregar…</div>
      ) : items.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-400">Nenhuma boleia encontrada.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((r) => (
            <div key={r.id} className="border border-gray-200 rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{r.origin} → {r.destination}</p>
                  <p className="text-xs text-gray-500">{r.driver.name ?? r.driver.email}</p>
                </div>
                <StatusBadge status={r.status} />
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs text-gray-500">
                <span>{fmtDate(r.departureTime)}</span>
                <span>{r.bookingsCount} reserva{r.bookingsCount !== 1 ? "s" : ""}</span>
                <span>{r.availableSeats} lugar{r.availableSeats !== 1 ? "es" : ""} disponíveis</span>
                {r.price != null && <span>€{r.price.toFixed(2)} / lugar</span>}
              </div>
              {r.cancelledAt && (
                <p className="text-xs text-red-500">Cancelada em {fmtDate(r.cancelledAt)}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <Paginator page={page} pages={pages} onPage={(p) => load(p)} />
    </div>
  );
}

// ── Reports Tab ───────────────────────────────────────────────────────────────

function ReportsTab() {
  const [items, setItems] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("PENDING");
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest<Report[]>(`/admin/reports?status=${filter}`);
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id: string, status: string) {
    setActing(id);
    try {
      await apiRequest(`/admin/reports/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await load();
    } finally {
      setActing(null);
    }
  }

  async function suspendTarget(userId: string) {
    await apiRequest(`/admin/users/${userId}/suspend`, {
      method: "PATCH",
      body: JSON.stringify({ reason: "Suspensão após denúncia verificada." }),
    });
  }

  const REASON_MAP: Record<string, string> = {
    INAPPROPRIATE_BEHAVIOR: "Comportamento inapropriado",
    FRAUD: "Fraude",
    SAFETY: "Segurança",
    NO_SHOW: "Não compareceu",
    OTHER: "Outro",
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 flex-wrap">
        {["PENDING", "REVIEWED", "DISMISSED"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-semibold border transition-colors",
              filter === s ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200"
            )}
          >
            {s === "PENDING" ? "Pendentes" : s === "REVIEWED" ? "Revistas" : "Descartadas"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-gray-400">A carregar…</div>
      ) : items.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-400">Nenhuma denúncia encontrada.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <div key={item.id} className="border border-gray-200 rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {REASON_MAP[item.reason] ?? item.reason}
                  </p>
                  <p className="text-xs text-gray-500">
                    De: {item.reporter.name ?? item.reporter.email}
                  </p>
                </div>
                <StatusBadge status={item.status} />
              </div>

              <div className="text-xs text-gray-600 flex flex-col gap-0.5">
                <span>
                  Denunciado: <strong>{item.target.name ?? item.target.email}</strong>
                  {item.target.suspendedAt && (
                    <span className="ml-1 text-red-500">(suspenso)</span>
                  )}
                </span>
                {item.details && <span className="italic text-gray-500">{item.details}</span>}
                <span>{fmtDate(item.createdAt)}</span>
              </div>

              {item.status === "PENDING" && (
                <div className="flex gap-2 flex-wrap mt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                    disabled={acting === item.id}
                    onClick={async () => { await suspendTarget(item.target.id); await updateStatus(item.id, "REVIEWED"); }}
                  >
                    Suspender utilizador
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    disabled={acting === item.id}
                    onClick={() => updateStatus(item.id, "DISMISSED")}
                  >
                    Descartar
                  </Button>
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={acting === item.id}
                    onClick={() => updateStatus(item.id, "REVIEWED")}
                  >
                    Marcar como revista
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Payout Requests Tab ───────────────────────────────────────────────────────

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
    } catch { setItems([]); } finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function act(id: string, status: string, adminNote?: string) {
    setActing(id);
    try {
      await apiRequest(`/admin/payout-requests/${id}`, { method: "PATCH", body: JSON.stringify({ status, adminNote }) });
      await load();
    } finally { setActing(null); setNoteFor(null); setNote(""); }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 flex-wrap">
        {["PENDING", "APPROVED", "PROCESSED", "REJECTED"].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={cn("px-3 py-1 rounded-full text-xs font-semibold border transition-colors",
              filter === s ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200")}>
            {s === "PENDING" ? "Pendentes" : s === "APPROVED" ? "Aprovados" : s === "PROCESSED" ? "Processados" : "Rejeitados"}
          </button>
        ))}
      </div>

      {loading ? <div className="py-8 text-center text-sm text-gray-400">A carregar…</div>
        : items.length === 0 ? <div className="py-8 text-center text-sm text-gray-400">Nenhum pedido encontrado.</div>
        : (
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
                {item.adminNote && <p className="text-xs text-gray-500 italic">Nota: {item.adminNote}</p>}
                {item.status === "PENDING" && (
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <Button size="sm" className="flex-1" disabled={acting === item.id} onClick={() => act(item.id, "APPROVED")}>Aprovar</Button>
                    <Button size="sm" variant="outline" className="flex-1" disabled={acting === item.id} onClick={() => setNoteFor(item.id)}>Rejeitar</Button>
                  </div>
                )}
                {item.status === "APPROVED" && (
                  <Button size="sm" className="w-full mt-1" disabled={acting === item.id} onClick={() => act(item.id, "PROCESSED")}>
                    Marcar como Processado
                  </Button>
                )}
                {noteFor === item.id && (
                  <div className="flex flex-col gap-2 mt-1">
                    <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                      placeholder="Motivo da rejeição (opcional)" value={note} onChange={(e) => setNote(e.target.value)} />
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => { setNoteFor(null); setNote(""); }}>Cancelar</Button>
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

// ── Disputes Tab ──────────────────────────────────────────────────────────────

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
    } catch { setItems([]); } finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  function startResolve(id: string, act: "REFUND" | "DISMISS") {
    setResolving(id); setAction(act); setRefundAmt(""); setResolution("");
  }

  async function submitResolve(id: string) {
    if (!action) return;
    setActing(id);
    try {
      await apiRequest(`/admin/disputes/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action, refundAmount: action === "REFUND" ? parseFloat(refundAmt) : undefined, resolution: resolution || undefined }),
      });
      await load();
    } finally { setActing(null); setResolving(null); setAction(null); }
  }

  const REASON_MAP: Record<string, string> = {
    WRONG_AMOUNT: "Valor errado", NO_SHOW: "Não compareceu",
    SAFETY: "Segurança", SERVICE_QUALITY: "Qualidade de serviço", OTHER: "Outro",
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 flex-wrap">
        {["OPEN", "RESOLVED", "DISMISSED"].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={cn("px-3 py-1 rounded-full text-xs font-semibold border transition-colors",
              filter === s ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200")}>
            {s === "OPEN" ? "Abertos" : s === "RESOLVED" ? "Resolvidos" : "Descartados"}
          </button>
        ))}
      </div>

      {loading ? <div className="py-8 text-center text-sm text-gray-400">A carregar…</div>
        : items.length === 0 ? <div className="py-8 text-center text-sm text-gray-400">Nenhuma disputa encontrada.</div>
        : (
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <div key={item.id} className="border border-gray-200 rounded-xl p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{item.openedBy.profile?.name ?? item.openedBy.email}</p>
                    <p className="text-xs text-gray-500">{item.openedBy.email}</p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
                <div className="text-xs text-gray-600 flex flex-col gap-0.5">
                  <span>Motivo: <strong>{REASON_MAP[item.reason] ?? item.reason}</strong></span>
                  <span>Viagem: {item.booking.ride.origin} → {item.booking.ride.destination}</span>
                  <span>Valor: €{(item.booking.price * item.booking.seats).toFixed(2)} ({item.booking.seats} lugar{item.booking.seats > 1 ? "es" : ""})</span>
                  {item.details && <span className="italic text-gray-500">{item.details}</span>}
                  <span>{fmtDate(item.createdAt)}</span>
                </div>
                {item.status === "RESOLVED" && item.refundAmount != null && (
                  <p className="text-xs text-green-700 font-semibold">Reembolso: €{item.refundAmount.toFixed(2)}</p>
                )}
                {item.resolution && <p className="text-xs text-gray-500 italic">Resolução: {item.resolution}</p>}
                {item.status === "OPEN" && resolving !== item.id && (
                  <div className="flex gap-2 mt-1">
                    <Button size="sm" className="flex-1" onClick={() => startResolve(item.id, "REFUND")}>Reembolsar</Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => startResolve(item.id, "DISMISS")}>Descartar</Button>
                  </div>
                )}
                {resolving === item.id && (
                  <div className="flex flex-col gap-2 mt-1 border-t border-gray-100 pt-2">
                    <p className="text-xs font-semibold text-gray-700">{action === "REFUND" ? "Reembolsar passageiro" : "Descartar disputa"}</p>
                    {action === "REFUND" && (
                      <input type="number" step="0.01" min="0.01"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                        placeholder="Valor a reembolsar (€)" value={refundAmt} onChange={(e) => setRefundAmt(e.target.value)} />
                    )}
                    <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                      placeholder="Nota de resolução (opcional)" value={resolution} onChange={(e) => setResolution(e.target.value)} />
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => { setResolving(null); setAction(null); }}>Cancelar</Button>
                      <Button size="sm" className="flex-1" disabled={acting === item.id || (action === "REFUND" && !refundAmt)} onClick={() => submitResolve(item.id)}>Confirmar</Button>
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

// ── Verifications Tab ─────────────────────────────────────────────────────────

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
    } catch { setItems([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function approve(id: string) {
    setActing(id);
    try { await apiRequest(`/admin/users/${id}/verify`, { method: "PATCH" }); await load(); } finally { setActing(null); }
  }

  async function reject(id: string) {
    setActing(id);
    try { await apiRequest(`/admin/users/${id}/verify/reject`, { method: "POST" }); await load(); } finally { setActing(null); }
  }

  const DOC_TYPE: Record<string, string> = { cc: "Cartão de Cidadão", passport: "Passaporte", driving_license: "Carta de Condução" };

  return (
    <div className="flex flex-col gap-4">
      {loading ? <div className="py-8 text-center text-sm text-gray-400">A carregar…</div>
        : items.length === 0 ? <div className="py-8 text-center text-sm text-gray-400">Nenhuma verificação pendente.</div>
        : (
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
                  <span>Tipo: <strong>{DOC_TYPE[item.identityDocumentType ?? ""] ?? item.identityDocumentType ?? "-"}</strong></span>
                  <span>{fmtDate(item.createdAt)}</span>
                </div>
                {item.identityDocumentUrl && (
                  <button className="w-full rounded-lg overflow-hidden border border-gray-200 bg-gray-50 hover:opacity-80 transition"
                    onClick={() => setImgOpen(item.identityDocumentUrl!)}>
                    <img src={item.identityDocumentUrl} alt="Documento" className="w-full max-h-40 object-contain" />
                    <p className="text-xs text-gray-500 py-1">Clica para ampliar</p>
                  </button>
                )}
                <div className="flex gap-2 mt-1">
                  <Button size="sm" className="flex-1" disabled={acting === item.id} onClick={() => approve(item.id)}>Aprovar</Button>
                  <Button size="sm" variant="outline" className="flex-1" disabled={acting === item.id} onClick={() => reject(item.id)}>Rejeitar</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      {imgOpen && (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4" onClick={() => setImgOpen(null)}>
          <img src={imgOpen} alt="Documento" className="max-w-full max-h-full rounded-xl" />
        </div>
      )}
    </div>
  );
}

// ── Driver Licenses Tab ───────────────────────────────────────────────────────

function DriverLicensesTab() {
  const [items, setItems] = useState<PendingDriverLicense[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [imgOpen, setImgOpen] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest<PendingDriverLicense[]>("/admin/driver-licenses/pending");
      setItems(data);
    } catch { setItems([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function approve(id: string) {
    setActing(id);
    try { await apiRequest(`/admin/users/${id}/driver-license/approve`, { method: "PATCH" }); await load(); } finally { setActing(null); }
  }

  async function reject(id: string) {
    setActing(id);
    try {
      await apiRequest(`/admin/users/${id}/driver-license/reject`, { method: "PATCH", body: JSON.stringify({ adminNote: rejectNote || undefined }) });
      await load();
    } finally { setActing(null); setRejectFor(null); setRejectNote(""); }
  }

  return (
    <div className="flex flex-col gap-4">
      {loading ? <div className="py-8 text-center text-sm text-gray-400">A carregar…</div>
        : items.length === 0 ? <div className="py-8 text-center text-sm text-gray-400">Nenhuma carta pendente.</div>
        : (
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <div key={item.id} className="border border-gray-200 rounded-xl p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{item.name ?? item.email}</p>
                    <p className="text-xs text-gray-500">{item.email}</p>
                  </div>
                  <StatusBadge status={item.driverLicenseStatus} />
                </div>
                <div className="text-xs text-gray-600 flex flex-col gap-0.5">
                  {item.driverLicenseCcNumber && (
                    <span>Nº CC declarado: <strong className="font-mono">{item.driverLicenseCcNumber}</strong></span>
                  )}
                  <span>{fmtDate(item.createdAt)}</span>
                </div>
                {item.driverLicenseUrl && (
                  <button className="w-full rounded-lg overflow-hidden border border-gray-200 bg-gray-50 hover:opacity-80 transition"
                    onClick={() => setImgOpen(item.driverLicenseUrl!)}>
                    <img src={item.driverLicenseUrl} alt="Carta de condução" className="w-full max-h-40 object-contain" />
                    <p className="text-xs text-gray-500 py-1">Clica para ampliar</p>
                  </button>
                )}
                {rejectFor !== item.id ? (
                  <div className="flex gap-2 mt-1">
                    <Button size="sm" className="flex-1" disabled={acting === item.id} onClick={() => approve(item.id)}>Aprovar</Button>
                    <Button size="sm" variant="outline" className="flex-1" disabled={acting === item.id} onClick={() => { setRejectFor(item.id); setRejectNote(""); }}>Rejeitar</Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 mt-1 border-t border-gray-100 pt-2">
                    <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                      placeholder="Motivo da rejeição (opcional)" value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} />
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => { setRejectFor(null); setRejectNote(""); }}>Cancelar</Button>
                      <Button size="sm" className="flex-1" disabled={acting === item.id} onClick={() => reject(item.id)}>Confirmar rejeição</Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      {imgOpen && (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4" onClick={() => setImgOpen(null)}>
          <img src={imgOpen} alt="Carta de condução" className="max-w-full max-h-full rounded-xl" />
        </div>
      )}
    </div>
  );
}

// ── AdminPanel ────────────────────────────────────────────────────────────────

type Props = { open: boolean; onClose: () => void };

const TABS: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
  { key: "overview", label: "Visão Geral", icon: <TrendingUp size={14} /> },
  { key: "utilizadores", label: "Utilizadores", icon: <Users size={14} /> },
  { key: "boleias", label: "Boleias", icon: <Car size={14} /> },
  { key: "denuncias", label: "Denúncias", icon: <AlertTriangle size={14} /> },
  { key: "saques", label: "Saques", icon: <CheckCircle size={14} /> },
  { key: "disputas", label: "Disputas", icon: <XCircle size={14} /> },
  { key: "cartas", label: "Cartas", icon: <FileText size={14} /> },
  { key: "identidade", label: "Identidade", icon: <Shield size={14} /> },
];

export default function AdminPanel({ open, onClose }: Props) {
  const [tab, setTab] = useState<AdminTab>("overview");

  return (
    <Sheet open={open} onClose={onClose} title="Painel Admin" height="full">
      {/* Tab bar — scrollable horizontal */}
      <div className="flex gap-1 overflow-x-auto pb-2 -mt-2 mb-3 no-scrollbar border-b border-gray-100">
        {TABS.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0",
              tab === key
                ? "bg-gray-900 text-white"
                : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
            )}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {tab === "overview"      && <OverviewTab />}
      {tab === "utilizadores"  && <UsersTab />}
      {tab === "boleias"       && <RidesTab />}
      {tab === "denuncias"     && <ReportsTab />}
      {tab === "saques"        && <PayoutRequestsTab />}
      {tab === "disputas"      && <DisputesTab />}
      {tab === "cartas"        && <DriverLicensesTab />}
      {tab === "identidade"    && <VerificationsTab />}
    </Sheet>
  );
}
