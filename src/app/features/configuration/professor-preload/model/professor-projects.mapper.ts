import {
  PROJECT_ACTIVITY_CODIGOS,
  ProjectActivityCodigo,
} from './professor-activities.config';
import { SimpleActivity } from './professor-activities-modal.models';
import {
  PersonaProyectoDto,
  ProfessorProjectRow,
  ProyectoDocenteDto,
} from './professor-projects.model';

export function detectProjectActivityCodigos(
  proyectos: ProyectoDocenteDto[],
  idPersonaGeneral: number | null | undefined,
): ProjectActivityCodigo[] {
  if (idPersonaGeneral == null) {
    return [];
  }

  const codigos = new Set<ProjectActivityCodigo>();
  for (const proyecto of proyectos) {
    for (const persona of proyecto.personaProyecto) {
      if (persona.idPersonaGeneral !== idPersonaGeneral) {
        continue;
      }
      if (isProjectActivityCodigo(persona.tipoActividad.codigo)) {
        codigos.add(persona.tipoActividad.codigo);
      }
    }
  }

  return PROJECT_ACTIVITY_CODIGOS.filter((codigo) => codigos.has(codigo));
}

export function buildProjectHierarchyRows(
  proyectos: ProyectoDocenteDto[],
  activityCodigo: ProjectActivityCodigo,
  idPersonaGeneral: number | null | undefined,
): ProfessorProjectRow[] {
  if (idPersonaGeneral == null) {
    return [];
  }

  const rows: ProfessorProjectRow[] = [];
  for (const proyecto of proyectos) {
    const parentPersona = findPersonaProyecto(
      proyecto.personaProyecto,
      idPersonaGeneral,
      activityCodigo,
    );
    if (!parentPersona) {
      continue;
    }

    const productos = proyecto.productos ?? [];
    const tieneHijos = productos.length > 0;

    rows.push(
      mapToProjectRow(
        proyecto,
        parentPersona,
        0,
        true,
        true,
      ),
    );

    if (!tieneHijos) {
      continue;
    }

    for (const producto of productos) {
      const childPersona = findPersonaProyecto(
        producto.personaProyecto,
        idPersonaGeneral,
        activityCodigo,
      );
      if (!childPersona) {
        continue;
      }

      rows.push(
        mapToProjectRow(producto, childPersona, 1, false, false),
      );
    }
  }

  return rows;
}

export function mapProjectsToActivityRows(
  proyectos: ProyectoDocenteDto[],
  activityCodigo: ProjectActivityCodigo,
  idPersonaGeneral: number | null | undefined,
): SimpleActivity[] {
  const hierarchyRows = buildProjectHierarchyRows(
    proyectos,
    activityCodigo,
    idPersonaGeneral,
  );

  return hierarchyRows
    .filter((row) => row.esSeleccionable)
    .map((row) => ({
      id: String(row.idPersonaProyecto),
      actividad: row.nombreActividad,
      horasDedicacion: row.horasDedicacion ?? 0,
      descripcionProyecto: row.nombreProyecto,
    }));
}

export function sumProjectActivityHours(rows: SimpleActivity[]): number {
  let total = 0;
  for (const row of rows) {
    total += row.horasDedicacion ?? 0;
  }
  return total;
}

function findPersonaProyecto(
  personas: PersonaProyectoDto[],
  idPersonaGeneral: number,
  activityCodigo: ProjectActivityCodigo,
): PersonaProyectoDto | undefined {
  return personas.find(
    (item) =>
      item.idPersonaGeneral === idPersonaGeneral &&
      item.tipoActividad.codigo === activityCodigo,
  );
}

function mapToProjectRow(
  proyecto: ProyectoDocenteDto,
  persona: PersonaProyectoDto,
  nivel: 0 | 1,
  esPadre: boolean,
  esSeleccionable: boolean,
): ProfessorProjectRow {
  return {
    idPersonaProyecto: persona.id,
    idProyecto: proyecto.id,
    idTipoActividad: persona.tipoActividad.id,
    codigoTipoActividad: persona.tipoActividad.codigo,
    nombreProyecto: resolveProjectLabel(proyecto),
    nombreActividad: persona.tipoActividad.nombre,
    horasDedicacion: nivel === 1
      ? parseChildProjectHours(persona.horas)
      : parseProjectHours(persona.horas),
    nivel,
    esPadre,
    esSeleccionable,
  };
}

function isProjectActivityCodigo(
  codigo: string,
): codigo is ProjectActivityCodigo {
  return codigo === 'CTEI' || codigo === 'ISU';
}

function parseProjectHours(horas: string): number {
  const trimmed = horas?.trim() ?? '';
  if (!trimmed) {
    return 0;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseChildProjectHours(horas: string): number | null {
  const trimmed = horas?.trim() ?? '';
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function resolveProjectLabel(proyecto: ProyectoDocenteDto): string {
  return proyecto.nombre?.trim() || proyecto.descripcion?.trim() || '';
}
