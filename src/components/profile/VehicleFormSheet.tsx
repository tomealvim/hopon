import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Sheet from "../ui/Sheet";
import { Button } from "../ui/Button";
import { cn } from "../../utils/cn";

export type VehicleFormValues = {
  brand: string;
  model: string;
  plate: string;
  color: string;
  imageUrl: string;
  airConditioning: boolean;
  heater: boolean;
  fuelType: string;
  avgConsumption: number | undefined;
};

type VehicleFormSheetProps = {
  open: boolean;
  mode: "create" | "edit";
  initialValues?: VehicleFormValues;
  onClose: () => void;
  onSubmit: (values: VehicleFormValues) => void;
};

type FieldErrors = {
  brand?: string;
  model?: string;
};

const FUEL_TYPE_OPTIONS = [
  { value: "gasolina95", label: "Gasolina 95" },
  { value: "gasoleo", label: "Gasóleo" },
  { value: "gpl", label: "GPL" },
  { value: "eletrico", label: "Elétrico" },
  { value: "hibrido", label: "Híbrido" },
];

const EMPTY_VALUES: VehicleFormValues = {
  brand: "",
  model: "",
  plate: "",
  color: "",
  imageUrl: "",
  airConditioning: true,
  heater: true,
  fuelType: "",
  avgConsumption: undefined,
};

