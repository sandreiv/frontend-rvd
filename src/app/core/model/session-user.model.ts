export interface SessionUser {
  username: string;
  nombreCompleto: string;
  idPersona: number | string | null;
  roles: string[];
  idAplicacion: number;
}

/**
 * Respuesta de POST /api/auth/bootstrap y GET /api/auth/me.
 * No trae tokens: la sesión viaja en la cookie HttpOnly RVD_SESSION.
 */
export interface SessionResponse {
  username?: string;
  nombreCompleto?: string;
  idPersona?: string | number | null;
  roles?: string[];
  usuario?: SessionUser;
  expiresAt?: string;
  csrfHeaderName?: string;
  csrfToken?: string;
}

/**
 * Respuesta de GET /api/auth/csrf.
 */
export interface CsrfResponse {
  headerName: string;
  token: string;
}
