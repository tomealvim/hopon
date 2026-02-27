import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

export interface SseEvent {
  data: string; // JSON string
}

/**
 * EventsService — broadcast de eventos SSE por utilizador.
 *
 * Cada utilizador tem um Subject partilhado entre todas as suas ligações (tabs).
 * O cleanup é feito por referência: quando todas as ligações de um user fecham,
 * o Subject é removido do Map.
 */
@Injectable()
export class EventsService {
  private subjects = new Map<string, Subject<SseEvent>>();
  private counts = new Map<string, number>();

  /** Chamado pelo controller SSE — devolve Observable para este utilizador */
  subscribe(userId: string): Observable<SseEvent> {
    if (!this.subjects.has(userId)) {
      this.subjects.set(userId, new Subject<SseEvent>());
      this.counts.set(userId, 0);
    }

    this.counts.set(userId, (this.counts.get(userId) ?? 0) + 1);
    const subject = this.subjects.get(userId)!;

    return new Observable((observer) => {
      const sub = subject.subscribe(observer);
      return () => {
        sub.unsubscribe();
        const remaining = (this.counts.get(userId) ?? 1) - 1;
        if (remaining <= 0) {
          this.subjects.delete(userId);
          this.counts.delete(userId);
        } else {
          this.counts.set(userId, remaining);
        }
      };
    });
  }

  /** Emitir um evento para um utilizador específico (se estiver ligado) */
  emit(userId: string, type: string, data: Record<string, unknown> = {}): void {
    const subject = this.subjects.get(userId);
    if (subject) {
      subject.next({ data: JSON.stringify({ type, ...data }) });
    }
  }

  /** Emitir para vários utilizadores de uma vez */
  emitToMany(userIds: string[], type: string, data: Record<string, unknown> = {}): void {
    for (const userId of userIds) {
      this.emit(userId, type, data);
    }
  }
}
