import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterModule } from '@angular/router';

import { AuthService } from '../../../../core/service/auth-service';
import { AvatarText } from '../../../ui/avatar/avatar-text';
import { Icon } from '../../../ui/icon/icon';

@Component({
  selector: 'app-user-dropdown',
  imports: [CommonModule, RouterModule, AvatarText, Icon],
  templateUrl: './user-dropdown.html',
  styleUrl: './user-dropdown.css',
})
export class UserDropdown {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly authService = inject(AuthService);

  readonly isOpen = signal(false);

  readonly user = computed(() => this.authService.currentUser());

  readonly displayName = computed(() => {
    return this.user()?.username?.trim() || 'Usuario';
  });

  toggleDropdown(): void {
    this.isOpen.update((value) => !value);
  }

  closeDropdown(): void {
    this.isOpen.set(false);
  }

  onLogout(): void {
    this.closeDropdown();
    this.authService.logout();
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentMouseDown(event: MouseEvent): void {
    if (!this.isOpen()) {
      return;
    }

    const target = event.target as Node | null;
    const root = this.elementRef.nativeElement;

    if (root && target && !root.contains(target)) {
      this.closeDropdown();
    }
  }
}
