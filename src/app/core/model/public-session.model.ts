export interface PublicAccessRequest {
  numeroDocumento: string;
  fechaExpedicion: string;
}

export interface PublicTeacher {
  numeroDocumento: string;
  nombreCompleto: string;
}

export interface PublicSessionResponse {
  accessToken: string;
  docente: PublicTeacher;
}
