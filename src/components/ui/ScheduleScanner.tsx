import { useState, useRef } from "react";
import { extractTextFromImage } from "../../services/googleVision";
import { useNotifications } from "../../contexts/NotificationContext";
import type { UserSchedule, DaySchedule, TimeBlock } from "../../pages/types/user";
import Spinner from "./Spinner";

interface ScheduleScannerProps {
  onScheduleExtracted: (schedule: UserSchedule, rawText: string) => void;
  onCancel: () => void;
}

export default function ScheduleScanner({ onScheduleExtracted, onCancel }: ScheduleScannerProps) {
  const { showError } = useNotifications();
  const [image, setImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async () => {
    if (!image) return;

    setIsProcessing(true);

    try {
      // Usar Google Vision API para extrair texto
      const extractedText = await extractTextFromImage(image);

      console.log("Texto extraído pelo Google Vision:", extractedText);

      // Parser inteligente para extrair horários
      const parsedSchedule = parseScheduleFromText(extractedText);
      
      setIsProcessing(false);

      // Passa o schedule E o texto original para confirmação
      onScheduleExtracted(parsedSchedule, extractedText);
    } catch (error) {
      console.error("Erro ao processar imagem:", error);
      setIsProcessing(false);
      showError("Erro ao processar", "Tenta novamente ou insere manualmente.");
    }
  };

  // Parser por segmentos de dia: usa linhas de cabeçalho (2.ª/3.ª/4.ª...) para delimitar colunas
  const parseScheduleFromText = (text: string): UserSchedule => {
    const lines = text.split('\n');

    const timeRegex = /\b(\d{1,2}):(\d{2})\b/g;
    const subjectRegex = /\b[A-ZÇ]{2,}(?:\s?[IVX]+)?(?:\s?I)?(?:\s?-?\s?(?:T|TP|P))\b/g;
    const roomRegex = /\b(?:TA-)?[ASLC][0-9]{2,3}(?:\/[ASLC][0-9]{2,3})?\b/g;

    // Encontrar cabeçalhos de dias e criar segmentos
    const dayDefs: Array<{ rx: RegExp; key: DaySchedule["day"] }> = [
      { rx: /2\.?\s*[ªº]?\s*feira|segunda|\bseg\b/i, key: "segunda" },
      { rx: /3\.?\s*[ªº]?\s*feira|ter[cç]a|\bter\b/i, key: "terca" },
      { rx: /4\.?\s*[ªº]?\s*feira|quarta|\bqua\b/i, key: "quarta" },
      { rx: /5\.?\s*[ªº]?\s*feira|quinta|\bqui\b/i, key: "quinta" },
      { rx: /6\.?\s*[ªº]?\s*feira|sexta|\bsex\b/i, key: "sexta" },
      { rx: /s[aá]bado|\bsab\b/i, key: "sabado" },
    ];

    const headers: Array<{ key: DaySchedule["day"]; line: number }> = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = dayDefs.find(d => d.rx.test(line));
      if (match) headers.push({ key: match.key, line: i });
    }

    // Ordenar por aparição e criar intervalos [start, end]
    headers.sort((a, b) => a.line - b.line);
    const segments: Array<{ key: DaySchedule["day"]; start: number; end: number }> = [];
    for (let i = 0; i < headers.length; i++) {
      const start = headers[i].line;
      const end = i < headers.length - 1 ? headers[i + 1].line - 1 : lines.length - 1;
      segments.push({ key: headers[i].key, start, end });
    }

    const days: DaySchedule[] = [];

    // Para cada segmento (dia), procurar subjects e aproximar tempos/salas
    segments.forEach(({ key, start, end }) => {
      const subjects: Array<{ title: string; line: number }> = [];
      const rooms: Array<{ room: string; line: number }> = [];
      const times: Array<{ time: string; line: number }> = [];

      for (let i = start; i <= end; i++) {
        const line = lines[i];
        for (const m of line.matchAll(subjectRegex)) {
          const title = m[0]
            .replace(/\s+/g, ' ')
            .replace(/\bI -/g, 'I-')
            .trim();
          subjects.push({ title, line: i });
        }
        for (const m of line.matchAll(roomRegex)) {
          rooms.push({ room: m[0], line: i });
        }
        for (const m of line.matchAll(timeRegex)) {
          const hh = m[1].padStart(2, '0');
          const mm = m[2];
          times.push({ time: `${hh}:${mm}`, line: i });
        }
      }

      const blocks: TimeBlock[] = [];
      subjects.forEach((s, idx) => {
        const nextSubjLine = idx < subjects.length - 1 ? subjects[idx + 1].line : end + 1;
        const wStart = Math.max(start, s.line - 8);
        const wEnd = Math.min(end, Math.max(s.line + 8, nextSubjLine - 1));

        const windowTimes = times
          .filter(t => t.line >= wStart && t.line <= wEnd)
          .map(t => t.time);

        const uniq = Array.from(new Set(windowTimes)).sort();
        if (uniq.length < 1) return;

        const startTime = uniq[0];
        let endTime = uniq.length > 1 ? uniq[uniq.length - 1] : startTime;

        // limitar duração 30..150min
        const [ah, am] = startTime.split(':').map(Number);
        let [bh, bm] = endTime.split(':').map(Number);
        let dur = (bh * 60 + bm) - (ah * 60 + am);
        if (dur < 30 && uniq.length >= 2) {
          // escolher próximo tempo viável
          for (let i = 1; i < uniq.length; i++) {
            [bh, bm] = uniq[i].split(':').map(Number);
            dur = (bh * 60 + bm) - (ah * 60 + am);
            if (dur >= 30) { endTime = uniq[i]; break; }
          }
        }
        if (dur > 150) {
          for (let i = uniq.length - 2; i >= 1; i--) {
            [bh, bm] = uniq[i].split(':').map(Number);
            dur = (bh * 60 + bm) - (ah * 60 + am);
            if (dur >= 30 && dur <= 150) { endTime = uniq[i]; break; }
          }
        }

        // sala mais próxima dentro da janela
        let room: string | undefined;
        let best = Number.POSITIVE_INFINITY;
        rooms.forEach(r => {
          const d = Math.abs(r.line - s.line);
          if (r.line >= wStart && r.line <= wEnd && d < best && d <= 6) {
            best = d;
            room = r.room;
          }
        });

        blocks.push({
          id: `b_${key}_${s.line}_${Math.random().toString(36).slice(2,7)}`,
          start: startTime,
          end: endTime,
          title: s.title,
          room,
        });
      });

      if (blocks.length > 0) {
        // ordenar por hora
        blocks.sort((a, b) => a.start.localeCompare(b.start));
        days.push({ day: key, blocks });
      }
    });

    return { days };
  };

  return (
    <div className="bg-white rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Digitalizar Horário</h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-3xl text-gray-400 hover:text-gray-600 transition"
          aria-label="Fechar"
        >
          ×
        </button>
      </div>

      {!image ? (
        <div className="py-8">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            id="schedule-upload-file"
            aria-label="Escolher ficheiro do horário"
          />
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageUpload}
            className="hidden"
            id="schedule-upload-camera"
            aria-label="Tirar foto do horário"
          />
          
          <div className="grid grid-cols-2 gap-4">
            <label htmlFor="schedule-upload-camera" className="flex flex-col items-center justify-center gap-3 p-6 bg-gray-50 hover:bg-gray-100 border-2 border-gray-200 border-dashed rounded-xl cursor-pointer transition">
              <div className="text-5xl">📷</div>
              <p className="text-sm font-medium text-gray-700">Tirar foto</p>
            </label>
            
            <label htmlFor="schedule-upload-file" className="flex flex-col items-center justify-center gap-3 p-6 bg-gray-50 hover:bg-gray-100 border-2 border-gray-200 border-dashed rounded-xl cursor-pointer transition">
              <div className="text-5xl">🖼️</div>
              <p className="text-sm font-medium text-gray-700">Escolher ficheiro</p>
            </label>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <img src={image} alt="Horário carregado" className="w-full rounded-xl border border-gray-200" />

          {isProcessing && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Spinner size="lg" className="text-black" />
              <p className="text-sm text-gray-600">A extrair texto com Google Vision...</p>
            </div>
          )}

          {!isProcessing && (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setImage(null)}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition"
              >
                Escolher outra
              </button>
              <button
                type="button"
                onClick={processImage}
                className="flex-1 px-4 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition"
              >
                Extrair Horário
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-900">
        💡 <strong>Dica:</strong> Tira uma foto nítida do teu horário com boa iluminação para melhores resultados.
      </div>
    </div>
  );
}
