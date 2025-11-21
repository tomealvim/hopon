// Formatação de datas para labels tipo "Hoje", "Amanhã", "Segunda", "Ter. • 16 out", etc

export function formatDayLabel(iso: string, opts?: { withTime?: boolean }) {
  const d = new Date(iso);
  const now = new Date();

  const toLocal = (x: Date) => x; // (se precisares de lib para TZ, trocamos depois)
  const dd = toLocal(d);
  const nn = toLocal(now);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const tomorrow = new Date(nn); tomorrow.setDate(nn.getDate() + 1);

  const time = dd.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
  const weekdayShort = dd.toLocaleDateString("pt-PT", { weekday: "short" }); // seg., ter., …
  const dayNum = dd.toLocaleDateString("pt-PT", { day: "2-digit", month: "short" }); // 16/ out

  if (isSameDay(dd, nn)) return { label: "Hoje", sub: opts?.withTime ? time : undefined, key: "today" as const };
  if (isSameDay(dd, tomorrow)) return { label: "Amanhã", sub: opts?.withTime ? time : undefined, key: "tomorrow" as const };

  // mesma semana? (segunda como início)
  const startOfWeek = new Date(nn); const day = (nn.getDay() + 6) % 7; // 0=Mon
  startOfWeek.setDate(nn.getDate() - day);
  const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 6);

  const inSameWeek = dd >= startOfWeek && dd <= endOfWeek;
  if (inSameWeek) return { label: capitalize(weekdayShort.replace(".", "")), sub: opts?.withTime ? time : undefined, key: "week" as const };

  return { label: `${capitalize(weekdayShort.replace(".", ""))} • ${dayNum}`, sub: opts?.withTime ? time : undefined, key: "later" as const };
}

export function groupByDay<T>(items: T[], getIso: (t: T) => string) {
  return items.reduce<Record<string, T[]>>((acc, it) => {
    const f = formatDayLabel(getIso(it));
    const k = f.key === "week" ? f.label : f.label; // usar label como header
    acc[k] = acc[k] || [];
    acc[k].push(it);
    return acc;
  }, {});
}

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
