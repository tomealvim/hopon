import { useEffect, useRef, useState } from "react";

interface TimePickerProps {
  value: string; // formato "HH:MM"
  onChange: (value: string) => void;
  label?: string;
  minTime?: string; // hora mínima permitida (formato "HH:MM")
}

export default function TimePicker({ value, onChange, label, minTime }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hours, minutes] = value.split(":").map(Number);
  
  const hoursRef = useRef<HTMLDivElement>(null);
  const minutesRef = useRef<HTMLDivElement>(null);

  const minHours = minTime ? parseInt(minTime.split(":")[0]) : 0;
  const minMinutes = minTime ? parseInt(minTime.split(":")[1]) : 0;

  const isTimeValid = (h: number, m: number) => {
    if (!minTime) return true;
    const selectedTime = h * 60 + m;
    const minTimeValue = minHours * 60 + minMinutes;
    return selectedTime > minTimeValue; // Tem de ser DEPOIS da hora mínima
  };

  const handleHourChange = (h: number) => {
    let newMinutes = minutes;
    // Se escolher a mesma hora que o mínimo, ajustar os minutos
    if (minTime && h === minHours && minutes <= minMinutes) {
      newMinutes = minMinutes + 1;
      if (newMinutes >= 60) {
        h = h + 1;
        newMinutes = 0;
      }
    }
    const newValue = `${h.toString().padStart(2, "0")}:${newMinutes.toString().padStart(2, "0")}`;
    onChange(newValue);
  };

  const handleMinuteChange = (m: number) => {
    if (!isTimeValid(hours, m)) return;
    const newValue = `${hours.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
    onChange(newValue);
  };

  const scrollToSelected = () => {
    setTimeout(() => {
      if (hoursRef.current) {
        const hourItem = hoursRef.current.querySelector(`[data-value="${hours}"]`) as HTMLElement;
        if (hourItem) {
          const scrollTop = hourItem.offsetTop - hoursRef.current.offsetHeight / 2 + hourItem.offsetHeight / 2;
          hoursRef.current.scrollTo({ top: scrollTop, behavior: 'smooth' });
        }
      }
      if (minutesRef.current) {
        const minuteItem = minutesRef.current.querySelector(`[data-value="${minutes}"]`) as HTMLElement;
        if (minuteItem) {
          const scrollTop = minuteItem.offsetTop - minutesRef.current.offsetHeight / 2 + minuteItem.offsetHeight / 2;
          minutesRef.current.scrollTo({ top: scrollTop, behavior: 'smooth' });
        }
      }
    }, 100);
  };

  useEffect(() => {
    if (isOpen) {
      scrollToSelected();
      // Prevenir scroll do body quando modal está aberto
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <div>
      {label && <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>}
      
      <button
        type="button"
        className="w-full px-3 py-2.5 border border-gray-200 bg-gray-50 text-gray-900 rounded-xl outline-none focus:border-[#FF719A] focus:ring-2 focus:ring-[#FF719A]/20 text-center font-medium"
        onClick={() => setIsOpen(true)}
      >
        <span>{value}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-end justify-center" onClick={() => setIsOpen(false)}>
          <div className="bg-white border border-gray-200 rounded-t-3xl w-full max-w-md pb-safe" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <button
                type="button"
                className="text-sm text-gray-600 hover:text-gray-900"
                onClick={() => setIsOpen(false)}
              >
                Cancelar
              </button>
              <div className="text-sm font-semibold text-gray-900">{label || "Escolher hora"}</div>
              <button
                type="button"
                className="text-sm text-white font-medium hover:text-gray-900/80"
                onClick={() => setIsOpen(false)}
              >
                OK
              </button>
            </div>

            <div className="relative py-6">
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-10 border-y border-gray-200 pointer-events-none" />
              
              <div className="flex justify-center items-center gap-2">
                <div className="h-48 overflow-y-auto scrollbar-none" ref={hoursRef}>
                  <div className="h-20" />
                  {Array.from({ length: 24 }, (_, i) => {
                    const isDisabled = Boolean(minTime && i < minHours);
                    return (
                      <button
                        key={i}
                        type="button"
                        className={`block w-16 h-10 text-center ${hours === i ? "text-lg font-bold text-gray-900" : "text-gray-400"} ${isDisabled ? "opacity-30 cursor-not-allowed" : "hover:text-gray-900/80"}`}
                        data-value={i}
                        onClick={() => !isDisabled && handleHourChange(i)}
                        disabled={isDisabled}
                      >
                        {i.toString().padStart(2, "0")}
                      </button>
                    );
                  })}
                  <div className="h-20" />
                </div>

                <div className="text-2xl font-bold text-gray-300">:</div>

                <div className="h-48 overflow-y-auto scrollbar-none" ref={minutesRef}>
                  <div className="h-20" />
                  {Array.from({ length: 60 }, (_, i) => {
                    const isDisabled = !isTimeValid(hours, i);
                    return (
                      <button
                        key={i}
                        type="button"
                        className={`block w-16 h-10 text-center ${minutes === i ? "text-lg font-bold text-gray-900" : "text-gray-400"} ${isDisabled ? "opacity-30 cursor-not-allowed" : "hover:text-gray-900/80"}`}
                        data-value={i}
                        onClick={() => !isDisabled && handleMinuteChange(i)}
                        disabled={isDisabled}
                      >
                        {i.toString().padStart(2, "0")}
                      </button>
                    );
                  })}
                  <div className="h-20" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

