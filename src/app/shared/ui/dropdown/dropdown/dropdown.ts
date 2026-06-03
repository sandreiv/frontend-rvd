import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dropdown',
  imports: [CommonModule],
  templateUrl: './dropdown.html',
  styleUrl: './dropdown.css',
})
export class Dropdown implements AfterViewInit, OnChanges, OnDestroy {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Input() className = 'w-40 p-2';
  @Input() showArrow = false;
  @Input() arrowClassName = 'right-6';
  @Input() anchor: HTMLElement | null = null;
  @Input() gap = 4;

  @ViewChild('dropdownRef') dropdownRef!: ElementRef<HTMLDivElement>;

  top = 0;
  left = 0;
  isPositioned = false;
  placement: 'top' | 'bottom' = 'bottom';

  private repositionRaf = 0;

  private handleClickOutside = (event: MouseEvent) => {
    if (
      this.isOpen &&
      this.dropdownRef &&
      this.dropdownRef.nativeElement &&
      !this.dropdownRef.nativeElement.contains(event.target as Node) &&
      !(event.target as HTMLElement).closest('.dropdown-toggle')
    ) {
      this.close.emit();
    }
  };

  private handleViewportChange = () => {
    if (!this.isOpen) {
      return;
    }

    this.scheduleReposition();
  };

  ngAfterViewInit() {
    document.addEventListener('mousedown', this.handleClickOutside);
    window.addEventListener('resize', this.handleViewportChange);
    document.addEventListener('scroll', this.handleViewportChange, true);

    if (this.isOpen) {
      this.scheduleReposition();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']) {
      if (this.isOpen) {
        this.scheduleReposition();
        return;
      }

      this.isPositioned = false;
    }

    if (changes['anchor'] && this.isOpen) {
      this.scheduleReposition();
    }
  }

  ngOnDestroy() {
    document.removeEventListener('mousedown', this.handleClickOutside);
    window.removeEventListener('resize', this.handleViewportChange);
    document.removeEventListener('scroll', this.handleViewportChange, true);

    if (this.repositionRaf) {
      cancelAnimationFrame(this.repositionRaf);
    }
  }

  private scheduleReposition(): void {
    if (this.repositionRaf) {
      cancelAnimationFrame(this.repositionRaf);
    }

    this.repositionRaf = requestAnimationFrame(() => {
      this.repositionRaf = 0;
      this.reposition();
    });
  }

  private reposition(): void {
    if (!this.isOpen || !this.dropdownRef?.nativeElement || !this.anchor) {
      return;
    }

    const triggerRect = this.anchor.getBoundingClientRect();
    const menuRect = this.dropdownRef.nativeElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const gap = Math.max(0, this.gap);

    let top = triggerRect.bottom + gap;
    this.placement = 'bottom';
    if (top + menuRect.height > viewportHeight - gap) {
      top = Math.max(triggerRect.top - menuRect.height - gap, gap);
      this.placement = 'top';
    }

    const preferredLeft = triggerRect.right - menuRect.width;
    const maxLeft = Math.max(gap, viewportWidth - menuRect.width - gap);
    const left = Math.min(Math.max(preferredLeft, gap), maxLeft);

    this.top = top;
    this.left = left;
    this.isPositioned = true;
  }
}
