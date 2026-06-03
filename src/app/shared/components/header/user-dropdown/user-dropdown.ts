import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import { AuthService } from '../../../../core/service/auth-service';
import { Avatar } from '../../../ui/avatar/avatar';
import { AvatarText } from '../../../ui/avatar/avatar-text';
import { Icon } from '../../../ui/icon/icon';

@Component({
  selector: 'app-user-dropdown',
  imports: [CommonModule, RouterModule, Avatar, AvatarText, Icon],
  templateUrl: './user-dropdown.html',
  styleUrl: './user-dropdown.css',
})
export class UserDropdown {
  


}