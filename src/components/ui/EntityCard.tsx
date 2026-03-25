import { Avatar } from "./Avatar";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { cn } from "../../utils/cn";

type Props = {
  title: string;
  subtitle?: string;
  meta?: string;
  avatar?: { src?: string; initials?: string; };
  badges?: Array<{ label: string; tone?: "neutral" | "brand" | "success" | "warning" | "danger"; }>;
  onPrimary?: () => void;
  onSecondary?: () => void;
  onTertiary?: () => void;
  primaryLabel?: string;
  secondaryLabel?: string;
  tertiaryLabel?: string;
};

export default function EntityCard({
  title, subtitle, meta, avatar, badges,
  onPrimary, onSecondary, onTertiary,
  primaryLabel = "Pedir",
  secondaryLabel = "Detalhes",
  tertiaryLabel,
}: Props) {
  // Parse "origin → destination" from title
  const parts = title.split(" → ");
  const hasRoute = parts.length === 2;
  const origin = parts[0] ?? title;
  const destination = parts[1] ?? "";

  // Parse driver name from meta ("Condutor: X")
  const driverName = meta?.replace(/^Condutor:\s*/i, "") ?? "";

  // Parse time from subtitle ("20 mar. 2026, 08:30")
  const timeStr = subtitle?.split(", ").pop() ?? "";

  // Separate price badge from status badges
  const priceBadge = badges?.find(b => b.label.startsWith("€"));
  const otherBadges = badges?.filter(b => !b.label.startsWith("€")) ?? [];

  return (
    <div className={cn(
      "bg-white rounded-3xl border border-[#e7e9e4] shadow-sm overflow-hidden",
      "active:scale-[0.99] transition-all duration-200 animate-fade-in-up"
    )}>
      {/* Header: avatar + nome + preço */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar size="md" src={avatar?.src} initials={avatar?.initials} />
          <div className="min-w-0">
            <p className="font-headline font-bold text-[#1A1C19] text-[15px] leading-tight truncate">
              {driverName || title}
            </p>
            {otherBadges.length > 0 && (
              <div className="flex gap-1 mt-1 flex-wrap">
                {otherBadges.map((b, i) => (
                  <Badge key={i} tone={b.tone || "neutral"}>{b.label}</Badge>
                ))}
              </div>
            )}
          </div>
        </div>
        {priceBadge && (
          <div className="text-right shrink-0 ml-3">
            <p className="font-headline font-extrabold text-[#1B4332] text-xl leading-none">
              {priceBadge.label}
            </p>
            <p className="text-[10px] text-[#717973] uppercase tracking-wide mt-0.5">por lugar</p>
          </div>
        )}
      </div>

      {/* Route visualization */}
      {hasRoute && (
        <div className="px-5 pb-4">
          <div className="bg-[#f3f4ef] rounded-2xl px-4 py-3 flex gap-4">
            <div className="flex flex-col items-center pt-1 shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-[#1B4332]" />
              <div className="route-dotted-line flex-1 my-1" style={{ minHeight: "24px" }} />
              <div className="w-2.5 h-2.5 rounded-full border-2 border-[#52B788] bg-white" />
            </div>
            <div className="flex flex-col justify-between gap-2 min-w-0">
              <div>
                <p className="text-[10px] font-bold text-[#717973] uppercase tracking-wider">
                  Partida{timeStr ? ` - ${timeStr}` : ""}
                </p>
                <p className="font-headline font-semibold text-[#1A1C19] text-sm truncate">{origin}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-[#717973] uppercase tracking-wider">Chegada</p>
                <p className="font-headline font-semibold text-[#1A1C19] text-sm truncate">{destination}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fallback para cards sem rota */}
      {!hasRoute && subtitle && (
        <div className="px-5 pb-3">
          <p className="text-sm text-[#414844]">{subtitle}</p>
        </div>
      )}
      {!hasRoute && meta && (
        <div className="px-5 pb-3">
          <p className="text-sm text-[#717973]">{meta}</p>
        </div>
      )}

      {/* Acoes */}
      {(onPrimary || onSecondary) && (
        <div className="px-5 pb-5 flex gap-2">
          {onSecondary && (
            <Button variant="outline" onClick={onSecondary} className="flex-1">
              {secondaryLabel}
            </Button>
          )}
          {onPrimary && (
            <Button onClick={onPrimary} className="flex-1">
              {primaryLabel}
            </Button>
          )}
        </div>
      )}

      {onTertiary && tertiaryLabel && (
        <div className="px-5 pb-4 -mt-2">
          <button
            onClick={onTertiary}
            className="w-full text-xs text-[#717973] underline underline-offset-2 hover:text-[#1A1C19] transition-colors"
          >
            {tertiaryLabel}
          </button>
        </div>
      )}
    </div>
  );
}
