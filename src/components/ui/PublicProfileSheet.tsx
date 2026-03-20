import { useEffect, useState } from "react";
import { apiRequest } from "../../services/api";
import Sheet from "./Sheet";

interface PublicProfile {
  id: string;
  isIdentityVerified: boolean;
  memberSince: string;
  profile: {
    name: string;
    username?: string | null;
    avatarUrl?: string | null;
    bio?: string | null;
  } | null;
  totalRides: number;
  avgRating: number | null;
  totalRatings: number;
  reliability?: { score: number | null; label: string; totalRides: number; cancelledRides: number } | null;
  recentRatings: {
    score: number;
    comment: string | null;
    createdAt: string;
    reviewer: { name: string; avatarUrl: string | null };
  }[];
}

function Stars({ score }: { score: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          className={`w-4 h-4 ${s <= score ? "text-yellow-400" : "text-gray-200"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.449a1 1 0 00-.364 1.118l1.287 3.957c.3.92-.755 1.688-1.54 1.118L10 15.347l-3.95 2.879c-.784.57-1.838-.197-1.539-1.118l1.286-3.957a1 1 0 00-.364-1.118L2.064 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.05 2.927z" />
        </svg>
      ))}
    </span>
  );
}

interface Props {
  userId: string | null;
  open: boolean;
  onClose: () => void;
  zIndex?: number;
}

export default function PublicProfileSheet({ userId, open, onClose, zIndex }: Props) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId || !open) return;
    setProfile(null);
    setLoading(true);
    apiRequest<PublicProfile>(`/users/${userId}`)
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [userId, open]);

  const name = profile?.profile?.name ?? "Utilizador";
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <Sheet open={open} onClose={onClose} title="Perfil" height="lg" footer={null} zIndex={zIndex}>
      {loading && (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          A carregar…
        </div>
      )}

      {!loading && !profile && (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          Perfil não encontrado.
        </div>
      )}

      {!loading && profile && (
        <div className="grid gap-5 p-1 pb-6">
          {/* Avatar + nome */}
          <div className="flex items-center gap-4">
            {profile.profile?.avatarUrl ? (
              <img
                src={profile.profile.avatarUrl}
                alt={name}
                className="w-16 h-16 rounded-full object-cover shadow"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-900 flex items-center justify-center text-xl font-bold text-white">
                {initials}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-semibold text-gray-900">{name}</h2>
                {profile.isIdentityVerified && (
                  <span className="text-xs bg-green-100 text-green-700 border border-green-200 rounded-full px-2 py-0.5">
                    Verificado
                  </span>
                )}
              </div>
              {profile.profile?.username && (
                <div className="text-xs text-gray-500">@{profile.profile.username}</div>
              )}
              <div className="text-xs text-gray-400 mt-0.5">
                Membro desde {new Date(profile.memberSince).toLocaleDateString("pt-PT", { month: "long", year: "numeric" })}
              </div>
            </div>
          </div>

          {/* Bio */}
          {profile.profile?.bio && (
            <p className="text-sm text-gray-600 bg-gray-50 rounded-xl px-4 py-3">
              {profile.profile.bio}
            </p>
          )}

          {/* Estatísticas */}
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center bg-gray-50 rounded-xl p-3">
              <span className="text-lg font-bold text-gray-900">{profile.totalRides}</span>
              <span className="text-[10px] text-gray-500 text-center mt-0.5">Boleias oferecidas</span>
            </div>
            <div className="flex flex-col items-center bg-gray-50 rounded-xl p-3">
              <span className="text-lg font-bold text-gray-900">
                {profile.avgRating != null ? profile.avgRating.toFixed(1) : "—"}
              </span>
              <span className="text-[10px] text-gray-500 text-center mt-0.5">Avaliação média</span>
            </div>
            <div className="flex flex-col items-center bg-gray-50 rounded-xl p-3">
              <span className="text-lg font-bold text-gray-900">{profile.totalRatings}</span>
              <span className="text-[10px] text-gray-500 text-center mt-0.5">Avaliações</span>
            </div>
          </div>

          {/* Fiabilidade */}
          {profile.reliability && (
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fiabilidade (30 dias)</span>
                <span className={
                  profile.reliability.score === null ? "text-xs text-gray-400" :
                  profile.reliability.score >= 95 ? "text-xs font-bold text-emerald-600" :
                  profile.reliability.score >= 80 ? "text-xs font-bold text-blue-600" :
                  "text-xs font-bold text-amber-600"
                }>
                  {profile.reliability.score !== null ? `${profile.reliability.score}%` : "—"} · {profile.reliability.label}
                </span>
              </div>
              {profile.reliability.score !== null && (
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={
                      profile.reliability.score >= 95 ? "h-full bg-emerald-500 rounded-full" :
                      profile.reliability.score >= 80 ? "h-full bg-blue-500 rounded-full" :
                      "h-full bg-amber-500 rounded-full"
                    }
                    style={{ width: `${profile.reliability.score}%` }}
                  />
                </div>
              )}
              <p className="text-[10px] text-gray-400 mt-1">
                {profile.reliability.totalRides} viagens · {profile.reliability.cancelledRides} canceladas
              </p>
            </div>
          )}

          {/* Avaliações recentes */}
          {profile.recentRatings.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Avaliações recentes</h3>
              <div className="grid gap-2">
                {profile.recentRatings.slice(0, 5).map((r, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-700">{r.reviewer.name}</span>
                      </div>
                      <Stars score={r.score} />
                    </div>
                    {r.comment && (
                      <p className="text-xs text-gray-600">{r.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}
