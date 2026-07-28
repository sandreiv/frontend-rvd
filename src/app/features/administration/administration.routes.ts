import { Routes } from '@angular/router';
import { AdministrationView } from './administration-view/administration-view';
import { CoordinationAdministration } from './coordination-administration/pages/coordination-administration/coordination-administration';
import { ActivityTypesPage } from './activity-types/pages/activity-types-page/activity-types-page';
import { LoadRestrictionPage } from './load-restriction/pages/load-restriction-page/load-restriction-page';
import { ProjectCalls } from './project-calls/pages/project-calls/project-calls';
import { ProjectTypes } from './project-types/pages/project-types/project-types';
import { Projects } from './projects/pages/projects/projects';

export const administrationRoutes: Routes = [
  {
    path: '',
    component: AdministrationView,
    children: [
      {
        path: 'coordinaciones',
        component: CoordinationAdministration,
        title: 'Coordinaciones - RVD',
      },
      {
        path: 'tipo-actividades',
        component: ActivityTypesPage,
        title: 'Tipo actividades - RVD',
      },
      {
        path: 'restriccion-carga',
        component: LoadRestrictionPage,
        title: 'Restricción de carga - RVD',
      },
      {
        path: '',
        redirectTo: 'coordinaciones',
        pathMatch: 'full',
      },
      {
        path: 'convocatorias-de-proyecto',
        component: ProjectCalls,
        title: 'Convocatorias de proyecto - RVD',
      },
      {
        path: 'tipos-de-proyecto',
        component: ProjectTypes,
        title: 'Tipos de proyecto - RVD',
      },
      {
        path: 'proyectos',
        component: Projects,
        title: 'Proyectos - RVD',
      },
    ],
  },
];
