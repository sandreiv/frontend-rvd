import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { CdpService } from '../../data/cdp.service';
import { CdpSearchResult } from '../../model/cdp-context.model';
import { Button } from '../../../../../shared/ui/button/button';
import { InputField } from '../../../../../shared/components/form/input/input-field';
import { Modal } from '../../../../../shared/ui/modal/modal';

@Component({
  selector: 'app-cdp-search-modal',
  imports: [Button, InputField, Modal],
  templateUrl: './cdp-search-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CdpSearchModal {
  private readonly cdpService = inject(CdpService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isOpen = input(false);
  readonly idUnidad = input<number | null>(null);
  readonly anioVigencia = input<number | null>(null);

  readonly close = output<void>();
  readonly select = output<CdpSearchResult>();

  readonly hasSearchedCdps = signal(false);
  readonly cdpSearchQuery = signal('');
  readonly cdpSearchResults = signal<CdpSearchResult[]>([]);
  readonly isSearchingCdps = signal(false);

  searchCdps(): void {
    const numeroCdp = this.cdpSearchQuery().trim();
    const idUnidad = this.idUnidad();
    const anioVigencia = this.anioVigencia();

    if (!numeroCdp || !idUnidad || !anioVigencia) return;

    if (this.isSearchingCdps()) {
        return;
    }

    this.hasSearchedCdps.set(true);
    this.isSearchingCdps.set(true);
    this.cdpSearchResults.set([]);
    
    this.cdpService
      .searchCdpResults(numeroCdp, idUnidad, anioVigencia)
      .pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.isSearchingCdps.set(false)),
    )
    .subscribe({
      next: (results) => {
        this.cdpSearchResults.set(results ?? []);
      }
    })
  }

  selectCdp(cdp: CdpSearchResult): void {
    this.select.emit(cdp);
    this.close.emit();
  }

  closeModal(): void {
    this.close.emit();
  }

  onCdpSearchQueryChange(value: string | number): void {
    this.cdpSearchQuery.set(String(value));
  }
}