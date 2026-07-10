import { AppIconName } from '../../../../shared/ui/icon/icons';
import { TipoActividad } from './professor-activities.model';
import {
  ContractModalityKind,
  resolveModalityKind,
} from './professor-form.config';

export type ActivityCategoryCodigo =
  | 'FAD'
  | 'FAI'
  | 'AC'
  | 'CTEI'
  | 'ISU';

export type ActivityFormType = 'direct' | 'criteria' | 'project';

export type ProjectActivityCodigo = Extract<ActivityCategoryCodigo, 'CTEI' | 'ISU'>;

export const ALL_ACTIVITY_CODIGOS: ActivityCategoryCodigo[] = [
  'FAD',
  'FAI',
  'AC',
  'CTEI',
  'ISU',
];

export const PROJECT_ACTIVITY_CODIGOS: ProjectActivityCodigo[] = [
  'CTEI',
  'ISU',
];

export interface ActivityUiConfig {
  formType: ActivityFormType;
  icon: AppIconName;
  iconBgClass: string;
  iconColorClass: string;
}

export interface ActivityVisibleItem extends ActivityUiConfig {
  codigo: ActivityCategoryCodigo;
  tipoActividad?: TipoActividad;
}

export const ACTIVITY_UI_CONFIG: Record<ActivityCategoryCodigo, ActivityUiConfig> = {
  FAD: {
    formType: 'direct',
    icon: 'bookOpen',
    iconBgClass: 'bg-gray-100 dark:bg-gray-800',
    iconColorClass: 'text-gray-600 dark:text-gray-300',
  },
  FAI: {
    formType: 'criteria',
    icon: 'brain',
    iconBgClass: 'bg-purple-50 dark:bg-purple-500/10',
    iconColorClass: 'text-purple-600 dark:text-purple-400',
  },
  AC: {
    formType: 'criteria',
    icon: 'briefcase',
    iconBgClass: 'bg-warning-50 dark:bg-warning-500/10',
    iconColorClass: 'text-warning-600 dark:text-warning-400',
  },
  CTEI: {
    formType: 'project',
    icon: 'beaker',
    iconBgClass: 'bg-success-50 dark:bg-success-500/10',
    iconColorClass: 'text-success-600 dark:text-success-400',
  },
  ISU: {
    formType: 'project',
    icon: 'heart',
    iconBgClass: 'bg-error-50 dark:bg-error-500/10',
    iconColorClass: 'text-error-500 dark:text-error-400',
  },
};

export const TCO_BASE_ACTIVITY_CARDS: ActivityCategoryCodigo[] = [
  'FAD',
  'FAI',
  'AC',
];

export const VISIBLE_ACTIVITY_CARDS: Record<
  ContractModalityKind,
  ActivityCategoryCodigo[]
> = {
  catedra: ['FAD'],
  tiempoCompletoOcasional: TCO_BASE_ACTIVITY_CARDS,
};

export function resolveVisibleActivityCodigos(
  modalityNombre: string | null | undefined,
  projectActivityCodigos: ProjectActivityCodigo[] = [],
  esPlanta = false,
): ActivityCategoryCodigo[] {
  if (esPlanta) {
    return orderWithProjectsFirst(
      TCO_BASE_ACTIVITY_CARDS,
      projectActivityCodigos,
    );
  }

  const kind = resolveModalityKind(modalityNombre);
  if (!kind) {
    return [];
  }

  const baseCodigos = VISIBLE_ACTIVITY_CARDS[kind];
  if (kind === 'tiempoCompletoOcasional') {
    return orderWithProjectsFirst(baseCodigos, projectActivityCodigos);
  }
  return [...baseCodigos];
}

function orderWithProjectsFirst(
  baseCodigos: ActivityCategoryCodigo[],
  projectActivityCodigos: ProjectActivityCodigo[],
): ActivityCategoryCodigo[] {
  if (!projectActivityCodigos.length) {
    return [...baseCodigos];
  }

  return [...projectActivityCodigos, ...baseCodigos];
}

