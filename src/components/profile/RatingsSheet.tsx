import { useState } from "react";
import { Button } from "../ui/Button";
import Sheet from "../ui/Sheet";

interface RatingsSheetProps {
  open: boolean;
  onClose: () => void;
}

export default function RatingsSheet({ open, onClose }: RatingsSheetProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [message, setMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const canSubmit = rating > 0;

  function handleSubmit() {
    if (!canSubmit) return;

    // TODO: Enviar para backend/API quando estiver disponível
    console.log("Avaliação enviada:", {
      rating,
      message: message.trim(),
      timestamp: new Date().toISOString(),
    });

    setShowSuccess(true);
  }

  function handleBackHome() {
    setShowSuccess(false);
    setMessage("");
    setRating(0);
    onClose();
  }

  function handleClose() {
    if (!showSuccess) {
      setMessage("");
      setRating(0);
    }
    onClose();
  }

  const displayRating = hoveredRating || rating;

  return (
    <>
      {/* Main ratings sheet */}
      <Sheet
        open={open && !showSuccess}
        onClose={handleClose}
        title="Avaliação"
        height="lg"
        footer={
          <Button
            block
            className="min-h-[48px]"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            Enviar avaliação
          </Button>
        }
      >
        <div className="space-y-6">
          {/* Star Rating */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-3">
              Como avalias a tua experiência?
            </label>
            <div className="flex items-center justify-center gap-3 py-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110 active:scale-95"
                  aria-label={`${star} estrela${star > 1 ? "s" : ""}`}
                >
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill={star <= displayRating ? "#FFB800" : "none"}
                    stroke={star <= displayRating ? "#FFB800" : "rgba(0,0,0,0.2)"}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-colors"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-center text-sm font-semibold text-gray-900 mt-2">
                {rating === 1 && "Muito insatisfeito"}
                {rating === 2 && "Insatisfeito"}
                {rating === 3 && "Neutro"}
                {rating === 4 && "Satisfeito"}
                {rating === 5 && "Muito satisfeito"}
              </p>
            )}
          </div>

          {/* Message Textarea */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2" htmlFor="rating-message">
              Comentário adicional (opcional)
            </label>
            <textarea
              id="rating-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Partilha a tua experiência..."
              className="w-full h-32 px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20"
              maxLength={300}
            />
            <p className="text-xs text-gray-500 mt-2">
              {message.length}/300 caracteres
            </p>
          </div>

          {/* Info */}
          <div className="rounded-2xl bg-blue-50 border border-blue-200 px-4 py-3">
            <p className="text-sm text-blue-900">
              <strong>Obrigado pelo feedback!</strong> As tuas avaliações ajudam-nos a melhorar a experiência para todos.
            </p>
          </div>
        </div>
      </Sheet>

      {/* Success Sheet */}
      <Sheet
        open={showSuccess}
        onClose={() => {}}
        title=""
        height="md"
        footer={null}
      >
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
          {/* Success Icon */}
          <div className="relative mb-6">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-emerald-200 via-emerald-300 to-emerald-400 flex items-center justify-center">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" className="text-emerald-700">
                <path
                  d="M20 6L9 17l-5-5"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          {/* Success Message */}
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Avaliação enviada
          </h2>
          <p className="text-base text-gray-600 mb-8">
            Obrigado por partilhares a tua opinião!
          </p>

          {/* Back Home Button */}
          <Button
            block
            className="min-h-[48px]"
            onClick={handleBackHome}
          >
            Voltar ao início
          </Button>
        </div>
      </Sheet>
    </>
  );
}

