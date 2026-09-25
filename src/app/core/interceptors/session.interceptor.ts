import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../service/auth-service';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Adjunta la cookie de sesión (withCredentials) y el header CSRF en
 * mutaciones hacia la API RVD. Si el backend responde 403 por CSRF,
 * renueva el token y reintenta una sola vez.
 *
 * No se usa el HttpXsrfInterceptor de Angular: ignora URLs absolutas y no
 * puede leer la cookie XSRF-TOKEN cuando la API está en otro host.
 */
export const sessionInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.api.baseUrl)) {
    return next(req);
  }

  const authService = inject(AuthService);

  if (!MUTATING_METHODS.has(req.method)) {
    return next(withSession(req, authService));
  }

  return next(withSession(req, authService)).pipe(
    catchError((error: HttpErrorResponse) => {
      if (!isCsrfError(error, authService)) {
        return throwError(() => error);
      }

      return from(authService.refreshCsrf()).pipe(
        switchMap(() => next(withSession(req, authService))),
      );
    }),
  );
};

function withSession(
  req: HttpRequest<unknown>,
  authService: AuthService,
): HttpRequest<unknown> {
  const token = authService.csrfToken();
  const needsCsrf = MUTATING_METHODS.has(req.method) && Boolean(token);

  const headers = needsCsrf
    ? req.headers.set(authService.csrfHeaderName(), token as string)
    : req.headers;

  return req.clone({ withCredentials: true, headers });
}

function isCsrfError(
  error: HttpErrorResponse,
  authService: AuthService,
): boolean {
  if (error.status !== 403) {
    return false;
  }

  if (!authService.csrfToken()) {
    return true;
  }

  return /csrf|xsrf/i.test(readErrorText(error.error));
}

function readErrorText(body: unknown): string {
  if (typeof body === 'string') {
    return body;
  }

  if (!body || typeof body !== 'object') {
    return '';
  }

  try {
    return JSON.stringify(body);
  } catch {
    return '';
  }
}
