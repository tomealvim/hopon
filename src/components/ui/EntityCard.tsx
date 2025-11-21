import { Card, CardHeader, CardContent, CardFooter } from "./Card";
import { Avatar } from "./Avatar";
import { Badge } from "./Badge";
import { Button } from "./Button";

type Props = {
  title: string;            // p.ex. nome do driver ou destino
  subtitle?: string;        // p.ex. rota/resumo
  meta?: string;            // p.ex. "08:15 • 3 lugares"
  avatar?: { src?: string; initials?: string; };
  badges?: Array<{ label: string; tone?: "neutral" | "brand" | "success" | "warning" | "danger"; }>;
  onPrimary?: () => void;
  onSecondary?: () => void;
  primaryLabel?: string;
  secondaryLabel?: string;
};

export default function EntityCard({
  title, subtitle, meta, avatar, badges,
  onPrimary, onSecondary,
  primaryLabel = "Pedir",
  secondaryLabel = "Detalhes",
}: Props) {
  return (
    <Card interactive>
      <CardHeader>
        <div className="flex items-start gap-3">
          <Avatar size="md" src={avatar?.src} initials={avatar?.initials} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold truncate">{title}</h4>
              <div className="flex gap-1">
                {badges?.map((b, i) => (
                  <Badge key={i} tone={b.tone || "neutral"}>{b.label}</Badge>
                ))}
              </div>
            </div>
            {subtitle && <p className="text-sm text-gray-600 truncate">{subtitle}</p>}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {meta && <p className="text-sm text-gray-700">{meta}</p>}
      </CardContent>
      <CardFooter>
        <div className="flex gap-2">
          {onPrimary && <Button size="sm" onClick={onPrimary}>{primaryLabel}</Button>}
          {onSecondary && <Button size="sm" variant="secondary" onClick={onSecondary}>{secondaryLabel}</Button>}
        </div>
      </CardFooter>
    </Card>
  );
}