export default function VehicleFormSheet({
  open,
  mode,
  initialValues,
  onClose,
  onSubmit,
}: VehicleFormSheetProps) {
  const [values, setValues] = useState<VehicleFormValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<FieldErrors>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setValues(initialValues ?? EMPTY_VALUES);
      setErrors({});
    }
  }, [open, initialValues]);

  const handleTextChange = (field: keyof VehicleFormValues) => (next: string) => {
    setValues(prev => ({ ...prev, [field]: next }));
  };

  const handleToggleFeature = (field: "airConditioning" | "heater") => (next: boolean) => {
    setValues(prev => ({ ...prev, [field]: next }));
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
      if (typeof e.target?.result === "string") {
        setValues(prev => ({ ...prev, imageUrl: e.target!.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const nextErrors: FieldErrors = {};
    if (!values.brand.trim()) nextErrors.brand = "Marca obrigatória";
    if (!values.model.trim()) nextErrors.model = "Modelo obrigatório";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit({
      ...values,
      brand: values.brand.trim(),
      model: values.model.trim(),
      plate: values.plate.trim(),
      color: values.color.trim(),
    });
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Informação do veículo"
      height="lg"
      footer={
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="outline" className="flex-1" onClick={handleSubmit}>
            {mode === "edit" ? "Atualizar" : "Guardar"}
          </Button>
        </div>
      }
    >
      <div className="relative grid gap-5 pb-6">
          <PhotoField
            imageUrl={values.imageUrl}
            onSelect={() => fileInputRef.current?.click()}
            onRemove={() => setValues(prev => ({ ...prev, imageUrl: "" }))}
          />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageChange}
          aria-label="Selecionar foto do veículo"
          title="Selecionar foto do veículo"
        />

        <div className="grid gap-4">
          <TextInputField
            id="vehicle-brand"
            label="Marca / Nome do carro *"
            placeholder="Ex: Mercedes - Classe C"
            value={values.brand}
            onChange={handleTextChange("brand")}
            error={errors.brand}
          />
          <TextInputField
            id="vehicle-model"
            label="Modelo *"
            placeholder="Ex: AB XXX XXX"
            value={values.model}
            onChange={handleTextChange("model")}
            error={errors.model}
          />
          <TextInputField
            id="vehicle-plate"
            label="Matrícula"
            placeholder="AB 12 CD"
            value={values.plate}
            onChange={handleTextChange("plate")}
          />
          <TextInputField
            id="vehicle-color"
            label="Cor"
            placeholder="Ex: Preto"
            value={values.color}
            onChange={handleTextChange("color")}
          />
        </div>

        <div className="rounded-2xl border border-[#e7e9e4] bg-[#f3f4ef] p-4">
          <p className="text-sm font-semibold text-[#1A1C19]">Extras disponíveis</p>
          <div className="mt-3 flex flex-col gap-2">
            <FeatureToggle
              label="Ar condicionado"
              checked={values.airConditioning}
              onChange={handleToggleFeature("airConditioning")}
            />
            <FeatureToggle
              label="Aquecimento"
              checked={values.heater}
              onChange={handleToggleFeature("heater")}
            />
          </div>
        </div>

        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-semibold text-[#414844]">
            <span>Tipo de combustível</span>
            <select
              value={values.fuelType}
              onChange={e => setValues(prev => ({ ...prev, fuelType: e.target.value }))}
              className="w-full rounded-2xl border border-[#e7e9e4] bg-[#f3f4ef] px-4 py-3 text-sm text-[#1A1C19] focus:border-[#1B4332] focus:outline-none focus:ring-2 focus:ring-[#52B788]/20"
            >
              <option value="">Selecionar...</option>
              {FUEL_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-semibold text-[#414844]">
            <span className="flex items-center gap-1">
              Consumo médio
              <span
                title="Litros por 100 km para combustão (ex: 6.5). kWh por 100 km para elétrico (ex: 17)."
                className="cursor-help text-xs font-normal text-[#717973]"
              >
                (L/100km ou kWh/100km) ⓘ
              </span>
            </span>
            <input
              type="number"
              min={0}
              step={0.1}
              value={values.avgConsumption ?? ""}
              placeholder="Ex: 6.5"
              onChange={e => {
                const val = e.target.value;
                setValues(prev => ({ ...prev, avgConsumption: val === "" ? undefined : parseFloat(val) }));
              }}
              className="w-full rounded-2xl border border-[#e7e9e4] bg-[#f3f4ef] px-4 py-3 text-sm text-[#1A1C19] placeholder:text-[#717973] focus:border-[#1B4332] focus:outline-none focus:ring-2 focus:ring-[#52B788]/20"
            />
          </label>
        </div>

        <p className="text-xs text-[#414844]">
          Combustível e consumo ajudam-nos a calcular o preço real da viagem com base nos custos do condutor.
        </p>
      </div>
    </Sheet>
  );
}

type TextInputFieldProps = {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  error?: string;
  onChange: (value: string) => void;
};

function TextInputField({ id, label, value, placeholder, error, onChange }: TextInputFieldProps) {
  return (
    <label htmlFor={id} className="grid gap-2 text-sm font-semibold text-[#414844]">
      <span>{label}</span>
      <input
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={event => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          "w-full rounded-2xl border border-[#e7e9e4] bg-[#f3f4ef] px-4 py-3 text-sm text-[#1A1C19] placeholder:text-[#717973] focus:border-[#1B4332] focus:outline-none focus:ring-2 focus:ring-[#52B788]/20",
          error && "border-red-500 focus:border-red-500 focus:ring-red-400"
        )}
      />
      {error && (
        <span id={`${id}-error`} className="text-xs text-red-600">
          {error}
        </span>
      )}
    </label>
  );
}

type FeatureToggleProps = {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
};

function FeatureToggle({ label, checked, onChange }: FeatureToggleProps) {
  return (
    <button
      type="button"
      className={cn(
        "flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-medium transition",
        checked ? "border-[#c1c8c2] bg-[#f3f4ef] text-[#1A1C19]" : "border-[#e7e9e4] bg-[#f3f4ef] text-[#414844] hover:bg-[#f3f4ef]"
      )}
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
    >
      <span>{label}</span>
      <span
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full border text-xs",
          checked ? "border-[#717973] bg-[#414844] text-white" : "border-[#c1c8c2] bg-[#f3f4ef] text-transparent"
        )}
      >
        {checked ? "✓" : ""}
      </span>
    </button>
  );
}

type PhotoFieldProps = {
  imageUrl: string;
  onSelect: () => void;
  onRemove: () => void;
};

function PhotoField({ imageUrl, onSelect, onRemove }: PhotoFieldProps) {
  if (imageUrl) {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-[#e7e9e4]">
        <img src={imageUrl} alt="Veículo" className="h-48 w-full object-cover" />
        <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/50">
          <button
            type="button"
            onClick={onSelect}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#1A1C19] hover:bg-[#f3f4ef] transition"
          >
            Substituir
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-full border border-white/80 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 transition"
          >
            Remover
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex h-48 w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[#e7e9e4] bg-[#f3f4ef] text-[#414844] hover:bg-[#f3f4ef] hover:border-[#c1c8c2] transition"
    >
      <span className="text-4xl">＋</span>
      <span className="mt-2 text-sm font-medium">Adicionar foto</span>
    </button>
  );
}

