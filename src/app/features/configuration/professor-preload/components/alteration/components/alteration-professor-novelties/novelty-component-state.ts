/**
 * Estado compartido entre el modal general de gestión de novedades
 * y el componente dinámico correspondiente a la novedad seleccionada.
 *
 * Permite almacenar temporalmente los datos específicos que genera cada
 * componente de novedad, por ejemplo el PEGE_ID del docente seleccionado
 * en "Asignar nombre a NN", para que el modal padre pueda validar si la
 * información está completa y construir la solicitud al momento de guardar.
 *
 * De esta manera se evita acoplar el modal general a los controles internos
 * de cada componente y se facilita agregar nuevas novedades en el futuro.
 */

import {
  Injectable,
  computed,
  signal,
} from '@angular/core';

export interface AssignNameNnPayload {
  component: 'asign-name-nn';
  idPersonaGeneral: number;
}

export type NoveltyComponentPayload =
  | AssignNameNnPayload;

@Injectable()
export class NoveltyComponentState {
  readonly payload =
    signal<NoveltyComponentPayload | null>(
      null,
    );

  readonly isValid =
    computed(() => this.payload() != null);

  setAssignNameNn(
    idPersonaGeneral: number,
  ): void {

    this.payload.set({
      component: 'asign-name-nn',
      idPersonaGeneral,
    });
  }

  clear(): void {
    this.payload.set(null);
  }
}