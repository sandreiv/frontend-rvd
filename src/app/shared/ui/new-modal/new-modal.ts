import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { Icon } from '../icon/icon';

@Component({
  selector: 'app-new-modal',
  imports: [
    CommonModule,
    Icon,
  ],
  templateUrl: './new-modal.html',
  styleUrl: './new-modal.css',
})
export class NewModal {

  @Input() isOpen = false;

  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();

  @Input() className = '';
  @Input() showCloseButton = true;

  @Input() title = 'Danger Alert!';

  @Input() message =
    'Lorem ipsum dolor sit amet consectetur. Feugiat ipsum libero tempor felis risus nisi non. Quisque eu ut tempor curabitur.';

  @Input() buttonText = 'Okay, Got It';

  @Input() showCancelButton = false;
  @Input() cancelButtonText = 'Cancel';

  /**
   * danger:
   * comportamiento original del modal.
   *
   * warning:
   * mismo diseño original,
   * pero con signo de exclamación.
   */
  @Input() iconVariant:
    'danger' | 'warning' = 'danger';

  constructor(
    private el: ElementRef,
  ) {}

  ngOnInit() {
    if (this.isOpen) {
      document.body.style.overflow = 'hidden';
    }
  }

  ngOnDestroy() {
    document.body.style.overflow = 'unset';
  }

  ngOnChanges() {
    document.body.style.overflow =
      this.isOpen
        ? 'hidden'
        : 'unset';
  }

  onBackdropClick(
    event: MouseEvent,
  ) {
    this.close.emit();
  }

  onContentClick(
    event: MouseEvent,
  ) {
    event.stopPropagation();
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.isOpen) {
      this.close.emit();
    }
  }
}