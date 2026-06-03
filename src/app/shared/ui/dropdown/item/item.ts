import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-item',
  imports: [CommonModule],
  templateUrl: './item.html',
  styleUrl: './item.css',
})
export class Item {
  @Input() to?: string;
  @Input() baseClassName =
    'block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900';
  @Input() className =
    'flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300';
  @Output() itemClick = new EventEmitter<void>();

  get combinedClasses(): string {
    return `${this.baseClassName} ${this.className}`.trim();
  }

  handleClick(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.itemClick.emit();
  }
}
