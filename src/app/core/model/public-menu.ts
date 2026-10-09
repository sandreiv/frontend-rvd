import { MenuNavItem } from '../service/menu-service';

export const PUBLIC_HOME_PATH =
  '/publico/plan-de-trabajo/contratacion-docentes';

export const PUBLIC_NAV_ITEMS: MenuNavItem[] = [
  {
    name: 'Plan de trabajo',
    icon: 'briefcase',
    path: PUBLIC_HOME_PATH,
    codigo: 'public-work-plan',
    subItems: [
      {
        name: 'Contratación para docentes',
        path: '/publico/plan-de-trabajo/contratacion-docentes',
      },
      {
        name: 'Documentación de docentes',
        path: '/publico/plan-de-trabajo/documentacion-docentes',
      },
    ],
  },
];
