import { useEffect, useMemo, useState } from "react";
import Sheet from "../ui/Sheet";
import { Button } from "../ui/Button";
import { cn } from "../../utils/cn";

type WalletSheetProps = {
  open: boolean;
  onClose: () => void;
};

type WalletView = "list" | "add" | "success";
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

const PROVIDER_META: Record<PaymentProvider, { label: string; badge: string }> = {
  visa: {
    label: "Visa",
    badge: "bg-[#1A1F71] text-white",
  },
  mastercard: {
    label: "Mastercard",
    badge: "bg-gradient-to-r from-[#EB001B] to-[#F79E1B] text-white",
  },
  paypal: {
    label: "PayPal",
    badge: "bg-[#003087] text-white",
  },
  mbway: {
    label: "MB Way",
    badge: "bg-black text-white",
  },
  cash: {
    label: "Dinheiro",
    badge: "bg-gray-800 text-white",
  },
  applepay: {
    label: "Apple Pay",
    badge: "bg-black text-white",
  },
};

const QUICK_METHODS: PaymentMethod[] = [
  {
    id: "apple-pay",
    provider: "applepay",
    masked: "Ligado ao Apple Wallet",
    description: "Disponível em iPhone e Apple Watch",
  },
  {
    id: "mbway-default",
    provider: "mbway",
    masked: "+351 ••• ••• •••",
    description: "MB WAY instantâneo",
  },
];

const DEFAULT_METHODS: PaymentMethod[] = [];

const EMPTY_FORM: AddMethodForm = {
  provider: "visa",
  holder: "",
  account: "",
  email: "",
  expires: "",
};

