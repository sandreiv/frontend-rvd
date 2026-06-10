import { Routes } from '@angular/router';
import { AppLayout } from './shared/layout/app-layout/app-layout';
import { configurationRoutes } from './features/configuration/configuration.routes';
import { PreloadCall } from './features/configuration/preload-call/pages/preload-call/preload-call';
import { ProfessorPreload } from './features/configuration/professor-preload/pages/professor-preload/professor-preload';



export const routes: Routes = [
  
  {
    path: '',
    redirectTo: '/rvd',
    pathMatch: 'full',
  },
  {
    path: 'rvd',
    component: AppLayout,
    title: 'RVD UdeC',
    data: { roles: ['postulante', 'evaluador', 'admin'] },
    children: [
      { path: 'convocatoria-precarga', component: PreloadCall },
      { path: 'precarga-docente', component: ProfessorPreload },
    ],
  }
];
