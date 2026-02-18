import { useState } from "react";
import Sheet from "../ui/Sheet";
import { Button } from "../ui/Button";

type SupportContactSheetProps = {
  open: boolean;
  onClose: () => void;
};

const ADDRESS = "Rua Professor Doutor Manuel Eugénio Machado Macedo, Nº 351, Lote 12, Rc-D";
const PHONE = "+351 210 123 456";
const EMAIL = "support@hopon.com";
const INPUT_CLASSES =
  "w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20";

type FeedbackState = "idle" | "success";

export default function SupportContactSheet({ open, onClose }: SupportContactSheetProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>("idle");
  const [isSending, setIsSending] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSending(true);
    setFeedback("idle");

    window.setTimeout(() => {
      setIsSending(false);
      setFeedback("success");
      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
    }, 900);
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Contacta-nos"
      height="lg"
      footer={
        <Button
          block
          variant="outline"
          type="submit"
          form="support-contact-form"
          className="min-h-[48px]"
          loading={isSending}
        >
          Enviar mensagem
        </Button>
      }
    >
      <div className="space-y-4 pr-1 max-h-[65svh] overflow-y-auto">
        <div className="space-y-2 text-sm text-gray-600">
          <p>
            Apoio HopOn para boleias, pagamentos e segurança. Estamos disponíveis todos os dias e respondemos em menos
            de 24h úteis.
          </p>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3 text-center text-sm text-gray-800 space-y-2">
            <p className="font-semibold text-gray-900">{ADDRESS}</p>
            <div className="flex flex-col gap-0.5 text-gray-700">
              <span>{PHONE} (24/7)</span>
              <span>{EMAIL}</span>
            </div>
          </div>
        </div>

        <form id="support-contact-form" className="space-y-3" onSubmit={handleSubmit}>
          <Field label="Nome" htmlFor="support-name">
            <input
              id="support-name"
              type="text"
              required
              value={name}
              onChange={event => setName(event.target.value)}
              placeholder="O teu nome completo"
              className={INPUT_CLASSES}
            />
          </Field>

          <Field label="Email" htmlFor="support-email">
            <input
              id="support-email"
              type="email"
              required
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder="exemplo@host.pt"
              className={INPUT_CLASSES}
            />
          </Field>

          <Field label="Telemóvel" htmlFor="support-phone">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-900">
                <span role="img" aria-label="Portugal" className="text-lg">
                  🇵🇹
                </span>
                <span>+351</span>
              </div>
              <input
                id="support-phone"
                type="tel"
                required
                value={phone}
                onChange={event => setPhone(event.target.value)}
                placeholder="O teu número"
                className={`flex-1 ${INPUT_CLASSES}`}
              />
            </div>
          </Field>

          <Field label="Mensagem" htmlFor="support-message">
            <textarea
              id="support-message"
              required
              rows={3}
              value={message}
              onChange={event => setMessage(event.target.value)}
              placeholder="Explica rapidamente o que precisas."
              className={`${INPUT_CLASSES} resize-none`}
            />
          </Field>

          {feedback === "success" && (
            <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-2xl px-3 py-2" role="status">
              Obrigado! Recebemos a tua mensagem e voltamos a contactar em breve.
            </p>
          )}
        </form>
      </div>
    </Sheet>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}

