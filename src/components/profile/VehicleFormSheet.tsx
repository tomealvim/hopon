import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Sheet from "../ui/Sheet";
import { Button } from "../ui/Button";
import { cn } from "../../utils/cn";
import BackgroundGlow from "../ui/BackgroundGlow";

export type VehicleFormValues = {
  brand: string;
  model: string;
  plate: string;
  color: string;
  imageUrl: string;
  airConditioning: boolean;
  heater: boolean;
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

const EMPTY_VALUES: VehicleFormValues = {
  brand: "",
  model: "",
  plate: "",
  color: "",
  imageUrl: "",
  airConditioning: true,
  heater: true,
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
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button className="flex-1" onClick={handleSubmit}>
            {mode === "edit" ? "Atualizar" : "Guardar"}
          </Button>
        </div>
      }
    >
      <div className="relative">
        <BackgroundGlow className="opacity-60" />
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

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-semibold text-white/80">Extras disponíveis</p>
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

        <p className="text-xs text-white/60">
          Marca e modelo são obrigatórios para calcularmos o consumo do veículo e dividir os custos da viagem.
        </p>
        </div>
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
    <label htmlFor={id} className="grid gap-2 text-sm font-semibold text-white/80">
      <span>{label}</span>
      <input
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={event => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          "w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
          error && "border-red-500 focus:border-red-500 focus:ring-red-400"
        )}
      />
      {error && (
        <span id={`${id}-error`} className="text-xs text-red-400">
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
        checked ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300" : "border-white/20 bg-white/5 text-white/70 hover:bg-white/10"
      )}
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
    >
      <span>{label}</span>
      <span
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full border text-xs",
          checked ? "border-emerald-400 bg-emerald-500 text-white" : "border-white/30 bg-white/5 text-white/50"
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
      <div className="relative overflow-hidden rounded-3xl border border-white/10">
        <img src={imageUrl} alt="Veículo" className="h-48 w-full object-cover" />
        <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/50">
          <button
            type="button"
            onClick={onSelect}
            className="rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-white transition"
          >
            Substituir
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-full border border-white/80 bg-white/10 backdrop-blur-sm px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 transition"
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
      className="flex h-48 w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-white/20 bg-white/5 text-white/60 hover:bg-white/10 hover:border-white/30 transition"
    >
      <span className="text-4xl">＋</span>
      <span className="mt-2 text-sm font-medium">Adicionar foto</span>
    </button>
  );
}

