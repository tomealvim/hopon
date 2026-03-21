import { Button } from "../components/ui/Button";
import { cn } from "../utils/cn";
import type { ApiRide } from "./types/ride-api";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

type Props = {
  ride: ApiRide | null;
  loading: boolean;
  open: boolean;
  onClose: () => void;
  onBook: (rideId: string) => void;
  onViewProfile: (userId: string) => void;
  onReport: (driverId: string, driverName: string) => void;
  currentUserId?: string;
};

export default function RideDetailPage({
  ride,
  loading,
  open,
  onClose,
  onBook,
  onViewProfile,
  onReport,
  currentUserId,
}: Props) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 bg-white flex flex-col transition-transform duration-300 ease-in-out",
        open ? "translate-x-0" : "translate-x-full"
      )}
    >
      {/* Sticky header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-4 h-14 flex items-center gap-3 z-10 shrink-0">
        <button
          onClick={onClose}
          className="p-2 -ml-2 rounded-xl hover:bg-gray-100 transition-colors"
          aria-label="Voltar"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="font-headline font-bold text-gray-900 text-base">Detalhes da boleia</h1>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-28 px-5">
        {loading && (
          <p className="text-sm text-gray-500 py-8 text-center">A carregar...</p>
        )}
        {!loading && ride && (() => {
          const dep = new Date(ride.departureTime);
          const dateStr = dep.toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" });
          const timeStr = dep.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
          const driverName = ride.driver?.profile?.name ?? ride.driver?.email ?? "Condutor";
          const oLng = ride.originLocation?.lng;
          const oLat = ride.originLocation?.lat;
          const dLng = ride.destinationLocation?.lng;
          const dLat = ride.destinationLocation?.lat;
          const hasMap = !!(MAPBOX_TOKEN && oLat && oLng && dLat && dLng);

          return (
            <div>
              {/* Mapa no topo */}
              {hasMap ? (
                <div className="-mx-5 -mt-2 mb-6 relative">
                  <img
                    src={`https://api.mapbox.com/styles/v1/mapbox/light-v11/static/geojson(${encodeURIComponent(JSON.stringify({type:"Feature",geometry:{type:"LineString",coordinates:[[oLng,oLat],[dLng,dLat]]},properties:{stroke:"#374151","stroke-width":3,"stroke-opacity":0.55}}))}),pin-l+111827(${oLng},${oLat}),pin-l+6b7280(${dLng},${dLat})/auto/800x320@2x?padding=90,50,80,50&access_token=${MAPBOX_TOKEN}`}
                    alt="Mapa da rota"
                    className="w-full h-56 object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white/70 to-transparent px-5 pb-3 pt-6">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center shrink-0">
                        <div className="w-2.5 h-2.5 rounded-full bg-gray-900" />
                        <div className="route-dotted-line my-1" style={{ height: 18 }} />
                        <div className="w-2.5 h-2.5 rounded-full border-2 border-gray-500 bg-white" />
                      </div>
                      <div className="flex flex-col gap-1.5 min-w-0">
                        <p className="font-headline font-bold text-gray-900 text-sm truncate">{ride.origin}</p>
                        <p className="font-headline font-bold text-gray-900 text-sm truncate">{ride.destination}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-2xl p-4 mb-5 mt-4">
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center pt-1 shrink-0">
                      <div className="w-2.5 h-2.5 rounded-full bg-gray-900" />
                      <div className="route-dotted-line my-1" style={{ minHeight: 28 }} />
                      <div className="w-2.5 h-2.5 rounded-full border-2 border-gray-400 bg-white" />
                    </div>
                    <div className="flex flex-col justify-between gap-3 min-w-0">
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Origem</p>
                        <p className="font-headline font-semibold text-gray-900 text-sm">{ride.origin}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Destino</p>
                        <p className="font-headline font-semibold text-gray-900 text-sm">{ride.destination}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Condutor */}
              {ride.driver && (
                <div className="flex items-center justify-between mb-5">
                  <button
                    className="flex items-center gap-3 hover:opacity-80 transition text-left"
                    onClick={() => onViewProfile(ride.driverId)}
                  >
                    {ride.driver.profile?.avatarUrl ? (
                      <img src={ride.driver.profile.avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover ring-2 ring-gray-100" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-900 text-white flex items-center justify-center text-lg font-bold shrink-0">
                        {driverName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="font-headline font-bold text-gray-900 text-lg leading-tight">{driverName}</p>
                        {ride.driver.isIdentityVerified && (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-700 shrink-0">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">Ver perfil -&gt;</p>
                    </div>
                  </button>
                  {ride.driverId !== currentUserId && (
                    <button
                      className="w-11 h-11 rounded-2xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition shrink-0"
                      aria-label="Mensagem"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                      </svg>
                    </button>
                  )}
                </div>
              )}

              {/* Grid de info */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Partida</p>
                  <p className="font-headline font-bold text-gray-900 text-base">{timeStr}</p>
                  <p className="text-xs text-gray-500 mt-0.5 capitalize">{dateStr}</p>
                </div>
                {ride.vehicle && (
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Veículo</p>
                    <p className="font-headline font-bold text-gray-900 text-base leading-tight">
                      {ride.vehicle.brand} {ride.vehicle.model}
                    </p>
                    {ride.vehicle.color && (
                      <p className="text-xs text-gray-500 mt-0.5">{ride.vehicle.color}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Preço + lugares */}
              {ride.price != null && ride.price > 0 && (
                <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-4 mb-5">
                  <div>
                    <p className="text-xs text-gray-500">Preço por lugar</p>
                    <p className="font-headline font-extrabold text-gray-900 text-2xl">€{ride.price.toFixed(2)}</p>
                  </div>
                  <div className="bg-white rounded-xl px-3 py-2 border border-gray-200 text-center">
                    <p className="font-bold text-gray-900 text-sm">{ride.bookedSeats}/{ride.availableSeats}</p>
                    <p className="text-[10px] text-gray-400">lugares</p>
                  </div>
                </div>
              )}

              {/* Denunciar */}
              {ride.driverId !== currentUserId && (
                <button
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                  onClick={() => {
                    const name = ride.driver?.profile?.name ?? ride.driver?.email ?? "Condutor";
                    onReport(ride.driverId, name);
                  }}
                >
                  Denunciar condutor
                </button>
              )}
            </div>
          );
        })()}
      </div>

      {/* Sticky footer */}
      <div className="shrink-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        {ride && ride.driverId !== currentUserId && ride.remainingSeats > 0 && (
          <Button className="w-full" onClick={() => onBook(ride.id)}>Reservar lugar</Button>
        )}
        {ride && ride.driverId === currentUserId && (
          <p className="text-sm text-center text-gray-400">Esta é a tua boleia</p>
        )}
        {ride && ride.driverId !== currentUserId && ride.remainingSeats === 0 && (
          <p className="text-sm text-center text-gray-400">Sem lugares disponíveis</p>
        )}
      </div>
    </div>
  );
}
