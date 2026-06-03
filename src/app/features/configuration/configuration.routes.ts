import { Routes } from '@angular/router';
import { PreloadCall } from './preload-call/pages/preload-call/preload-call';
import { ConfigView } from './config-view/config-view';

export const configurationRoutes: Routes = [
  {
    path: 'convocatoria-precarga',
    component: PreloadCall,
    title: 'Convocatoria precarga',
  }
    
  
];
