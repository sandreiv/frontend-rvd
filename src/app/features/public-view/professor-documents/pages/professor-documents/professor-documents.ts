import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SectionFrame } from '../../../../../shared/ui/section-frame/section-frame';

@Component({
  selector: 'app-professor-documents',
  imports: [SectionFrame],
  templateUrl: './professor-documents.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfessorDocuments {}
