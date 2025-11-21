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
    <div className="bg-white border border-blue-200 rounded-xl p-4 shadow-sm">
      <div className="text-xs font-semibold text-blue-900 mb-2">Pedido de lugar</div>
      <div className="text-sm text-gray-700 mb-1">{seats} lugar · {when ?? "—:—"}</div>
      <div className="text-xs text-gray-500 mb-3">{origin ?? "—"} → {dest ?? "—"}</div>
      
      {message && (
        <div className="bg-gray-50 border-l-2 border-blue-300 rounded py-2 px-3 mb-3">
          <div className="text-xs font-medium text-gray-700 mb-1">Mensagem:</div>
          <div className="text-sm text-gray-800">{message}</div>
        </div>
      )}
      
      <div className="flex gap-2">
        <button className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition" onClick={onDecline}>Recusar</button>
        <button className="flex-1 px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition" onClick={onAccept}>Aceitar</button>
      </div>
    </div>
  );
}
