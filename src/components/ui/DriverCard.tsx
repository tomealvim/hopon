import React from "react";
import type { Post } from "../../pages/types/domain";
import { campuses } from "../../data/constants";
import { minutesToHHMM } from "../../utils/time";
import { computeChegasATempo } from "../../utils/match";
import MatchBadge from "./MatchBadge";

type ViewMode = "seguindo" | "publico";

interface Props {
  post: Post;
  viewMode: ViewMode;
  onOpenDetails: (p: Post) => void;
  onRequestSeat: (p: Post) => void;
  onJoinWaitlist: (p: Post) => void;
}

const DriverCard: React.FC<Props> = ({
  post,
  viewMode,
  onOpenDetails,
  onRequestSeat,
  onJoinWaitlist,
}) => {
  const {
    driverName,
    driverRating,
    leavesAtMin,
    campusId,
    seats,
    etaPickup,
    etaDrop,
    walk,
    wait,
    classMin,
    buffer,
    detourMin,
    detourKm,
    seatsLeft,
    waitlisted,
    waitlistCount = 0,
    myWaitPos = null,
  } = post;

  const campus = campuses.find((c) => c.id === campusId)?.name ?? "Campus";
  const { ok, sobra, arrivalMin } = computeChegasATempo({
    depMin: leavesAtMin,
    etaPickup,
    wait,
    etaDrop,
    walk,
    classMin,
    buffer,
  });
  const esgotado = (seatsLeft ?? 0) <= 0;

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="rounded-2xl overflow-hidden shadow ring-1 ring-neutral-200 bg-white">
        <div className="p-4 flex items-start justify-between">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neutral-200 to-neutral-300" />
            <div>
              <div className="text-sm font-semibold text-neutral-900">
                {driverName} · {campus}
              </div>
              <div className="text-xs text-neutral-500">
                Avaliação {driverRating.toFixed(1)} · Lugares {Math.max(0, seatsLeft)}/{seats}
              </div>
            </div>
          </div>
          <span className="text-[10px] uppercase tracking-wide text-neutral-400 px-2 py-1 ring-1 ring-neutral-200 rounded">
            {viewMode === "seguindo" ? "a seguir" : "público"}
          </span>
        </div>

        <div className="px-4 pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold tabular-nums">
              Sai às {minutesToHHMM(leavesAtMin)}
            </div>
            <MatchBadge ok={ok} sobra={sobra} />
          </div>

          <div className="grid">
            <div className="rounded-lg bg-neutral-50 p-2 ring-1 ring-neutral-100">
              <div className="font-medium text-neutral-800">Para ti</div>
              <div>
                Chegada ao ponto: <b className="tabular-nums">{etaPickup} min</b>
              </div>
              <div>
                Caminhada final: <b className="tabular-nums">{walk} min</b>
              </div>
            </div>
            <div className="rounded-lg bg-neutral-50 p-2 ring-1 ring-neutral-100">
              <div className="font-medium text-neutral-800">Condutor</div>
              <div>
                Desvio:{" "}
                <b className="tabular-nums">
                  {detourMin} min / {detourKm.toFixed(1)} km
                </b>
              </div>
              <div>
                Espera: <b className="tabular-nums">{wait} min</b>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-neutral-700">
            <div>
              Chegada prev.: <b className="tabular-nums">{minutesToHHMM(arrivalMin)}</b>
            </div>
            <div>
              Aula:{" "}
              <b className="tabular-nums">
                {minutesToHHMM(classMin)} (buffer {buffer}m)
              </b>
            </div>
          </div>

          <div className="flex flex-col gap-1 pt-1">
            {!esgotado && (
              <div className="flex gap-2">
                <button
                  onClick={() => onRequestSeat(post)}
                  className="flex-1 h-10 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
                >
                  Pedir Lugar
                </button>
                <button
                  onClick={() => onOpenDetails(post)}
                  className="h-10 px-3 rounded-xl ring-1 ring-neutral-200 text-neutral-700 hover:bg-neutral-50"
                >
                  Detalhes
                </button>
              </div>
            )}
            {esgotado && (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => onJoinWaitlist(post)}
                    disabled={waitlisted}
                    className={`flex-1 h-10 rounded-xl font-semibold transition ${
                      waitlisted
                        ? "bg-neutral-200 text-neutral-500 cursor-not-allowed"
                        : "bg-amber-600 text-white hover:bg-amber-700"
                    }`}
                  >
                    {waitlisted
                      ? `Na fila (#${myWaitPos ?? "?"})`
                      : `Entrar na fila (#${(waitlistCount ?? 0) + 1})`}
                  </button>
                  <button
                    onClick={() => onOpenDetails(post)}
                    className="h-10 px-3 rounded-xl ring-1 ring-neutral-200 text-neutral-700 hover:bg-neutral-50"
                  >
                    Detalhes
                  </button>
                </div>
                <div className="text-[11px] text-neutral-500">
                  Serás notificado se alguém cancelar ou o condutor abrir mais lugares.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverCard;
