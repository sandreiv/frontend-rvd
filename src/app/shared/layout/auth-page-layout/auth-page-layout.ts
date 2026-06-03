import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ThemeToggleButtonTwo } from '../../components/common/theme-toggle-button-two/theme-toggle-button-two';
import { GridShape } from '../../components/common/grid-shape/grid-shape';

@Component({
  selector: 'app-auth-page-layout',
  imports: [RouterModule, ThemeToggleButtonTwo, GridShape],
  templateUrl: './auth-page-layout.html',
  styleUrl: './auth-page-layout.css',
})
export class AuthPageLayout {}
