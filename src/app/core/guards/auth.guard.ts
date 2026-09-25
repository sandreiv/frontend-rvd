import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../service/auth-service';
import { MenuService } from '../service/menu-service';

/**
 * Rutas privadas: si no hay sesión en memoria intenta restaurarla desde la
 * cookie (GET /me); si sigue sin sesión, vuelve a Vortal.
 */
export const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const menuService = inject(MenuService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  if (await authService.restore()) {
    await firstValueFrom(menuService.load());
    return true;
  }

  const vortalUrl = environment.auth.logoutRedirectUrl;

  if (environment.production && vortalUrl.startsWith('http')) {
    window.location.assign(vortalUrl);
    return false;
  }

  return router.parseUrl(environment.auth.sessionRequiredUrl);
};
