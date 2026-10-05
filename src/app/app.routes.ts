import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'characters',
    pathMatch: 'full',
  },
  {
    path: 'characters',
    loadComponent: () =>
      import('./characters/character-list/character-list').then((m) => m.CharacterList),
  },
  {
    path: 'characters/:id',
    loadComponent: () =>
      import('./characters/character-detail/character-detail').then((m) => m.CharacterDetail),
  },
];
