export default function PaymentDueCard({
  amount, onPay,
}: { amount: number; onPay: () => void }) {
  return (
    <div className="bg-white border border-green-200 rounded-xl p-4 shadow-sm">
      <div className="text-xs font-semibold text-green-900 mb-2">Pagamento pendente</div>
      <div className="text-sm text-[#414844] mb-3">Contribuição sugerida: €{amount.toFixed(2)}</div>
      <div>
        <button className="w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition" onClick={onPay}>Pagar agora</button>
      </div>
    </div>
  );
}
