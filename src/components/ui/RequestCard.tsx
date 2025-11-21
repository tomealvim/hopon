import React from "react";
import type { PassengerReq } from "../../pages/types/domain";
import { campuses } from "../../data/constants";
import { minutesToHHMM } from "../../utils/time";

const RequestCard: React.FC<{ req: PassengerReq }> = ({ req }) => {
  const campus = campuses.find((c) => c.id === req.campusId)?.name ?? "Campus";
  return (
    <div className="w-full max-w-md mx-auto rounded-2xl overflow-hidden shadow ring-1 ring-neutral-200 bg-white">
      <div className="p-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-neutral-900">
            {req.userName} — procura boleia
          </div>
          <div className="text-xs text-neutral-500">
            {campus} · Aula {minutesToHHMM(req.classMin)} · Buffer {req.buffer}m
          </div>
        </div>
        <span className="text-[10px] uppercase tracking-wide text-neutral-400 px-2 py-1 ring-1 ring-neutral-200 rounded">
          pedido
        </span>
      </div>
      <div className="px-4 pb-4 space-y-3 text-sm text-neutral-700">
        <div>
          Zona: <b>{req.zoneLabel}</b> · Raio {req.radius} m
        </div>
        <div>Caminhada aceitável até {req.walkMax} min</div>
        <div className="flex gap-2 pt-1">
          <button className="flex-1 h-10 rounded-xl bg-neutral-900 text-white font-semibold hover:bg-black transition">
            Convidar
          </button>
          <button className="h-10 px-3 rounded-xl ring-1 ring-neutral-200 text-neutral-700 hover:bg-neutral-50">
            Ver Perfil
          </button>
        </div>
      </div>
    </div>
  );
};

export default RequestCard;
