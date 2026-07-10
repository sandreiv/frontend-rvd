import { Routes } from '@angular/router';
import { AdministrationView } from './administration-view/administration-view';
import { CoordinationAdministration } from './coordination-administration/pages/coordination-administration/coordination-administration';
import { ActivityTypesPage } from './activity-types/pages/activity-types-page/activity-types-page';

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
        path: '',
        redirectTo: 'coordinaciones',
        pathMatch: 'full',
      },
    ],
  },
];