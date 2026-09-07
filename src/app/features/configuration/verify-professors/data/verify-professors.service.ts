import { inject, Injectable } from '@angular/core';
import { WebRequestService } from '../../../../core/service/web-request-service';

@Injectable({
  providedIn: 'root',
})
export class VerifyProfessorsService {
  private readonly webRequestService = inject(WebRequestService);
}
