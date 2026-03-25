export default function RideRequestCard({
  seats, when, origin, dest, message, onAccept, onDecline,
}: {
  seats: number;
  when?: string;
  origin?: string;
  dest?: string;
  message?: string;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div className="bg-white border border-[#e7e9e4] rounded-xl p-4 shadow-sm">
      <div className="text-xs font-semibold text-[#717973] mb-2 uppercase tracking-wide">Pedido de lugar</div>
      <div className="text-sm text-[#1A1C19] font-medium mb-1">{seats} lugar · {when ?? "—:—"}</div>
      <div className="text-xs text-[#414844] mb-3">{origin ?? "—"} → {dest ?? "—"}</div>

      {message && (
        <div className="bg-[#f3f4ef] border-l-2 border-[#c1c8c2] rounded py-2 px-3 mb-3">
          <div className="text-xs font-medium text-[#717973] mb-1">Mensagem:</div>
          <div className="text-sm text-[#1A1C19]">{message}</div>
        </div>
      )}

      <div className="flex gap-2">
        <button className="flex-1 px-3 py-2 border border-[#e7e9e4] text-[#414844] rounded-lg hover:bg-[#f3f4ef] transition" onClick={onDecline}>Recusar</button>
        <button className="flex-1 px-3 py-2 bg-[#1B4332] text-white rounded-lg hover:bg-[#274e3d] transition" onClick={onAccept}>Aceitar</button>
      </div>
    </div>
  );
}
