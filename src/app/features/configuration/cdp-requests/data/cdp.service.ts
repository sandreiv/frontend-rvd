import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { WebRequestService } from '../../../../core/service/web-request-service';
import { CdpContext } from '../model/cdp-context.model';

@Injectable({
  providedIn: 'root',
})
export class CdpService {

  private readonly webRequestService = inject(WebRequestService);

  private readonly endpoint = '/configuration/cdp';

  getContext(): Observable<CdpContext> {
    return this.webRequestService.get<CdpContext>(
      `${this.endpoint}/context`,
    );
  }
}