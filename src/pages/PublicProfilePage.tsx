import { useEffect, useState } from "react";
import { apiRequest } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/Button";

interface PublicProfile {
  id: string;
  isIdentityVerified: boolean;
  memberSince: string;
  profile: { name: string; username?: string; avatarUrl?: string | null; bio?: string | null } | null;
  totalRides: number;
  totalPassengerRides: number;
  avgRating: number | null;
  totalRatings: number;
  reliability: { score: number | null; label: string; totalRides: number; cancelledRides: number };
  vehicles: { id: string; brand: string; model: string; color?: string | null; ridesCount: number }[];
  frequentRoutes: { origin: string; destination: string; count: number }[];
  recentRatings: {
    score: number;
    comment: string | null;
    tags: unknown;
    createdAt: string;
    reviewer: { name: string; avatarUrl: string | null };
  }[];
}

type Props = {
  userId: string;
  onClose: () => void;
};

function relativeDate(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 1) return "hoje";
  if (diffDays === 1) return "ontem";
  if (diffDays < 7) return `há ${diffDays} dias`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffDays < 30) return `há ${diffWeeks} ${diffWeeks === 1 ? "semana" : "semanas"}`;
  const diffMonths = Math.floor(diffDays / 30);
  return `há ${diffMonths} ${diffMonths === 1 ? "mês" : "meses"}`;
}

export default function PublicProfilePage({ userId, onClose }: Props) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<PublicProfile>(`/users/${userId}`)
      .then(setProfile)
      .catch(() => setError("Utilizador não encontrado ou indisponível."))
      .finally(() => setLoading(false));
  }, [userId]);

  function handleShare() {
    const url = `${window.location.origin}/u/${userId}`;
    if (navigator.share) {
      navigator.share({ title: "Perfil HopOn", url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).catch(() => {});
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#1B4332] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center px-6 gap-4">
        <p className="text-sm text-[#414844] text-center">{error ?? "Utilizador indisponível."}</p>
        <Button variant="secondary" onClick={onClose}>Voltar</Button>
      </div>
    );
  }

  const name = profile.profile?.name ?? "Utilizador";
  const avatarUrl = profile.profile?.avatarUrl ?? null;
  const bio = profile.profile?.bio ?? null;
  const isReliable =
    profile.reliability.score !== null &&
    profile.reliability.score >= 95 &&
    profile.reliability.totalRides >= 10;

  const memberSinceFormatted = new Date(profile.memberSince).toLocaleDateString("pt-PT", {
    month: "long",
    year: "numeric",
  });

  const commentsOnly = profile.recentRatings.filter(
    (r) => r.comment !== null && r.comment.trim() !== ""
  );

  const visibleVehicles = profile.vehicles.filter((v) => v.ridesCount > 0);

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col overflow-y-auto">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-[#e7e9e4] sticky top-0 bg-white z-10">
        <button
          className="text-2xl font-bold text-[#1A1C19]"
          onClick={onClose}
          aria-label="Fechar"
        >
          ←
        </button>
        <span className="text-sm font-semibold text-[#1A1C19]">Perfil</span>
        <button
          onClick={handleShare}
          className="ml-auto w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f3f4ef] transition"
          aria-label="Partilhar perfil"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5 text-[#414844]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
        </button>
      </header>

      <div className="flex-1 px-4 py-6 max-w-mobile mx-auto w-full space-y-6">
        {/* Hero */}
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-[#edeee9] flex items-center justify-center text-xl font-bold text-[#414844] shrink-0 overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
            ) : (
              name.slice(0, 2).toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-[#1A1C19]">{name}</h1>
              {profile.isIdentityVerified && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                  Verificado
                </span>
              )}
              {isReliable && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Fiavel
                </span>
              )}
            </div>
            <p className="text-xs text-[#717973] mt-0.5">Membro desde {memberSinceFormatted}</p>
            {bio && <p className="text-sm text-[#414844] mt-1">{bio}</p>}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#f3f4ef] border border-[#e7e9e4] rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-[#1A1C19]">
              {profile.avgRating !== null ? `★ ${profile.avgRating.toFixed(1)}` : "-"}
            </div>
            <div className="text-[10px] text-[#717973] mt-0.5">
              {profile.totalRatings > 0 ? `${profile.totalRatings} aval.` : "Sem aval."}
            </div>
          </div>
          <div className="bg-[#f3f4ef] border border-[#e7e9e4] rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-[#1A1C19]">
              {profile.reliability.score !== null ? `${profile.reliability.score}%` : "-"}
            </div>
            <div className="text-[10px] text-[#717973] mt-0.5">fiabilidade</div>
          </div>
          <div className="bg-[#f3f4ef] border border-[#e7e9e4] rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-[#1A1C19]">{profile.totalRides}</div>
            <div className="text-[10px] text-[#717973] mt-0.5">boleias dadas</div>
          </div>
        </div>

        {/* Vehicles */}
        {visibleVehicles.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-[#717973] uppercase tracking-wide mb-3">
              Viaturas
            </h2>
            <div className="space-y-2">
              {visibleVehicles.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between p-3 bg-[#f3f4ef] rounded-xl border border-[#e7e9e4]"
                >
                  <span className="text-sm font-medium text-[#1A1C19]">
                    {v.brand} {v.model}
                    {v.color ? ` - ${v.color}` : ""}
                  </span>
                  <span className="text-xs text-[#717973]">
                    {v.ridesCount} {v.ridesCount === 1 ? "boleia" : "boleias"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Frequent routes */}
        {profile.frequentRoutes.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-[#717973] uppercase tracking-wide mb-3">
              Rotas habituais
            </h2>
            <div className="space-y-2">
              {profile.frequentRoutes.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-[#f3f4ef] rounded-xl border border-[#e7e9e4]"
                >
                  <span className="text-sm text-[#1A1C19]">
                    {r.origin} - {r.destination}
                  </span>
                  <span className="text-xs text-[#717973]">{r.count}x</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        {commentsOnly.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-[#717973] uppercase tracking-wide mb-3">
              Avaliacoes
            </h2>
            <div className="space-y-3">
              {commentsOnly.slice(0, 5).map((r, i) => (
                <div
                  key={i}
                  className="p-3 bg-[#f3f4ef] rounded-xl border border-[#e7e9e4]"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 rounded-full bg-[#edeee9] flex items-center justify-center text-xs font-bold text-[#414844] shrink-0 overflow-hidden">
                      {r.reviewer.avatarUrl ? (
                        <img
                          src={r.reviewer.avatarUrl}
                          alt={r.reviewer.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        r.reviewer.name.slice(0, 1)
                      )}
                    </div>
                    <span className="text-xs font-semibold text-[#1A1C19]">{r.reviewer.name}</span>
                    <span className="text-xs text-[#717973] ml-auto">{relativeDate(r.createdAt)}</span>
                  </div>
                  <div className="flex gap-0.5 mb-1 text-amber-400 text-sm">
                    {"★".repeat(r.score)}
                    <span className="text-[#c1c8c2]">{"★".repeat(5 - r.score)}</span>
                  </div>
                  <p className="text-sm text-[#414844]">{r.comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA for logged in users */}
        {user && (
          <div className="pt-2">
            <Button className="w-full" onClick={onClose}>
              Reservar boleia
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
