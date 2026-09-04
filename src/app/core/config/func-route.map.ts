import { AppIconName } from '../../shared/ui/icon/icons';

export interface FuncRouteItem {
  path: string;
  icon: AppIconName;
}

/**
 * Código padre de Vortal → ruta Angular e icono del sidebar.
 * urlRecurso de Vortal es el endpoint del backend, no el router.
 */
export const FUNC_ROUTE_MAP: Record<string, FuncRouteItem> = {
  '01': {
    path: '/rvd/convocatoria-precarga',
    icon: 'call',
  },
  '02': {
    path: '/rvd/precarga-docente',
    icon: 'paperAirplane',
  },
  '03': {
    path: '/rvd/administracion',
    icon: 'adjustmentsHorizontal',
  },
  '04': {
    path: '/rvd/solicitudes-cdp',
    icon: 'documentPlus',
  },
};

export const PRELOAD_FUNC = {
  DOWNLOAD: '02_01',
  ADD: '02_02',
  UPDATE: '02_03',
  DELETE: '02_04',
  SAVE_DETAIL: '02_05',
  APPROVE: '02_06',
  ENDORSE_LOAD_DEAN: '02_07',
  DECLINE_LOAD_DEAN: '02_08',
  APPROVE_LOAD_DEAN: '02_09',
  DECLINE_LOAD_DEVELOPMENT: '02_10',
  APPROVE_LOAD_DEVELOPMENT: '02_11',
  LIST_OBSERVATIONS: '02_12',
  VIEW_ACTIVITIES_GRAPH: '02_13',
  PARENT: '02',
} as const;

export const CDP_FUNC = {
  DOWNLOAD: '04_01',
  REVIEW_ATTACHMENTS: '04_02',
  ADD_CDP_REQUEST: '04_03',
  PARENT: '04',
} as const;

export function resolveFuncCodigoFromUrl(url: string): string | null {
  const path = url.split('?')[0].split('#')[0];
  const entries = Object.entries(FUNC_ROUTE_MAP);
  let match: string | null = null;
  let matchLength = -1;

  forNextEntries(entries, (codigo, item) => {
    if (!path.startsWith(item.path)) {
      return;
    }

    if (item.path.length > matchLength) {
      match = codigo;
      matchLength = item.path.length;
    }
  });

  return match;
}

function forNextEntries(
  entries: [string, FuncRouteItem][],
  callback: (codigo: string, item: FuncRouteItem) => void,
): void {
  const length = entries.length;

  for (let i = 0; i < length; i++) {
    callback(entries[i][0], entries[i][1]);
  }
}
