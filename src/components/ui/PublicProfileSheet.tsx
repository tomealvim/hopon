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

function Stars({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) {
  const dim = size === "lg" ? "w-5 h-5" : size === "sm" ? "w-3 h-3" : "w-4 h-4";
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          className={`${dim} ${s <= score ? "text-yellow-400" : "text-[#c1c8c2]"}`}
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
  vehicle?: { brand: string; model: string; color?: string } | null;
}

export default function PublicProfileSheet({ userId, open, onClose, vehicle }: Props) {
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
    <Sheet open={open} onClose={onClose} title="Perfil" height="lg" footer={null}>
      {loading && (
        <div className="flex items-center justify-center py-16 text-sm text-[#717973]">
          A carregar...
        </div>
      )}

      {!loading && !profile && (
        <div className="flex items-center justify-center py-16 text-sm text-[#717973]">
          Perfil nao encontrado.
        </div>
      )}

      {!loading && profile && (() => {
        const yearsActive = Math.max(1, new Date().getFullYear() - new Date(profile.memberSince).getFullYear());

        return (
          <div className="pb-6">
            {/* Avatar + nome centrado */}
            <div className="flex flex-col items-center pt-2 pb-5">
              {profile.profile?.avatarUrl ? (
                <img
                  src={profile.profile.avatarUrl}
                  alt={name}
                  className="w-20 h-20 rounded-full object-cover shadow-md ring-2 ring-[#D0E8DC] mb-3"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-[#1B4332] flex items-center justify-center text-2xl font-bold text-white mb-3 shadow-md">
                  {initials}
                </div>
              )}
              <h2 className="font-headline font-bold text-[#1A1C19] text-xl mb-0.5">{name}</h2>
              {profile.profile?.username && (
                <p className="text-xs text-[#717973] mb-1">@{profile.profile.username}</p>
              )}
              <div className="flex items-center gap-2 mt-1">
                {profile.avgRating != null ? (
                  <>
                    <Stars score={Math.round(profile.avgRating)} size="lg" />
                    <span className="font-bold text-[#1A1C19] text-base">{profile.avgRating.toFixed(1)}</span>
                    <span className="text-xs text-[#717973]">({profile.totalRatings} avaliacoes)</span>
                  </>
                ) : (
                  <span className="text-xs text-[#717973]">Sem avaliacoes</span>
                )}
              </div>
              {profile.isIdentityVerified && (
                <span className="mt-2 text-xs bg-green-100 text-green-700 border border-green-200 rounded-full px-3 py-0.5">
                  Identidade verificada
                </span>
              )}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              <div className="flex flex-col items-center bg-[#f3f4ef] rounded-2xl p-3">
                <span className="text-lg font-bold text-[#1A1C19]">{profile.totalRides}</span>
                <span className="text-[10px] text-[#717973] text-center mt-0.5 leading-tight">Boleias oferecidas</span>
              </div>
              <div className="flex flex-col items-center bg-[#f3f4ef] rounded-2xl p-3">
                <span className="text-lg font-bold text-[#1A1C19]">{yearsActive}</span>
                <span className="text-[10px] text-[#717973] text-center mt-0.5 leading-tight">
                  {yearsActive === 1 ? "Ano ativo" : "Anos ativo"}
                </span>
              </div>
              <div className="flex flex-col items-center bg-[#f3f4ef] rounded-2xl p-3">
                <span className="text-lg font-bold text-[#1A1C19]">
                  {profile.avgRating != null ? profile.avgRating.toFixed(1) : "-"}
                </span>
                <span className="text-[10px] text-[#717973] text-center mt-0.5 leading-tight">Avaliacao media</span>
              </div>
            </div>

            {/* Bio */}
            {profile.profile?.bio && (
              <p className="text-sm text-[#414844] bg-[#f3f4ef] rounded-2xl px-4 py-3 mb-5">
                {profile.profile.bio}
              </p>
            )}

            {/* Fiabilidade */}
            {profile.reliability && (
              <div className="rounded-2xl border border-[#e7e9e4] bg-[#f3f4ef] px-4 py-3 mb-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[#717973] uppercase tracking-wide">Fiabilidade (30 dias)</span>
                  <span className={
                    profile.reliability.score === null ? "text-xs text-[#717973]" :
                    profile.reliability.score >= 95 ? "text-xs font-bold text-emerald-600" :
                    profile.reliability.score >= 80 ? "text-xs font-bold text-blue-600" :
                    "text-xs font-bold text-amber-600"
                  }>
                    {profile.reliability.score !== null ? `${profile.reliability.score}%` : "-"} - {profile.reliability.label}
                  </span>
                </div>
                {profile.reliability.score !== null && (
                  <div className="h-2 bg-[#edeee9] rounded-full overflow-hidden mb-1.5">
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
                <p className="text-[10px] text-[#717973]">
                  {profile.reliability.totalRides} viagens - {profile.reliability.cancelledRides} canceladas
                </p>
              </div>
            )}

            {/* Info chips */}
            <div className="flex flex-wrap gap-2 mb-5">
              <span className="text-xs bg-[#f3f4ef] text-[#414844] rounded-full px-3 py-1.5">
                Anos ativo: {yearsActive}
              </span>
              <span className={`text-xs rounded-full px-3 py-1.5 ${profile.isIdentityVerified ? "bg-green-50 text-green-700" : "bg-[#f3f4ef] text-[#717973]"}`}>
                Identidade: {profile.isIdentityVerified ? "Concluida" : "Pendente"}
              </span>
              {vehicle && (
                <span className="text-xs bg-[#f3f4ef] text-[#414844] rounded-full px-3 py-1.5">
                  Carro: {vehicle.brand} {vehicle.model}{vehicle.color ? ` ${vehicle.color}` : ""}
                </span>
              )}
            </div>

            {/* Avaliações recentes */}
            {profile.recentRatings.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-[#717973] uppercase tracking-wide mb-3">Avaliacoes recentes</h3>
                <div className="grid gap-2">
                  {profile.recentRatings.slice(0, 5).map((r, i) => (
                    <div key={i} className="bg-[#f3f4ef] rounded-2xl px-4 py-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {r.reviewer.avatarUrl ? (
                            <img src={r.reviewer.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-[#c1c8c2] flex items-center justify-center text-[10px] font-bold text-[#414844] shrink-0">
                              {r.reviewer.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span className="text-xs font-medium text-[#414844]">{r.reviewer.name}</span>
                        </div>
                        <Stars score={r.score} size="sm" />
                      </div>
                      {r.comment && (
                        <p className="text-xs text-[#414844] mt-1">{r.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </Sheet>
  );
}