export function buildVisibleActivityItems(
  visibleCodigos: ActivityCategoryCodigo[],
  activityTypes: TipoActividad[],
): ActivityVisibleItem[] {
  const items: ActivityVisibleItem[] = [];
  for (const codigo of visibleCodigos) {
    const ui = ACTIVITY_UI_CONFIG[codigo];
    if (!ui) {
      continue;
    }
    items.push({
      codigo,
      ...ui,
      tipoActividad: activityTypes.find((type) => type.codigo === codigo),
    });
  }
  return items;
}

export function createInitialExpandedCategories(): Record<
  ActivityCategoryCodigo,
  boolean
> {
  return ALL_ACTIVITY_CODIGOS.reduce(
    (state, codigo) => ({
      ...state,
      [codigo]: false,
    }),
    {} as Record<ActivityCategoryCodigo, boolean>,
  );
}

export function createInitialAddFormOpen(): Record<
  ActivityCategoryCodigo,
  boolean
> {
  return ALL_ACTIVITY_CODIGOS.reduce(
    (state, codigo) => ({
      ...state,
      [codigo]: false,
    }),
    {} as Record<ActivityCategoryCodigo, boolean>,
  );
}

export type DirectActivityFormFieldKey =
  | 'idCriterio'
  | 'idUnidadRegional'
  | 'idPrograma'
  | 'codigoMateria'
  | 'idGrupo'
  | 'semestre'
  | 'creditos'
  | 'cupoMaximo'
  | 'horasPresenciales'
  | 'total';

export interface DirectActivityFieldConfig {
  key: DirectActivityFormFieldKey;
  label: string;
  control: 'select' | 'number';
  placeholder?: string;
  readonly?: boolean;
}

export const DIRECT_ACTIVITY_CASCADE_FIELDS: DirectActivityFieldConfig[] = [
  {
    key: 'idCriterio',
    label: 'Criterio',
    control: 'select',
    placeholder: 'Seleccione criterio',
  },
  {
    key: 'idUnidadRegional',
    label: 'Unidad',
    control: 'select',
    placeholder: 'Seleccione unidad',
  },
  {
    key: 'idPrograma',
    label: 'Programa',
    control: 'select',
    placeholder: 'Seleccione programa',
  },
  {
    key: 'codigoMateria',
    label: 'Núcleo temático',
    control: 'select',
    placeholder: 'Seleccione materia',
  },
  {
    key: 'idGrupo',
    label: 'Grupo',
    control: 'select',
    placeholder: 'Seleccione grupo',
  },
];

export const DIRECT_ACTIVITY_READONLY_FIELDS: DirectActivityFieldConfig[] = [
  {
    key: 'semestre',
    label: 'Semestre',
    control: 'number',
    readonly: true,
  },
  {
    key: 'creditos',
    label: 'Créditos',
    control: 'number',
    readonly: true,
  },
  {
    key: 'cupoMaximo',
    label: 'Cupo máximo',
    control: 'number',
    readonly: true,
  },
  {
    key: 'horasPresenciales',
    label: 'Horas trabajo presencial',
    control: 'number',
    readonly: true,
  },
  {
    key: 'total',
    label: 'Total',
    control: 'number',
    readonly: true,
  },
];

export type CriteriaActivityFormFieldKey =
  | 'idCriterio'
  | 'horasDedicacion';

export interface CriteriaActivityFieldConfig {
  key: CriteriaActivityFormFieldKey;
  label: string;
  control: 'select' | 'number';
  placeholder?: string;
}

export const CRITERIA_ACTIVITY_FIELDS: CriteriaActivityFieldConfig[] = [
  {
    key: 'idCriterio',
    label: 'Criterio',
    control: 'select',
    placeholder: 'Seleccione criterio',
  },
  {
    key: 'horasDedicacion',
    label: 'Horas de dedicación',
    control: 'number',
    placeholder: '0',
  },
];

export const PROJECT_ACTIVITY_DESCRIPTION_LABEL = 'Descripción del proyecto';

export const PROJECT_ACTIVITY_CRITERION_LABEL = 'Criterio';

export const PROJECT_ACTIVITY_HOURS_LABEL = 'Horas de dedicación';
