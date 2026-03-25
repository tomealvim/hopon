import { useState, useEffect } from "react";
import { Button } from "../ui/Button";
import Sheet from "../ui/Sheet";
import { apiRequest } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";

interface ApiRating {
  id: string;
  score: number;
  tags: string[] | null;
  comment: string | null;
  createdAt: string;
  reviewer: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

interface ApiRatingsResponse {
  average: number | null;
  total: number;
  ratings: ApiRating[];
}

interface RatingsSheetProps {
  open: boolean;
  onClose: () => void;
  // Submit mode — when provided, shows the submission form
  bookingId?: string;
  revieweeId?: string;
  revieweeName?: string;
}

export default function RatingsSheet({
  open,
  onClose,
  bookingId,
  revieweeId,
  revieweeName,
}: RatingsSheetProps) {
  const { user } = useAuth();
  const isSubmitMode = !!(bookingId && revieweeId);

  // View mode state
  const [ratingsData, setRatingsData] = useState<ApiRatingsResponse | null>(null);
  const [loadingRatings, setLoadingRatings] = useState(false);

  // Submit mode state
  const [score, setScore] = useState(0);
  const [hoveredScore, setHoveredScore] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load received ratings when in view mode and sheet opens
  useEffect(() => {
    if (!open || isSubmitMode || !user) return;
    setLoadingRatings(true);
    apiRequest<ApiRatingsResponse>(`/ratings/users/${user.id}`)
      .then(setRatingsData)
      .catch(console.error)
      .finally(() => setLoadingRatings(false));
  }, [open, isSubmitMode, user]);

  async function handleSubmit() {
    if (score === 0 || !bookingId || !revieweeId || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiRequest("/ratings", {
        method: "POST",
        body: JSON.stringify({ bookingId, revieweeId, score, comment: comment.trim() || undefined }),
      });
      setShowSuccess(true);
    } catch (err: any) {
      setError(err?.message ?? "Erro ao enviar avaliação");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    if (!showSuccess) {
      setScore(0);
      setComment("");
      setError(null);
    }
    onClose();
  }

  function handleBackHome() {
    setShowSuccess(false);
    setScore(0);
    setComment("");
    setError(null);
    onClose();
  }

  const displayScore = hoveredScore || score;

  const scoreLabels: Record<number, string> = {
    1: "Muito insatisfeito",
    2: "Insatisfeito",
    3: "Neutro",
    4: "Satisfeito",
    5: "Muito satisfeito",
  };

  // ── Success sheet ──────────────────────────────────────────────────────────
  if (showSuccess) {
    return (
      <Sheet open title="" height="md" footer={null} onClose={() => {}}>
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
          <div className="relative mb-6">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-emerald-200 via-emerald-300 to-emerald-400 flex items-center justify-center">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" className="text-emerald-700">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-[#1A1C19] mb-2">Avaliação enviada</h2>
          <p className="text-base text-[#414844] mb-8">Obrigado por partilhares a tua opinião!</p>
          <Button block variant="outline" className="min-h-[48px]" onClick={handleBackHome}>
            Voltar ao início
          </Button>
        </div>
      </Sheet>
    );
  }

  // ── Submit mode ────────────────────────────────────────────────────────────
  if (isSubmitMode) {
    return (
      <Sheet
        open={open}
        onClose={handleClose}
        title={`Avaliar ${revieweeName ?? "utilizador"}`}
        height="lg"
        footer={
          <Button
            block
            variant="outline"
            className="min-h-[48px]"
            onClick={handleSubmit}
            disabled={score === 0 || submitting}
          >
            {submitting ? "A enviar..." : "Enviar avaliação"}
          </Button>
        }
      >
        <div className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-[#1A1C19] mb-3">
              Como avalias a tua experiência?
            </label>
            <div className="flex items-center justify-center gap-3 py-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setScore(star)}
                  onMouseEnter={() => setHoveredScore(star)}
                  onMouseLeave={() => setHoveredScore(0)}
                  className="transition-transform hover:scale-110 active:scale-95"
                  aria-label={`${star} estrela${star > 1 ? "s" : ""}`}
                >
                  <StarIcon filled={star <= displayScore} />
                </button>
              ))}
            </div>
            {score > 0 && (
              <p className="text-center text-sm font-semibold text-[#1A1C19] mt-2">
                {scoreLabels[score]}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1A1C19] mb-2" htmlFor="rating-comment">
              Comentário (opcional)
            </label>
            <textarea
              id="rating-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Partilha a tua experiência..."
              className="w-full h-32 px-4 py-3 bg-[#f3f4ef] border border-[#e7e9e4] rounded-2xl text-[#1A1C19] placeholder:text-[#717973] resize-none focus:outline-none focus:border-[#1B4332] focus:ring-2 focus:ring-[#52B788]/20"
              maxLength={300}
            />
            <p className="text-xs text-[#717973] mt-2">{comment.length}/300 caracteres</p>
          </div>
        </div>
      </Sheet>
    );
  }

  // ── View mode (received ratings) ───────────────────────────────────────────
  return (
    <Sheet open={open} onClose={handleClose} title="As minhas avaliações" height="lg">
      {loadingRatings ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-[#f3f4ef] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : !ratingsData || ratingsData.total === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-4xl mb-3">⭐</div>
          <p className="text-sm font-semibold text-[#414844] mb-1">Ainda sem avaliações</p>
          <p className="text-xs text-[#717973]">As tuas avaliações aparecerão aqui depois das viagens</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Average score */}
          <div className="flex items-center gap-4 bg-[#f3f4ef] rounded-2xl p-4">
            <div className="text-4xl font-bold text-[#1A1C19]">
              {ratingsData.average?.toFixed(1)}
            </div>
            <div>
              <div className="flex gap-0.5 mb-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <StarIcon key={star} filled={star <= Math.round(ratingsData.average ?? 0)} size={16} />
                ))}
              </div>
              <p className="text-xs text-[#717973]">{ratingsData.total} {ratingsData.total === 1 ? "avaliação" : "avaliações"}</p>
            </div>
          </div>

          {/* Ratings list */}
          <div className="space-y-3">
            {ratingsData.ratings.map((r) => (
              <div key={r.id} className="border border-[#e7e9e4] rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-[#1A1C19]">{r.reviewer.name}</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <StarIcon key={star} filled={star <= r.score} size={14} />
                    ))}
                  </div>
                </div>
                {r.comment && (
                  <p className="text-sm text-[#414844]">{r.comment}</p>
                )}
                <p className="text-xs text-[#717973] mt-2">
                  {new Date(r.createdAt).toLocaleDateString("pt-PT")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </Sheet>
  );
}

function StarIcon({ filled, size = 48 }: { filled: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "#FFB800" : "none"}
      stroke={filled ? "#FFB800" : "rgba(0,0,0,0.2)"}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="transition-colors"
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}
