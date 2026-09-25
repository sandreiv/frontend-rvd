import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import {
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHotToastConfig } from '@ngxpert/hot-toast';
import { firstValueFrom } from 'rxjs';

import { routes } from './app.routes';
import { APP_CONFIG } from './core/config/app-config.token';
import { environment } from '../environments/environment';
import { httpErrorInterceptor } from './core/interceptors/http-error.interceptor';
import { sessionInterceptor } from './core/interceptors/session.interceptor';
import { AuthService } from './core/service/auth-service';
import { MenuService } from './core/service/menu-service';
import { TOAST_POSITION } from './shared/ui/toast/config/toast-style.config';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideAnimations(),
    provideHotToastConfig({
      position: TOAST_POSITION,
      dismissible: true,
      duration: 4000,
      visibleToasts: 5,
      theme: 'material',
    }),
    provideHttpClient(
      withFetch(),
      // httpErrorInterceptor por fuera: ve el resultado final tras el
      // reintento de CSRF que hace sessionInterceptor.
      withInterceptors([httpErrorInterceptor, sessionInterceptor]),
    ),
    provideRouter(routes),
    provideAppInitializer(async () => {
      const authService = inject(AuthService);
      const menuService = inject(MenuService);

      const ok = await authService.initSession();

      if (!ok) {
        return;
      }

      await firstValueFrom(menuService.load());
    }),
    { provide: APP_CONFIG, useValue: environment },
  ],
};
