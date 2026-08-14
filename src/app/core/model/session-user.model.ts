export interface SessionUser {
  username: string;
  idPersona: number | string | null;
  roles: string[];
  idAplicacion: number;
}

export interface BootstrapResponse {
  accessToken: string;
  type?: string;
  username?: string;
  idPersona?: string | number;
  roles?: string[];
  usuario?: SessionUser;
}
