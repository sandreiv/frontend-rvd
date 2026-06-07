import { inject } from '@angular/core';
import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpResponse,
} from '@angular/common/http';
import { catchError, tap, throwError } from 'rxjs';
import { ToastService } from '../service/toastService';
import {
  resolveHttpErrorToast,
  resolveHttpSuccessToast,
} from './model/http-toast-message.model';

const MUTATION_METHODS = new Set([
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
]);

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);

  return next(req).pipe(
    tap((event) => {
      if (!(event instanceof HttpResponse)) {
        return;
      }

      if (!MUTATION_METHODS.has(req.method)) {
        return;
      }

      const toast = resolveHttpSuccessToast(
        req.method,
        event.status,
        event.body,
        req.url,
      );

      toastService.show(toast.message, 'success', toast.title);
    }),
    catchError((error: HttpErrorResponse) => {
      const toast = resolveHttpErrorToast(
        req.method,
        error,
        req.url,
      );

      toastService.show(toast.message, 'error', toast.title, 5000);

      return throwError(() => error);
    }),
  );
};
