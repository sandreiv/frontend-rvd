import { computed, inject, Injectable } from '@angular/core';
import { PRELOAD_FUNC } from '../config/func-route.map';
import { FuncionalidadNodo } from '../model/funcionalidad.model';
import { forNext } from '../utils/for-next.function';
import { MenuService } from './menu-service';

@Injectable({
  providedIn: 'root',
})
export class PermissionService {
  private readonly menuService = inject(MenuService);

  private readonly funcCodes = computed(() => {
    const codes = new Set<string>();
    collectCodes(this.menuService.tree(), codes);
    return codes;
  });

  can(codigo: string): boolean {
    return this.funcCodes().has(codigo);
  }

  /*canListProfessors(): boolean {
    return this.can(PRELOAD_FUNC.LIST);
  }*/

  canDownloadExcel(): boolean {
    return this.can(PRELOAD_FUNC.DOWNLOAD);
  }

  canAddProfessor(): boolean {
    return this.can(PRELOAD_FUNC.ADD);
  }

  canUpdateProfessor(): boolean {
    return this.can(PRELOAD_FUNC.UPDATE);
  }

  canDeleteProfessor(): boolean {
    return this.can(PRELOAD_FUNC.DELETE);
  }

  canSaveDetail(): boolean {
    return this.can(PRELOAD_FUNC.SAVE_DETAIL);
  }

  canApprove(): boolean {
    return this.can(PRELOAD_FUNC.APPROVE);
  }

  canEndorseLoadDean(): boolean {
    return this.can(PRELOAD_FUNC.ENDORSE_LOAD_DEAN);
  }

  canDeclineLoadDean(): boolean {
    return this.can(PRELOAD_FUNC.DECLINE_LOAD_DEAN);
  }

  canApproveLoadDean(): boolean {
    return this.can(PRELOAD_FUNC.APPROVE_LOAD_DEAN);
  }

  canDeclineLoadDevelopment(): boolean {
    return this.can(PRELOAD_FUNC.DECLINE_LOAD_DEVELOPMENT);
  }

  canApproveLoadDevelopment(): boolean {
    return this.can(PRELOAD_FUNC.APPROVE_LOAD_DEVELOPMENT);
  }

  /**
   * Permite ver la gráfica de porcentaje de horas por actividades.
   * Código Vortal 02_12, asignable al rol Desarrollo académico.
   */
  canViewActivitiesGraph(): boolean {
    return this.can(PRELOAD_FUNC.VIEW_ACTIVITIES_GRAPH);
  }

}

function collectCodes(
  nodos: FuncionalidadNodo[],
  codes: Set<string>,
): void {
  forNext(nodos, (nodo) => {
    if (nodo.codigo) {
      codes.add(nodo.codigo);
    }

    collectCodes(nodo.funHijas, codes);
  });
}