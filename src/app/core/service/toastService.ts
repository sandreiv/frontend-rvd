import { Injectable, signal } from '@angular/core';
import { Toast } from '../../shared/ui/toast/toas.model';


@Injectable({ providedIn: 'root' })
export class ToastService {
  private counter = 0;

  toasts = signal<Toast[]>([]);

  show(
    message: string,
    type: Toast['type'] = 'info',
    title?: string,
    durationMs: number = 4000,
  ) {
    const id = ++this.counter;

    this.toasts.update((t) => [...t, { id, title, message, type }]);

    setTimeout(() => this.remove(id), durationMs);
  }

  remove(id: number) {
    this.toasts.update((t) => t.filter((toast) => toast.id !== id));
  }
}
