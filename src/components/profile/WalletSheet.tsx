import { useCallback, useEffect, useMemo, useState } from "react";
import Sheet from "../ui/Sheet";
import { Button } from "../ui/Button";
import { cn } from "../../utils/cn";
import { apiRequest } from "../../services/api";

type WalletSheetProps = {
  open: boolean;
  onClose: () => void;
};

type WalletView = "list" | "add" | "success" | "history";
type AddMode = "credit" | "debit" | "paypal";
type PaymentProvider =
  | "visa"
  | "mastercard"
  | "paypal"
  | "mbway"
  | "cash"
  | "applepay";

type PaymentMethod = {
  id: string;
  provider: PaymentProvider;
  masked: string;
  expires?: string;
  description?: string;
};

type AddMethodForm = {
  provider: PaymentProvider;
  holder: string;
  account: string;
  email: string;
  expires: string;
};

type WalletTransaction = {
  id: string;
  type: "CREDIT" | "DEBIT" | "REFUND" | "PAYOUT";
  amount: number;
  description: string | null;
  reference: string | null;
  createdAt: string;
};

const PROVIDER_META: Record<PaymentProvider, { label: string; badge: string }> = {
  visa:       { label: "Visa",       badge: "bg-[#1A1F71] text-white" },
  mastercard: { label: "Mastercard", badge: "bg-gradient-to-r from-[#EB001B] to-[#F79E1B] text-white" },
  paypal:     { label: "PayPal",     badge: "bg-[#003087] text-white" },
  mbway:      { label: "MB Way",     badge: "bg-gray-700 text-white" },
  cash:       { label: "Dinheiro",   badge: "bg-gray-700 text-white" },
  applepay:   { label: "Apple Pay",  badge: "bg-gray-700 text-white" },
};

const QUICK_METHODS: PaymentMethod[] = [
  { id: "apple-pay",     provider: "applepay", masked: "Ligado ao Apple Wallet", description: "Disponível em iPhone e Apple Watch" },
  { id: "mbway-default", provider: "mbway",    masked: "+351 ••• ••• •••",        description: "MB WAY instantâneo" },
];

const EMPTY_FORM: AddMethodForm = { provider: "visa", holder: "", account: "", email: "", expires: "" };

const TX_META: Record<WalletTransaction["type"], { label: string; color: string; sign: string }> = {
  CREDIT: { label: "Carregamento", color: "text-emerald-600", sign: "+" },
  DEBIT:  { label: "Pagamento",    color: "text-red-500",     sign: "−" },
  REFUND: { label: "Reembolso",    color: "text-blue-500",    sign: "+" },
  PAYOUT: { label: "Levantamento", color: "text-orange-500",  sign: "−" },
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });
}