export default function WalletSheet({ open, onClose }: WalletSheetProps) {
  const [view, setView] = useState<WalletView>("list");
  const [addMode, setAddMode] = useState<AddMode>("credit");
  const [amount, setAmount] = useState("");
  const [methods, setMethods] = useState<PaymentMethod[]>(DEFAULT_METHODS);
  const [selectedMethodId, setSelectedMethodId] = useState(
    QUICK_METHODS[0]?.id ?? "",
  );
  const [newMethod, setNewMethod] = useState<AddMethodForm>(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!open) {
      setView("list");
      setAddMode("credit");
      setAmount("");
      setNewMethod(EMPTY_FORM);
      setFormError("");
    }
  }, [open]);

  const selectableMethods = useMemo(
    () => [...QUICK_METHODS, ...methods],
    [methods],
  );
  const selectedMethod = selectableMethods.find(
    (method) => method.id === selectedMethodId,
  );

  const canConfirm =
    !!selectedMethod &&
    parseFloat(amount.replace(",", ".").replace(/[^\d.]/g, "")) > 0;

  function handleConfirm() {
    if (!canConfirm) return;
    setView("success");
  }

  function openAddForm() {
    setAddMode("credit");
    setNewMethod({ ...EMPTY_FORM, provider: "visa" });
    setFormError("");
    setView("add");
  }

  function handleSaveMethod(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const providerMeta = PROVIDER_META[newMethod.provider];
    if (!providerMeta) return;

    const isCardMode = addMode !== "paypal";
    const needsAccount = isCardMode;
    const needsEmail = addMode === "paypal";

    if (!newMethod.holder.trim()) {
      setFormError("Indica o titular do método.");
      return;
    }
    if (needsAccount && newMethod.account.trim().length < 4) {
      setFormError("Número inválido. Confirma os últimos dígitos.");
      return;
    }
    if (needsEmail && !validateEmail(newMethod.email)) {
      setFormError("E-mail inválido. Verifica o formato.");
      return;
    }

    const nextMethod: PaymentMethod = {
      id: `${newMethod.provider}-${Date.now()}`,
      provider: newMethod.provider,
      masked: buildMaskedLabel(newMethod),
      expires:
        needsAccount && newMethod.expires ? newMethod.expires : undefined,
      description: needsEmail ? newMethod.email : undefined,
    };

    setMethods((prev) => [nextMethod, ...prev]);
    setSelectedMethodId(nextMethod.id);
    setNewMethod(EMPTY_FORM);
    setFormError("");
    setView("list");
  }

  function handleSuccessClose() {
    setAmount("");
    setView("list");
    onClose();
  }

  function formattedAmount() {
    const numeric = parseFloat(
      amount.replace(/\./g, "").replace(",", ".") || "0",
    );
    if (Number.isNaN(numeric)) return "€0,00";
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
    }).format(numeric);
  }

  return (
    <Sheet open={open} onClose={onClose} title="Carteira" height="lg">
      <div className="space-y-6 pb-28">
        {view === "list" && (
          <>
            <section className="rounded-3xl border border-gray-200 bg-gray-50 p-5">
              <p className="text-sm text-gray-500">Hopon Cash</p>
              <p className="text-3xl font-bold text-gray-900">€0,00</p>
            </section>

            <div className="space-y-2">
              <label
                htmlFor="wallet-amount"
                className="text-xs font-semibold uppercase text-gray-500"
              >
                Valor a carregar
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                  €
                </span>
                <input
                  id="wallet-amount"
                  inputMode="decimal"
                  placeholder="Ex.: 25"
                  value={amount}
                  onChange={(event) =>
                    setAmount(event.target.value.replace(/[^\d.,]/g, ""))
                  }
                  className="w-full rounded-2xl border border-gray-200 bg-white px-10 py-3 text-lg font-semibold text-gray-900 outline-none focus:border-black focus:ring-2 focus:ring-black/10"
                />
              </div>
            </div>

            <section>
              <p className="mb-3 text-sm font-semibold text-gray-600">
                Seleciona o método
              </p>
              <div className="space-y-3">
                {[...QUICK_METHODS, ...methods].map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSelectedMethodId(method.id)}
                    aria-pressed={selectedMethodId === method.id}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition",
                      selectedMethodId === method.id
                        ? "border-black bg-black/5"
                        : "border-gray-200 bg-white hover:border-gray-300",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-xl text-xs font-semibold uppercase",
                        PROVIDER_META[method.provider].badge,
                      )}
                      aria-hidden
                    >
                      {PROVIDER_META[method.provider].label.slice(0, 3)}
                    </div>

                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {PROVIDER_META[method.provider].label}
                      </p>
                      <p className="text-sm text-gray-600">{method.masked}</p>
                      {method.description && (
                        <p className="text-xs text-gray-400">
                          {method.description}
                        </p>
                      )}
                    </div>

                    <div className="text-xs text-gray-500">
                      {method.expires ? `Expira ${method.expires}` : "Ativo"}
                    </div>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={openAddForm}
                className="mt-4 w-full rounded-2xl border border-dashed border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 hover:border-gray-400 hover:bg-gray-50"
              >
                Adicionar método
              </button>
            </section>

            <Button
              className="min-h-[48px]"
              disabled={!canConfirm}
              onClick={handleConfirm}
            >
              Confirmar carregamento
            </Button>
          </>
        )}

        {view === "add" && (
          <form className="space-y-5" onSubmit={handleSaveMethod}>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-gray-500">
                Tipo de método
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(["credit", "debit", "paypal"] as AddMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setAddMode(mode);
                      setNewMethod((prev) => ({
                        ...prev,
                        provider:
                          mode === "paypal"
                            ? "paypal"
                            : prev.provider === "paypal"
                              ? "visa"
                              : prev.provider,
                      }));
                      setFormError("");
                    }}
                    className={cn(
                      "rounded-2xl border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition",
                      addMode === mode
                        ? "border-black bg-black text-white"
                        : "border-gray-200 bg-white hover:border-gray-300",
                    )}
                  >
                    {mode === "credit"
                      ? "Crédito"
                      : mode === "debit"
                        ? "Débito"
                        : "PayPal"}
                  </button>
                ))}
              </div>
            </div>

            {addMode !== "paypal" && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-gray-500">
                  Bandeira do cartão
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(["visa", "mastercard"] as PaymentProvider[]).map((brand) => (
                    <button
                      key={brand}
                      type="button"
                      onClick={() =>
                        setNewMethod((prev) => ({ ...prev, provider: brand }))
                      }
                      className={cn(
                        "rounded-2xl border px-4 py-3 text-sm font-semibold transition",
                        newMethod.provider === brand
                          ? "border-black bg-black text-white"
                          : "border-gray-200 bg-white hover:border-gray-300",
                      )}
                    >
                      {PROVIDER_META[brand].label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label
                htmlFor="wallet-holder"
                className="text-xs font-semibold uppercase text-gray-500"
              >
                Titular
              </label>
              <input
                id="wallet-holder"
                value={newMethod.holder}
                onChange={(event) =>
                  setNewMethod((prev) => ({ ...prev, holder: event.target.value }))
                }
                placeholder="Nome completo"
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10"
              />
            </div>

            {addMode !== "paypal" && (
              <>
                <div className="space-y-2">
                  <label
                    htmlFor="wallet-account"
                    className="text-xs font-semibold uppercase text-gray-500"
                  >
                    Número do cartão
                  </label>
                  <input
                    id="wallet-account"
                    inputMode="numeric"
                    value={newMethod.account}
                    onChange={(event) =>
                      setNewMethod((prev) => ({
                        ...prev,
                        account: event.target.value.replace(/[^\d]/g, ""),
                      }))
                    }
                    placeholder="0000 0000 0000 0000"
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="wallet-expiry"
                    className="text-xs font-semibold uppercase text-gray-500"
                  >
                    Validade (MM/AA)
                  </label>
                  <input
                    id="wallet-expiry"
                    value={newMethod.expires}
                    onChange={(event) =>
                      setNewMethod((prev) => ({
                        ...prev,
                        expires: event.target.value,
                      }))
                    }
                    placeholder="12/26"
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10"
                  />
                </div>
              </>
            )}

            {addMode === "paypal" && (
              <div className="space-y-2">
                <label
                  htmlFor="wallet-email"
                  className="text-xs font-semibold uppercase text-gray-500"
                >
                  E-mail / Telemóvel
                </label>
                <input
                  id="wallet-email"
                  value={newMethod.email}
                  onChange={(event) =>
                    setNewMethod((prev) => ({
                      ...prev,
                      email: event.target.value,
                    }))
                  }
                  placeholder="exemplo@mail.com"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10"
                />
              </div>
            )}

            {formError && (
              <p className="text-sm font-medium text-red-600">{formError}</p>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setView("list");
                  setFormError("");
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1">
                Guardar método
              </Button>
            </div>
          </form>
        )}

        {view === "success" && (
          <div className="flex flex-col items-center gap-6 py-12 text-center">
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <p className="mt-4 text-lg font-semibold text-gray-900">
                Hopon Cash atualizado
              </p>
              <p className="text-sm text-gray-500">
                O saldo ficará disponível em instantes.
              </p>
              <p className="mt-4 text-3xl font-bold text-gray-900">
                {formattedAmount()}
              </p>
            </div>
            <Button className="min-h-[48px] w-full" onClick={handleSuccessClose}>
              Voltar ao perfil
            </Button>
            <button
              type="button"
              className="text-sm font-semibold text-primary underline-offset-2 hover:underline"
              onClick={() => setView("list")}
            >
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
    const lastDigits = method.account.slice(-4) || "0000";
    return `**** **** **** ${lastDigits}`;
  }
  return method.email || "Conta digital";
}

function validateEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

