import React from "react";

interface Props {
  ok: boolean;
  sobra: number;
}

const MatchBadge: React.FC<Props> = ({ ok, sobra }) => {
  const txt = ok
    ? `Chegas a tempo · +${Math.round(sobra)} min`
    : `Apertado · ${Math.round(Math.abs(sobra))} min em falta`;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
        ok
          ? "bg-emerald-600/10 text-emerald-700 ring-1 ring-emerald-600/30"
          : "bg-rose-600/10 text-rose-700 ring-1 ring-rose-600/30"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          ok ? "bg-emerald-600" : "bg-rose-600"
        }`}
      />
      {txt}
    </span>
  );
};

export default MatchBadge;
