/**
 * LocationInput — campo de texto para localização com suporte a coordenadas.
 *
 * Atualmente funciona como um input de texto normal.
 * Quando integrado com Google Places API, o `onLocationSelect` receberá
 * label + lat/lng + placeId automaticamente a partir do autocomplete.
 */

export type LocationValue = {
  label: string;
  lat?: number;
  lng?: number;
  placeId?: string;
  city?: string;
  campus?: string;
};

type LocationInputProps = {
  id?: string;
  className?: string;
  placeholder?: string;
  value: string;
  lat?: number;
  lng?: number;
  /** Chamado quando o utilizador edita manualmente o texto (limpa coordenadas) */
  onLabelChange: (label: string) => void;
  /** Chamado quando uma localização estruturada é seleccionada (ex: Google Places) */
  onLocationSelect?: (location: LocationValue) => void;
  onBlur?: () => void;
  "aria-invalid"?: boolean;
};

export function LocationInput({
  id,
  className,
  placeholder,
  value,
  lat,
  lng,
  onLabelChange,
  onLocationSelect: _onLocationSelect,
  onBlur,
  "aria-invalid": ariaInvalid,
}: LocationInputProps) {
  const hasCoords = lat != null && lng != null;

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        className={className}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onLabelChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={ariaInvalid}
        autoComplete="off"
      />
      {hasCoords && (
        <span
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full select-none"
          title={`${lat?.toFixed(4)}, ${lng?.toFixed(4)}`}
        >
          GPS
        </span>
      )}
    </div>
  );
}
