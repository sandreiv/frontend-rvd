/**
 * Interfaz de configuración por feature de API
 */
export interface FeatureApiConfig {
  baseUrl: string;
}

/**
 * Interfaz de endpoints disponibles
 *
 * Usa [key: string]: string para ser completamente flexible
 * No necesitas modificar esta interfaz para agregar nuevos endpoints
 * Solo agrega en environment.ts y listo
 *
 * Ejemplo de uso:
 * - environment.api.endpoints.auth → '/auth'
 * - environment.api.endpoints.usuarios → '/usuarios'
 * - environment.api.endpoints.cualquierEndpoint → '/path'
 */
export interface ApiEndpoints {
  [key: string]: string;
}

/**
 * Interfaz de configuración de autenticación
 */
export interface AuthConfig {
  mockDelayMs: number;
  tokenStorageKey: string;
  userEmailStorageKey: string;
  loginRedirectUrl: string;
  logoutRedirectUrl: string;
}

/**
 * Configuración visual institucional del sidebar
 */
export interface SidebarThemeConfig {
  color: string;
}

/**
 * Interfaz de configuración global de la aplicación
 */
export interface AppConfig {
  production: boolean;
  api: {
    baseUrl: string;
    endpoints: ApiEndpoints;
  };
  auth: AuthConfig;
  sidebarTheme: SidebarThemeConfig;
}

