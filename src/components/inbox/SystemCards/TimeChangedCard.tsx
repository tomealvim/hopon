export default function TimeChangedCard({
  oldTime, newTime, onConfirm,
}: {
  oldTime?: string;
  newTime?: string;
  onConfirm: () => void;
}) {
  return (
    <div className="bg-white border border-yellow-200 rounded-xl p-4 shadow-sm">
      <div className="text-xs font-semibold text-yellow-900 mb-2">Hora atualizada</div>
      <div className="text-sm text-[#414844] mb-3">
        <s className="text-[#717973]">{oldTime ?? "—:—"}</s> → <strong>{newTime ?? "—:—"}</strong>
      </div>
      <div>
        <button className="w-full px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition" onClick={onConfirm}>Confirmar</button>
      </div>
    </div>
  );
}
