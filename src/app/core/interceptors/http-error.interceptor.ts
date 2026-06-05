import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpResponse,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AuthService } from '../service/auth-service';
import { ToastService } from '../service/toastService';
import { BackendErrorPayload, extractBackendErrorMessage } from './model/backend-error.model';


@Injectable()
export class HttpErrorInterceptor implements HttpInterceptor {
  constructor(
    private authService: AuthService,
    private toastService: ToastService,
  ) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      tap((event: HttpEvent<any>) => {
        if (event instanceof HttpResponse) {
          this.handleSuccess(event, request);
        }
      }),
      catchError((error: HttpErrorResponse) => {
        this.handleError(error);
        return throwError(() => error);
      }),
    );
  }

  private handleSuccess(response: HttpResponse<any>, request: HttpRequest<any>): void {
    if (request.method === 'GET') {
      return;
    }

    let successMessage;
    let successTitle;
    const key = `${request.method}:${response.status}`;

    switch (key) {
      case 'POST:200':
      successTitle = 'Registro Creado';
      successMessage = response.body?.message ?? 'El registro se ha creado con exito.';
      break;

      case 'PUT:200':
      case 'PUT:201':
      case 'PATCH:200':
      case 'PATCH:201':
        successTitle = 'Registro Actualizado';
        successMessage = response.body?.message ?? 'El registro se ha actualizado con exito.';
        break;
      case 'DELETE:200':
      case 'DELETE:204':
        successTitle = 'Registro Eliminado';
        successMessage = response.body?.message ?? 'El registro se ha eliminado con exito.';
        break;
      default:
        successMessage = response.body?.message ?? 'Operacion completada exitosamente';
        successTitle = 'Exito';
        break;
    }

    this.toastService.show(successMessage, 'success', successTitle);
  }

  private handleError(error: HttpErrorResponse): void {

    const payload = error.error as BackendErrorPayload | string | null;
    const backendMessage = extractBackendErrorMessage(payload);

    let errorTitle = 'Error';

    let errorMessage = backendMessage || error.message || `Error ${error.status}: ${error.statusText || 'Desconocido'}`;
    
    switch (error.status) {
      case 400:
        errorTitle = 'Solicitud inválida';
        errorMessage = backendMessage || 'La solicitud contiene datos inválidos';
        break;
      case 401:
          errorTitle = 'No autorizado';
          errorMessage = backendMessage || 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente';
          break;
      case 403:
        errorTitle = 'Acceso Denegado';
        errorMessage = 'No tienes permisos para realizar esta acción';
        break;
      case 404:
        errorTitle = 'No encontrado';
        errorMessage = backendMessage || 'El recurso solicitado no existe';
        break;
      case 500:
        errorTitle = 'Error del servidor';
        errorMessage = backendMessage || 'Ha ocurrido un error en el servidor. Intenta más tarde';
        break;
    }

    this.toastService.show(errorMessage, 'error', errorTitle, 5000);
  }
}
