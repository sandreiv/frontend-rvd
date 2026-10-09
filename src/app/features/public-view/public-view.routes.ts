import { Routes } from '@angular/router';
import { Hiring } from './hiring/pages/hiring/hiring';
import { ProfessorDocuments } from './professor-documents/pages/professor-documents/professor-documents';

export const publicViewRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'plan-de-trabajo/contratacion-docentes',
  },
  {
    path: 'plan-de-trabajo/contratacion-docentes',
    component: Hiring,
    title: 'Contratación para docentes - RVD',
  },
  {
    path: 'plan-de-trabajo/documentacion-docentes',
    component: ProfessorDocuments,
    title: 'Documentación de docentes - RVD',
  },
];
