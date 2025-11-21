import React, { useState } from "react";
import type { CampusId } from "../../pages/types/domain";
import { campuses } from "../../data/constants";

const DriverDashboard: React.FC<{ onOpenInvite: () => void }> = ({ onOpenInvite }) => {
  const [form, setForm] = useState({
    days: ["2ª", "3ª", "4ª", "5ª", "6ª"],
    depart: "07:30",
    campus: "ciencias" as CampusId,
    seats: 3,
    detourMin: 6,
    detourKm: 1.5,
  });

  const [instances] = useState(() => [
    { id: "d1", date: "Seg · 07:30", campus: "Ciências", seatsLeft: 2, status: "Publicado" },
    { id: "d2", date: "Ter · 07:30", campus: "Ciências", seatsLeft: 3, status: "Rascunho" },
  ]);

  return (
    <div className="max-w-md mx-auto px-3 py-4 space-y-6">
      <div className="rounded-2xl bg-white ring-1 ring-neutral-200 shadow p-4 space-y-3">
        <div className="text-sm font-semibold">Condutor — Criar roteiro</div>
        <div className="grid">
          <label className="col-span-2">
            Dias
            <div className="mt-1 flex flex-wrap gap-2">
              {["2ª", "3ª", "4ª", "5ª", "6ª"].map((d) => (
                <button
                  key={d}
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      days: f.days.includes(d) ? f.days.filter((x) => x !== d) : [...f.days, d],
                    }))
                  }
                  className={`px-3 py-1 rounded-full ring-1 text-xs ${
                    form.days.includes(d) ? "bg-neutral-900 text-white ring-neutral-900" : "bg-white text-neutral-700 ring-neutral-200"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </label>
          <label>
            Saída
            <input
              value={form.depart}
              onChange={(e) => setForm((f) => ({ ...f, depart: e.target.value }))}
              className="mt-1 w-full px-3 py-2 rounded-xl ring-1 ring-neutral-200"
            />
          </label>
          <label>
            Destino
            <select
              value={form.campus}
              onChange={(e) => setForm((f) => ({ ...f, campus: e.target.value as CampusId }))}
              className="mt-1 w-full px-3 py-2 rounded-xl ring-1 ring-neutral-200"
            >
              {campuses
                .filter((c) => c.id !== "all")
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Lugares
            <input
              type="number"
              min={1}
              max={4}
              value={form.seats}
              onChange={(e) => setForm((f) => ({ ...f, seats: parseInt(e.target.value || "1", 10) }))}
              className="mt-1 w-full px-3 py-2 rounded-xl ring-1 ring-neutral-200"
            />
          </label>
          <label>
            Desvio máx. (min)
            <input
              type="number"
              min={0}
              max={20}
              value={form.detourMin}
              onChange={(e) => setForm((f) => ({ ...f, detourMin: parseInt(e.target.value || "0", 10) }))}
              className="mt-1 w-full px-3 py-2 rounded-xl ring-1 ring-neutral-200"
            />
          </label>
          <label>
            Desvio máx. (km)
            <input
              type="number"
              step={0.1}
              min={0}
              max={10}
              value={form.detourKm}
              onChange={(e) => setForm((f) => ({ ...f, detourKm: parseFloat(e.target.value || "0") }))}
              className="mt-1 w-full px-3 py-2 rounded-xl ring-1 ring-neutral-200"
            />
          </label>
        </div>
        <div className="flex gap-2">
          <button className="flex-1 h-10 rounded-xl bg-neutral-900 text-white font-semibold">Publicar rotina</button>
          <button className="h-10 px-3 rounded-xl ring-1 ring-neutral-200 text-neutral-700">Pré-visualizar</button>
          <button onClick={onOpenInvite} className="h-10 px-3 rounded-xl bg-blue-600 text-white">
            Procurar passageiros
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white ring-1 ring-neutral-200 shadow p-4">
        <div className="text-sm font-semibold mb-2">As minhas viagens</div>
        <div className="space-y-2 text-sm">
          {instances.map((i) => (
            <div key={i.id} className="flex items-center justify-between p-2 rounded-xl ring-1 ring-neutral-200">
              <div>
                <div className="font-medium">{i.date}</div>
                <div className="text-neutral-500">
                  {i.campus} · Lugares: {i.seatsLeft}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-1 rounded-full ring-1 ${
                    i.status === "Publicado"
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                      : "bg-neutral-50 text-neutral-700 ring-neutral-200"
                  }`}
                >
                  {i.status}
                </span>
                <button className="px-3 py-1 rounded-lg ring-1 ring-neutral-200 text-neutral-700">Editar</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DriverDashboard;
