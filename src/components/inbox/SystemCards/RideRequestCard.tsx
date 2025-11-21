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
    <div className="bg-white/5 border border-blue-500/30 rounded-xl p-4 shadow-sm">
      <div className="text-xs font-semibold text-blue-300 mb-2">Pedido de lugar</div>
      <div className="text-sm text-white/80 mb-1">{seats} lugar · {when ?? "—:—"}</div>
      <div className="text-xs text-white/60 mb-3">{origin ?? "—"} → {dest ?? "—"}</div>
      
      {message && (
        <div className="bg-white/5 border-l-2 border-blue-500/50 rounded py-2 px-3 mb-3">
          <div className="text-xs font-medium text-white/70 mb-1">Mensagem:</div>
          <div className="text-sm text-white/90">{message}</div>
        </div>
      )}
      
      <div className="flex gap-2">
        <button className="flex-1 px-3 py-2 border border-white/20 text-white rounded-lg hover:bg-white/10 transition" onClick={onDecline}>Recusar</button>
        <button className="flex-1 px-3 py-2 bg-gradient-to-r from-[#FFE29F] via-[#FFA99F] to-[#FF719A] text-black rounded-lg hover:opacity-90 transition" onClick={onAccept}>Aceitar</button>
      </div>
    </div>
  );
}
