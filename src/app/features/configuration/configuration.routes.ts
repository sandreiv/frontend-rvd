import { Routes } from '@angular/router';
import { PreloadCall } from './preload-call/pages/preload-call/preload-call';
import { ConfigView } from './config-view/config-view';
import { ProfessorPreload } from './professor-preload/pages/professor-preload/professor-preload';

export const configurationRoutes: Routes = [
  {
    path: 'convocatoria-precarga',
    component: PreloadCall,
    title: 'Convocatoria precarga',
  },

  {
    path: 'precarga-docente',
    component: ProfessorPreload,
    title: 'Precarga docente',
  }
  
];
