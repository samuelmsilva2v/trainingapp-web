import { Routes } from '@angular/router';
import { Casca } from './layout/casca';
import type { PlanoEditor } from './planos/plano-editor/plano-editor';

export const routes: Routes = [
  {
    path: '',
    component: Casca,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'hoje' },
      {
        path: 'hoje',
        loadComponent: () => import('./hoje/hoje').then(m => m.HojeTela),
      },
      {
        path: 'planos',
        loadComponent: () => import('./planos/lista/planos-lista').then(m => m.PlanosLista),
      },
      {
        path: 'historico',
        loadComponent: () => import('./historico/historico').then(m => m.Historico),
      },
      {
        path: 'perfil',
        loadComponent: () => import('./perfil/perfil').then(m => m.PerfilTela),
      },
    ],
  },
  {
    path: 'treino',
    loadComponent: () => import('./treino/treino').then(m => m.Treino),
  },
  {
    path: 'planos/novo',
    loadComponent: () => import('./planos/plano-editor/plano-editor').then(m => m.PlanoEditor),
    canDeactivate: [(editor: PlanoEditor) => editor.podeSair()],
  },
  {
    path: 'planos/:id',
    loadComponent: () => import('./planos/plano-editor/plano-editor').then(m => m.PlanoEditor),
    canDeactivate: [(editor: PlanoEditor) => editor.podeSair()],
  },
  { path: '**', redirectTo: 'hoje' },
];
