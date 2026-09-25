import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CsrfResponse,
  SessionResponse,
  SessionUser,
} from '../model/session-user.model';
import { WebRequestService } from './web-request-service';

const AUTH_ENDPOINT = '/api/auth';
const DEFAULT_CSRF_HEADER = 'X-XSRF-TOKEN';

/**
 * Sesión RVD basada en cookie HttpOnly (RVD_SESSION).
 * El JWT de Vortal se entrega una sola vez en bootstrap y nunca se guarda
 * en el cliente; los datos del usuario y el token CSRF llegan en el body.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly router = inject(Router);
  private readonly webRequestService = inject(WebRequestService);

  private readonly bootstrapError = signal<string | null>(null);

  readonly currentUser = signal<SessionUser | null>(null);
  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly expiresAt = signal<string | null>(null);
  readonly csrfHeaderName = signal(DEFAULT_CSRF_HEADER);
  readonly csrfToken = signal<string | null>(null);

  consumeBootstrapError(): string | null {
    const message = this.bootstrapError();
    this.bootstrapError.set(null);
    return message;
  }

  getRoles(): string[] {
    return this.currentUser()?.roles ?? [];
  }

  /**
   * Arranque: consume #access_token de Vortal si viene en la URL;
   * si no, intenta restaurar la sesión desde la cookie (GET /me).
   */
  async initSession(): Promise<boolean> {
    const fromHash = this.readAccessTokenFromHash();

    if (fromHash) {
      return this.bootstrapWithToken(fromHash);
    }

    return this.restore();
  }

  /**
   * Entrega el JWT de Vortal al backend, que responde con la cookie de sesión.
   */
  async bootstrapWithToken(accessToken: string): Promise<boolean> {
    try {
      const res = await firstValueFrom(
        this.webRequestService.post<SessionResponse>(
          `${AUTH_ENDPOINT}/bootstrap`,
          { accessToken },
        ),
      );

      this.clearHashFromUrl();
      this.applySession(res);
      return true;
    } catch (err: unknown) {
      this.clearHashFromUrl();
      this.bootstrapError.set(resolveBootstrapError(err));
      this.clearLocalSession();
      return false;
    }
  }

  /**
   * Restaura la sesión (por ejemplo al recargar) a partir de la cookie.
   */
  async restore(): Promise<boolean> {
    try {
      const res = await firstValueFrom(
        this.webRequestService.get<SessionResponse>(`${AUTH_ENDPOINT}/me`),
      );

      this.applySession(res);
      return true;
    } catch {
      this.clearLocalSession();
      return false;
    }
  }

  /**
   * Renueva el token CSRF (double submit) tras un 403 de CSRF.
   */
  async refreshCsrf(): Promise<void> {
    const csrf = await firstValueFrom(
      this.webRequestService.get<CsrfResponse>(`${AUTH_ENDPOINT}/csrf`),
    );

    this.csrfHeaderName.set(csrf.headerName || DEFAULT_CSRF_HEADER);
    this.csrfToken.set(csrf.token ?? null);
  }

  /**
   * Árbol de funcionalidades del usuario; RVD lo obtiene de SecurityAuth.
   */
  menu(): Observable<unknown> {
    return this.webRequestService.get<unknown>(`${AUTH_ENDPOINT}/menu`);
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(
        this.webRequestService.post<void>(`${AUTH_ENDPOINT}/logout`, {}),
      );
    } catch {
      // La sesión local se limpia igual aunque el servidor no responda.
    }

    this.clearLocalSession();
    this.redirectAfterLogout();
  }

  /**
   * Sesión inválida o vencida (401): limpiar y volver a Vortal
   * para un nuevo bootstrap, sin llamar al servidor.
   */
  handleSessionExpired(): void {
    this.clearLocalSession();
    this.redirectAfterLogout();
  }

  private applySession(res: SessionResponse): void {
    this.currentUser.set(resolveSessionUser(res));
    this.expiresAt.set(res.expiresAt ?? null);
    this.csrfHeaderName.set(res.csrfHeaderName || DEFAULT_CSRF_HEADER);
    this.csrfToken.set(res.csrfToken ?? null);
  }

  private clearLocalSession(): void {
    this.currentUser.set(null);
    this.expiresAt.set(null);
    this.csrfToken.set(null);
  }

  private readAccessTokenFromHash(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const raw = window.location.hash.replace(/^#/, '');

    if (!raw) {
      return null;
    }

    const accessToken = new URLSearchParams(raw).get('access_token');
    return accessToken?.trim() ? accessToken.trim() : null;
  }

  private clearHashFromUrl(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const path = window.location.pathname + window.location.search;
    window.history.replaceState(null, '', path);
  }

  private redirectAfterLogout(): void {
    const vortalUrl = environment.auth.logoutRedirectUrl;

    if (vortalUrl.startsWith('http')) {
      window.location.assign(vortalUrl);
      return;
    }

    void this.router.navigate([environment.auth.sessionRequiredUrl]);
  }
}

function resolveSessionUser(res: SessionResponse): SessionUser {
  const fromUsuario = res.usuario;
  const roles = fromUsuario?.roles ?? res.roles ?? [];
  const username = fromUsuario?.username ?? res.username ?? '';
  const nombreCompleto =
    fromUsuario?.nombreCompleto?.trim() ||
    res.nombreCompleto?.trim() ||
    username;

  return {
    username,
    nombreCompleto,
    idPersona: fromUsuario?.idPersona ?? res.idPersona ?? null,
    roles: Array.isArray(roles) ? roles : [],
    idAplicacion:
      fromUsuario?.idAplicacion ?? environment.auth.applicationId,
  };
}

interface HttpErrorLike {
  status?: number;
  error?: { message?: string; mensaje?: string } | string;
  message?: string;
}

function resolveBootstrapError(err: unknown): string {
  const httpErr = err as HttpErrorLike;
  const backendMessage = readBackendMessage(httpErr);

  if (httpErr?.status === 401) {
    return backendMessage ?? 'Sesión de Vortal inválida o expirada.';
  }

  if (httpErr?.status === 403) {
    return backendMessage ?? 'Usuario no asociado a RVD. Contacte soporte.';
  }

  return backendMessage ?? 'No se pudo validar la sesión de Vortal.';
}

function readBackendMessage(httpErr: HttpErrorLike): string | null {
  if (typeof httpErr?.error === 'string') {
    return httpErr.error;
  }

  if (typeof httpErr?.error === 'object') {
    return httpErr.error?.message ?? httpErr.error?.mensaje ?? null;
  }

  return httpErr?.message ?? null;
}