export default function WalletSheet({ open, onClose }: WalletSheetProps) {
  const [view, setView]                         = useState<WalletView>("list");
  const [addMode, setAddMode]                   = useState<AddMode>("credit");
  const [amount, setAmount]                     = useState("");
  const [methods, setMethods]                   = useState<PaymentMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState(QUICK_METHODS[0]?.id ?? "");
  const [newMethod, setNewMethod]               = useState<AddMethodForm>(EMPTY_FORM);
  const [formError, setFormError]               = useState("");

  const [balance, setBalance]               = useState<number | null>(null);
  const [transactions, setTransactions]     = useState<WalletTransaction[]>([]);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [submitting, setSubmitting]         = useState(false);
  const [topupError, setTopupError]         = useState("");

  const fetchWallet = useCallback(async () => {
    setLoadingBalance(true);
    try {
      const data = await apiRequest<{ balance: number; currency: string; transactions: WalletTransaction[] }>(
        "/wallet/transactions",
      );
      setBalance(data.balance);
      setTransactions(data.transactions);
    } catch {
      setBalance(0);
    } finally {
      setLoadingBalance(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchWallet();
    } else {
      setView("list");
      setAddMode("credit");
      setAmount("");
      setNewMethod(EMPTY_FORM);
      setFormError("");
      setTopupError("");
    }
  }, [open, fetchWallet]);

  const selectableMethods = useMemo(() => [...QUICK_METHODS, ...methods], [methods]);
  const selectedMethod    = selectableMethods.find((m) => m.id === selectedMethodId);
  const parsedAmount      = parseFloat(amount.replace(",", ".").replace(/[^\d.]/g, "")) || 0;
  const canConfirm        = !!selectedMethod && parsedAmount > 0 && parsedAmount <= 500;

  async function handleConfirm() {
    if (!canConfirm) return;
    setSubmitting(true);
    setTopupError("");
    try {
      const data = await apiRequest<{ balance: number; transaction: WalletTransaction }>(
        "/wallet/topup",
        { method: "POST", body: JSON.stringify({ amount: parsedAmount }) },
      );
      setBalance(data.balance);
      setTransactions((prev) => [data.transaction, ...prev]);
      setView("success");
    } catch (err) {
      setTopupError(err instanceof Error ? err.message : "Erro ao carregar saldo.");
    } finally {
      setSubmitting(false);
    }
  }

  function openAddForm() {
    setAddMode("credit");
    setNewMethod({ ...EMPTY_FORM, provider: "visa" });
    setFormError("");
    setView("add");
  }

  function handleSaveMethod(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const isCardMode = addMode !== "paypal";
    if (!newMethod.holder.trim()) { setFormError("Indica o titular do método."); return; }
    if (isCardMode && newMethod.account.trim().length < 4) { setFormError("Número inválido."); return; }
    if (!isCardMode && !validateEmail(newMethod.email)) { setFormError("E-mail inválido."); return; }

    const nextMethod: PaymentMethod = {
      id: `${newMethod.provider}-${Date.now()}`,
      provider: newMethod.provider,
      masked: buildMaskedLabel(newMethod),
      expires: isCardMode && newMethod.expires ? newMethod.expires : undefined,
      description: !isCardMode ? newMethod.email : undefined,
    };
    setMethods((prev) => [nextMethod, ...prev]);
    setSelectedMethodId(nextMethod.id);
    setNewMethod(EMPTY_FORM);
    setFormError("");
    setView("list");
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={view === "history" ? "Histórico de transações" : "Carteira"}
      height="lg"
      footer={
        view === "list" ? (
          <div className="space-y-2">
            {topupError && <p className="text-xs text-red-500 text-center">{topupError}</p>}
            <Button block variant="outline" className="min-h-[48px]" disabled={!canConfirm || submitting} onClick={handleConfirm}>
              {submitting ? "A processar…" : "Confirmar carregamento"}
            </Button>
          </div>
        ) : view === "add" ? (
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => { setView("list"); setFormError(""); }}>Cancelar</Button>
            <Button type="submit" form="wallet-add-method-form" variant="outline" className="flex-1">Guardar método</Button>
          </div>
        ) : view === "success" ? (
          <Button variant="outline" className="min-h-[48px] w-full" onClick={() => { setAmount(""); setView("list"); onClose(); }}>
            Voltar ao perfil
          </Button>
        ) : (
          <Button variant="outline" className="min-h-[48px] w-full" onClick={() => setView("list")}>Voltar</Button>
        )
      }
    >
      <div className="space-y-6">

        {/* ── VISTA PRINCIPAL ── */}
        {view === "list" && (
          <>
            <section className="rounded-3xl border border-gray-200 bg-gray-50 p-5">
              <p className="text-sm text-gray-600">Hopon Cash</p>
              {loadingBalance
                ? <div className="mt-1 h-9 w-28 animate-pulse rounded-lg bg-gray-200" />
                : <p className="text-3xl font-bold text-gray-900">{formatCurrency(balance ?? 0)}</p>
              }
              {transactions.length > 0 && (
                <button type="button" className="mt-2 text-xs font-semibold text-primary underline-offset-2 hover:underline" onClick={() => setView("history")}>
                  Ver histórico ({transactions.length})
                </button>
              )}
            </section>

            <div className="space-y-2">
              <label htmlFor="wallet-amount" className="text-xs font-semibold uppercase text-gray-600">Valor a carregar</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">€</span>
                <input
                  id="wallet-amount"
                  inputMode="decimal"
                  placeholder="Ex.: 25"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value.replace(/[^\d.,]/g, "")); setTopupError(""); }}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-10 py-3 text-lg font-semibold text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20 placeholder:text-gray-400"
                />
              </div>
              {parsedAmount > 500 && <p className="text-xs text-red-500">Máximo €500 por carregamento.</p>}
            </div>

            <section>
              <p className="mb-3 text-sm font-semibold text-gray-800">Seleciona o método</p>
              <div className="space-y-3">
                {selectableMethods.map((method) => (
                  <button key={method.id} type="button" onClick={() => setSelectedMethodId(method.id)} aria-pressed={selectedMethodId === method.id}
                    className={cn("flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition",
                      selectedMethodId === method.id ? "border-gray-800 bg-gray-100 shadow-md" : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100")}>
                    <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xs font-semibold uppercase", PROVIDER_META[method.provider].badge)} aria-hidden>
                      {PROVIDER_META[method.provider].label.slice(0, 3)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{PROVIDER_META[method.provider].label}</p>
                      <p className="text-sm text-gray-600">{method.masked}</p>
                      {method.description && <p className="text-xs text-gray-500">{method.description}</p>}
                    </div>
                    <div className="text-xs text-gray-500 shrink-0">{method.expires ? `Expira ${method.expires}` : "Ativo"}</div>
                  </button>
                ))}
              </div>
              <button type="button" onClick={openAddForm} className="mt-4 w-full rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-100 transition">
                Adicionar método
              </button>
            </section>
          </>
        )}

        {/* ── HISTÓRICO ── */}
        {view === "history" && (
          <section className="space-y-2">
            {transactions.length === 0
              ? <p className="py-10 text-center text-sm text-gray-500">Sem transações ainda.</p>
              : transactions.map((tx) => {
                  const meta = TX_META[tx.type] ?? TX_META.CREDIT;
                  return (
                    <div key={tx.id} className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold border border-gray-100 bg-white", meta.color)}>
                        {meta.sign}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{tx.description ?? meta.label}</p>
                        <p className="text-xs text-gray-500">{formatDate(tx.createdAt)}</p>
                      </div>
                      <p className={cn("text-sm font-bold shrink-0", meta.color)}>
                        {meta.sign}{formatCurrency(tx.amount)}
                      </p>
                    </div>
                  );
                })
            }
          </section>
        )}

        {/* ── ADICIONAR MÉTODO ── */}
        {view === "add" && (
          <form id="wallet-add-method-form" className="space-y-5" onSubmit={handleSaveMethod}>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-gray-600">Tipo de método</p>
              <div className="grid grid-cols-3 gap-2">
                {(["credit", "debit", "paypal"] as AddMode[]).map((mode) => (
                  <button key={mode} type="button"
                    onClick={() => { setAddMode(mode); setNewMethod((p) => ({ ...p, provider: mode === "paypal" ? "paypal" : p.provider === "paypal" ? "visa" : p.provider })); setFormError(""); }}
                    className={cn("rounded-2xl border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition",
                      addMode === mode ? "border-gray-800 bg-gray-800 text-white" : "border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-gray-100")}>
                    {mode === "credit" ? "Crédito" : mode === "debit" ? "Débito" : "PayPal"}
                  </button>
                ))}
              </div>
            </div>
            {addMode !== "paypal" && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-gray-600">Bandeira</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["visa", "mastercard"] as PaymentProvider[]).map((brand) => (
                    <button key={brand} type="button" onClick={() => setNewMethod((p) => ({ ...p, provider: brand }))}
                      className={cn("rounded-2xl border px-4 py-3 text-sm font-semibold transition",
                        newMethod.provider === brand ? "border-gray-800 bg-gray-100 text-gray-900" : "border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-gray-100")}>
                      {PROVIDER_META[brand].label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="wallet-holder" className="text-xs font-semibold uppercase text-gray-600">Titular</label>
              <input id="wallet-holder" value={newMethod.holder} onChange={(e) => setNewMethod((p) => ({ ...p, holder: e.target.value }))} placeholder="Nome completo"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20" />
            </div>
            {addMode !== "paypal" ? (
              <>
                <div className="space-y-2">
                  <label htmlFor="wallet-account" className="text-xs font-semibold uppercase text-gray-600">Número do cartão</label>
                  <input id="wallet-account" inputMode="numeric" value={newMethod.account}
                    onChange={(e) => setNewMethod((p) => ({ ...p, account: e.target.value.replace(/[^\d]/g, "") }))} placeholder="0000 0000 0000 0000"
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="wallet-expiry" className="text-xs font-semibold uppercase text-gray-600">Validade (MM/AA)</label>
                  <input id="wallet-expiry" value={newMethod.expires} onChange={(e) => setNewMethod((p) => ({ ...p, expires: e.target.value }))} placeholder="12/26"
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20" />
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <label htmlFor="wallet-email" className="text-xs font-semibold uppercase text-gray-600">E-mail / Telemóvel</label>
                <input id="wallet-email" value={newMethod.email} onChange={(e) => setNewMethod((p) => ({ ...p, email: e.target.value }))} placeholder="exemplo@mail.com"
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20" />
              </div>
            )}
            {formError && <p className="text-sm font-medium text-red-600">{formError}</p>}
          </form>
        )}

        {/* ── SUCESSO ── */}
        {view === "success" && (
          <div className="flex flex-col items-center gap-6 py-12 text-center">
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <p className="mt-4 text-lg font-semibold text-gray-900">Hopon Cash atualizado</p>
              <p className="text-sm text-gray-600">Saldo disponível imediatamente.</p>
              <p className="mt-4 text-3xl font-bold text-gray-900">{formatCurrency(balance ?? 0)}</p>
            </div>
            <button type="button" className="text-sm font-semibold text-primary underline-offset-2 hover:underline" onClick={() => setView("list")}>
              Fazer novo carregamento
            </button>
          </div>
        )}

      </div>
    </Sheet>
  );
}

function buildMaskedLabel(method: AddMethodForm) {
  if (method.provider === "cash") return "Saldo físico";
  if (method.provider === "visa" || method.provider === "mastercard") {
    return `**** **** **** ${method.account.slice(-4) || "0000"}`;
  }
  return method.email || "Conta digital";
}

function validateEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
