import { Routes } from '@angular/router';
import { Casca } from './layout/casca';

export const routes: Routes = [
  {
    path: '',
    component: Casca,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'planos' },
      {
        path: 'hoje',
        loadComponent: () => import('./compartilhado/em-breve').then(m => m.EmBreve),
        data: { titulo: 'Hoje' },
      },
      {
        path: 'planos',
        loadComponent: () => import('./planos/lista/planos-lista').then(m => m.PlanosLista),
      },
      {
        path: 'historico',
        loadComponent: () => import('./compartilhado/em-breve').then(m => m.EmBreve),
        data: { titulo: 'Histórico' },
      },
      {
        path: 'perfil',
        loadComponent: () => import('./compartilhado/em-breve').then(m => m.EmBreve),
        data: { titulo: 'Perfil' },
      },
    ],
  },
  {
    path: 'planos/novo',
    loadComponent: () => import('./planos/plano-editor/plano-editor').then(m => m.PlanoEditor),
  },
  {
    path: 'planos/:id',
    loadComponent: () => import('./planos/plano-editor/plano-editor').then(m => m.PlanoEditor),
  },
  { path: '**', redirectTo: 'planos' },
];
