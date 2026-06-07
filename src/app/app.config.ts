import {
  ApplicationConfig,
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

import { routes } from './app.routes';
import { APP_CONFIG } from './core/config/app-config.token';
import { environment } from '../environments/environment';
import { httpErrorInterceptor } from './core/interceptors/http-error.interceptor';
import { TOAST_POSITION } from './core/config/toast-style.config';

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
      withInterceptors([httpErrorInterceptor]),
    ),
    provideRouter(routes),
    { provide: APP_CONFIG, useValue: environment },
  ],
};
