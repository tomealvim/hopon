import { useId, useMemo, useState } from "react";
import TimePicker from "./TimePicker";
import { Button } from "./Button";

export type RequestRideFormValues = {
  origem: string;
  destino: string;
  data: string; // YYYY-MM-DD
  horaMin: string; // HH:MM - hora mínima de partida
  horaMax: string; // HH:MM - hora máxima de partida
  passageiros: number; // quantas pessoas
  aceitaDesvios: boolean;
  desvioMaxMin: number; // minutos de desvio aceitável
  orcamentoMax?: number; // custo máximo por pessoa
  preferencias: {
    musica: boolean;
    falar: boolean;
    bagagem: boolean;
    animais: boolean;
    fumador: boolean;
  };
  urgencia: "baixa" | "media" | "alta";
  observacoes?: string;
  contacto: string; // telefone ou email
  disponibilidade: {
    manha: boolean;
    tarde: boolean;
    noite: boolean;
  };
};

export type RequestRideFormProps = {
  initial?: Partial<RequestRideFormValues>;
  onCancel: () => void;
  onSubmit: (values: RequestRideFormValues) => void;
};

export default function RequestRideForm({ initial, onCancel, onSubmit }: RequestRideFormProps) {
  const today = useMemo(() => new Date().toISOString().slice(0,10), []);
  const defaultValues: RequestRideFormValues = {
    origem: initial?.origem ?? "",
    destino: initial?.destino ?? "",
    data: initial?.data ?? today,
    horaMin: initial?.horaMin ?? "07:00",
    horaMax: initial?.horaMax ?? "09:00",
    passageiros: initial?.passageiros ?? 1,
    aceitaDesvios: initial?.aceitaDesvios ?? true,
    desvioMaxMin: initial?.desvioMaxMin ?? 15,
    orcamentoMax: initial?.orcamentoMax ?? undefined,
    preferencias: initial?.preferencias ?? {
      musica: true,
      falar: true,
      bagagem: false,
      animais: false,
      fumador: false,
    },
    urgencia: initial?.urgencia ?? "media",
    observacoes: initial?.observacoes ?? "",
    contacto: initial?.contacto ?? "",
    disponibilidade: initial?.disponibilidade ?? {
      manha: true,
      tarde: false,
      noite: false,
    },
  };

  const [values, setValues] = useState<RequestRideFormValues>(defaultValues);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const set = <K extends keyof RequestRideFormValues>(key: K, val: RequestRideFormValues[K]) => {
    setValues(prev => ({ ...prev, [key]: val }));
  };

  const setPref = (key: keyof RequestRideFormValues["preferencias"], val: boolean) => {
    setValues(prev => ({ ...prev, preferencias: { ...prev.preferencias, [key]: val } }));
  };

  const setDisp = (key: keyof RequestRideFormValues["disponibilidade"], val: boolean) => {
    setValues(prev => ({ ...prev, disponibilidade: { ...prev.disponibilidade, [key]: val } }));
  };

  const setTouchedField = (name: string) => setTouched(prev => ({ ...prev, [name]: true }));

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!values.origem.trim()) e.origem = "Obrigatório";
    if (!values.destino.trim()) e.destino = "Obrigatório";
    if (!values.data) e.data = "Obrigatório";
    if (!values.horaMin) e.horaMin = "Obrigatório";
    if (!values.horaMax) e.horaMax = "Obrigatório";
    if (values.horaMin >= values.horaMax) e.horaMax = "Deve ser depois da hora mínima";
    if (values.passageiros < 1) e.passageiros = "Mínimo 1";
    if (values.aceitaDesvios && (values.desvioMaxMin < 0 || values.desvioMaxMin > 60)) e.desvioMaxMin = "0–60 min";
    if (values.orcamentoMax && values.orcamentoMax < 0) e.orcamentoMax = "Valor inválido";
    if (!values.contacto.trim()) e.contacto = "Obrigatório";
    return e;
  }, [values]);

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (Object.keys(errors).length > 0) {
      setTouched({
        origem: true,
        destino: true,
        data: true,
        horaMin: true,
        horaMax: true,
        passageiros: true,
        desvioMaxMin: true,
        orcamentoMax: true,
        contacto: true,
      });
      return;
    }
    onSubmit(values);
  };

  const id = useId();

  return (
    <form onSubmit={submit} className="grid gap-4 p-1">
      <div>
        <label htmlFor={`${id}-origem`} className="block text-xs font-semibold text-[#414844] mb-1">De onde?</label>
        <input
          id={`${id}-origem`}
          className="w-full px-3 py-2.5 border border-[#e7e9e4] bg-[#f3f4ef] text-[#1A1C19] rounded-xl outline-none focus:border-[#1B4332] focus:ring-2 focus:ring-[#52B788]/10 placeholder:text-[#717973]"
          placeholder="Ex.: Estoril, estação, rua…"
          value={values.origem}
          onChange={e=>set("origem", e.target.value)}
          onBlur={()=>setTouchedField("origem")}
          aria-invalid={!!errors.origem}
        />
        {touched.origem && errors.origem && <div className="text-xs text-red-300 mt-1">{errors.origem}</div>}
      </div>

      <div>
        <label htmlFor={`${id}-destino`} className="block text-xs font-semibold text-[#414844] mb-1">Para onde?</label>
        <input
          id={`${id}-destino`}
          className="w-full px-3 py-2.5 border border-[#e7e9e4] bg-[#f3f4ef] text-[#1A1C19] rounded-xl outline-none focus:border-[#1B4332] focus:ring-2 focus:ring-[#52B788]/10 placeholder:text-[#717973]"
          placeholder="Ex.: ULisboa Ciências, campus, morada…"
          value={values.destino}
          onChange={e=>set("destino", e.target.value)}
          onBlur={()=>setTouchedField("destino")}
          aria-invalid={!!errors.destino}
        />
        {touched.destino && errors.destino && <div className="text-xs text-red-600 mt-1">{errors.destino}</div>}
      </div>

      <div>
        <label htmlFor={`${id}-data`} className="block text-xs font-semibold text-[#414844] mb-1">Dia</label>
        <input
          id={`${id}-data`}
          className="w-full px-3 py-2.5 border border-[#e7e9e4] bg-[#f3f4ef] text-[#1A1C19] rounded-xl outline-none focus:border-[#1B4332] focus:ring-2 focus:ring-[#52B788]/10"
          type="date"
          value={values.data}
          onChange={e=>set("data", e.target.value)}
          onBlur={()=>setTouchedField("data")}
          aria-invalid={!!errors.data}
        />
        {touched.data && errors.data && <div className="text-xs text-red-600 mt-1">{errors.data}</div>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <TimePicker
            label="Hora mínima"
            value={values.horaMin}
            onChange={(v) => {
              set("horaMin", v);
              setTouchedField("horaMin");
            }}
          />
          {touched.horaMin && errors.horaMin && <div className="text-xs text-red-600 mt-1">{errors.horaMin}</div>}
        </div>

        <div>
          <TimePicker
            label="Hora máxima"
            value={values.horaMax}
            onChange={(v) => {
              set("horaMax", v);
              setTouchedField("horaMax");
            }}
          />
          {touched.horaMax && errors.horaMax && <div className="text-xs text-red-600 mt-1">{errors.horaMax}</div>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${id}-passageiros`} className="block text-xs font-semibold text-[#414844] mb-1">Passageiros</label>
          <input
            id={`${id}-passageiros`}
            className="w-full px-3 py-2.5 border border-[#e7e9e4] bg-[#f3f4ef] text-[#1A1C19] rounded-xl outline-none focus:border-[#1B4332] focus:ring-2 focus:ring-[#52B788]/10"
            type="number"
            min={1}
            max={6}
            value={values.passageiros}
            onChange={e=>set("passageiros", Number(e.target.value))}
            onBlur={()=>setTouchedField("passageiros")}
            aria-invalid={!!errors.passageiros}
          />
          {touched.passageiros && errors.passageiros && <div className="text-xs text-red-600 mt-1">{errors.passageiros}</div>}
        </div>

        <div>
          <label htmlFor={`${id}-urgencia`} className="block text-xs font-semibold text-[#414844] mb-1">Urgência</label>
          <select
            id={`${id}-urgencia`}
            className="w-full px-3 py-2.5 border border-[#e7e9e4] bg-[#f3f4ef] text-[#1A1C19] rounded-xl outline-none focus:border-[#1B4332] focus:ring-2 focus:ring-[#52B788]/10"
            value={values.urgencia}
            onChange={e=>set("urgencia", e.target.value as "baixa" | "media" | "alta")}
          >
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#414844] mb-1">Aceita desvios?</label>
        <div className="flex items-center gap-2 mb-2">
          <input
            id={`${id}-aceita`}
            type="checkbox"
            className="w-4 h-4 rounded border-[#c1c8c2] bg-[#f3f4ef]"
            checked={values.aceitaDesvios}
            onChange={e=>set("aceitaDesvios", e.target.checked)}
          />
          <label htmlFor={`${id}-aceita`} className="text-sm font-medium text-[#1A1C19]" aria-live="polite">
            {values.aceitaDesvios ? "Sim" : "Não"}
          </label>
        </div>
        {values.aceitaDesvios && (
          <>
            <label htmlFor={`${id}-desvio`} className="block text-xs font-semibold text-[#414844] mb-1">Desvio máx. (min)</label>
            <input
              id={`${id}-desvio`}
              className="w-full px-3 py-2.5 border border-[#e7e9e4] bg-[#f3f4ef] rounded-xl outline-none focus:border-[#1B4332] focus:ring-2 focus:ring-[#52B788]/10"
              type="range"
              min={0}
              max={60}
              step={5}
              value={values.desvioMaxMin}
              onChange={e=>set("desvioMaxMin", Number(e.target.value))}
              onBlur={()=>setTouchedField("desvioMaxMin")}
              aria-valuemin={0}
              aria-valuemax={60}
              aria-valuenow={values.desvioMaxMin}
            />
            <div className="text-xs text-[#717973] mt-1">{values.desvioMaxMin} min</div>
            {touched.desvioMaxMin && errors.desvioMaxMin && <div className="text-xs text-red-600 mt-1">{errors.desvioMaxMin}</div>}
          </>
        )}
      </div>

      <div>
        <label htmlFor={`${id}-orcamento`} className="block text-xs font-semibold text-[#414844] mb-1">Orçamento máx. (€)</label>
        <input
          id={`${id}-orcamento`}
          className="w-full px-3 py-2.5 border border-[#e7e9e4] bg-[#f3f4ef] text-[#1A1C19] rounded-xl outline-none focus:border-[#1B4332] focus:ring-2 focus:ring-[#52B788]/10 placeholder:text-[#717973]"
          type="number"
          min={0}
          step={0.5}
          placeholder="Opcional"
          value={values.orcamentoMax || ""}
          onChange={e=>set("orcamentoMax", e.target.value ? Number(e.target.value) : undefined)}
          onBlur={()=>setTouchedField("orcamentoMax")}
          aria-invalid={!!errors.orcamentoMax}
        />
        {touched.orcamentoMax && errors.orcamentoMax && <div className="text-xs text-red-600 mt-1">{errors.orcamentoMax}</div>}
      </div>

      <div>
        <label htmlFor={`${id}-contacto`} className="block text-xs font-semibold text-[#414844] mb-1">Contacto</label>
        <input
          id={`${id}-contacto`}
          className="w-full px-3 py-2.5 border border-[#e7e9e4] bg-[#f3f4ef] text-[#1A1C19] rounded-xl outline-none focus:border-[#1B4332] focus:ring-2 focus:ring-[#52B788]/10 placeholder:text-[#717973]"
          placeholder="Telefone ou email"
          value={values.contacto}
          onChange={e=>set("contacto", e.target.value)}
          onBlur={()=>setTouchedField("contacto")}
          aria-invalid={!!errors.contacto}
        />
        {touched.contacto && errors.contacto && <div className="text-xs text-red-600 mt-1">{errors.contacto}</div>}
      </div>

      <fieldset aria-label="Disponibilidade">
        <legend className="block text-xs font-semibold text-[#414844] mb-1">Disponibilidade</legend>
        <label className="flex items-center gap-2 text-sm text-[#1A1C19]">
          <input type="checkbox" className="w-4 h-4 rounded border-[#c1c8c2] bg-[#f3f4ef]" checked={values.disponibilidade.manha} onChange={e=>setDisp("manha", e.target.checked)} />
          Manhã (6h-12h)
        </label>
        <label className="flex items-center gap-2 text-sm text-[#1A1C19]">
          <input type="checkbox" className="w-4 h-4 rounded border-[#c1c8c2] bg-[#f3f4ef]" checked={values.disponibilidade.tarde} onChange={e=>setDisp("tarde", e.target.checked)} />
          Tarde (12h-18h)
        </label>
        <label className="flex items-center gap-2 text-sm text-[#1A1C19]">
          <input type="checkbox" className="w-4 h-4 rounded border-[#c1c8c2] bg-[#f3f4ef]" checked={values.disponibilidade.noite} onChange={e=>setDisp("noite", e.target.checked)} />
          Noite (18h-24h)
        </label>
      </fieldset>

      <fieldset aria-label="Preferências">
        <legend className="block text-xs font-semibold text-[#414844] mb-1">Preferências</legend>
        <label className="flex items-center gap-2 text-sm text-[#1A1C19]">
          <input type="checkbox" className="w-4 h-4 rounded border-[#c1c8c2] bg-[#f3f4ef]" checked={values.preferencias.musica} onChange={e=>setPref("musica", e.target.checked)} />
          Música
        </label>
        <label className="flex items-center gap-2 text-sm text-[#1A1C19]">
          <input type="checkbox" className="w-4 h-4 rounded border-[#c1c8c2] bg-[#f3f4ef]" checked={values.preferencias.falar} onChange={e=>setPref("falar", e.target.checked)} />
          Conversa
        </label>
        <label className="flex items-center gap-2 text-sm text-[#1A1C19]">
          <input type="checkbox" className="w-4 h-4 rounded border-[#c1c8c2] bg-[#f3f4ef]" checked={values.preferencias.bagagem} onChange={e=>setPref("bagagem", e.target.checked)} />
          Levo bagagem
        </label>
        <label className="flex items-center gap-2 text-sm text-[#1A1C19]">
          <input type="checkbox" className="w-4 h-4 rounded border-[#c1c8c2] bg-[#f3f4ef]" checked={values.preferencias.animais} onChange={e=>setPref("animais", e.target.checked)} />
          Levo animais
        </label>
        <label className="flex items-center gap-2 text-sm text-[#1A1C19]">
          <input type="checkbox" className="w-4 h-4 rounded border-[#c1c8c2] bg-[#f3f4ef]" checked={values.preferencias.fumador} onChange={e=>setPref("fumador", e.target.checked)} />
          Sou fumador
        </label>
      </fieldset>

      <div>
        <label htmlFor={`${id}-obs`} className="block text-xs font-semibold text-[#414844] mb-1">Observações</label>
        <textarea
          id={`${id}-obs`}
          className="w-full px-3 py-2.5 border border-[#e7e9e4] bg-[#f3f4ef] text-[#1A1C19] rounded-xl outline-none focus:border-[#1B4332] focus:ring-2 focus:ring-[#52B788]/10 resize-none placeholder:text-[#717973]"
          rows={3}
          placeholder="Ex.: preciso de ajuda com bagagem, tenho horário flexível, etc."
          value={values.observacoes}
          onChange={e=>set("observacoes", e.target.value)}
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1" type="button" onClick={onCancel}>Cancelar</Button>
        <Button variant="outline" className="flex-1" type="submit">Procurar boleia</Button>
      </div>
    </form>
  );
}
