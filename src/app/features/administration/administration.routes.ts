import { Routes } from '@angular/router';
import { AdministrationView } from './administration-view/administration-view';
import { CoordinationAdministration } from './coordination-administration/pages/coordination-administration/coordination-administration';

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
        path: '',
        redirectTo: 'coordinaciones',
        pathMatch: 'full',
      },
    ],
  },
];