import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, Observable, of, startWith, switchMap } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { Params, Router } from '@angular/router';
import { Character, Episode } from '../../core/model';
import { CharacterApi } from '../../core/character-api';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatListModule } from '@angular/material/list';
import { MatListItemTitle, MatListItemLine } from '@angular/material/list';

type DetailState =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'error' }
  | {
      kind: 'success';
      data: Character & { episodes: Episode[] };
      episodesFailed: boolean;
    };

@Component({
  selector: 'app-character-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatProgressBarModule,
    MatButtonModule,
    DatePipe,
    MatListModule,
    MatListItemTitle,
    MatListItemLine,
  ],
  templateUrl: './character-detail.html',
  styleUrl: './character-detail.scss',
})
export class CharacterDetail {
  private characterApi = inject(CharacterApi);
  private router = inject(Router);

  id = input.required<string>();

  // Converts signal to numeric id or null if invalid
  numericId = computed<number | null>(() => {
    const value = this.id();
    const num = Number(value);
    return Number.isInteger(num) && num > 0 ? num : null;
  });

  readonly state = toSignal(
    toObservable(this.numericId).pipe(
      switchMap((id) => {
        if (id == null) {
          return of<DetailState>({ kind: 'empty' });
        }
        return this.characterApi.getCharacter(id).pipe(
          switchMap((character) =>
            this.characterApi.getEpisodes(character.episode).pipe(
              map((episodesArr): DetailState => ({
                kind: 'success',
                data: { ...character, episodes: episodesArr },
                episodesFailed: false,
              })),
              // If episodes fail to load, still show the character, with a warning instead of an error page
              catchError((): Observable<DetailState> =>
                of({
                  kind: 'success',
                  data: { ...character, episodes: [] },
                  episodesFailed: true,
                }),
              ),
            ),
          ),
          // Catch errors from the character API only.
          // A 404 means the character doesn't exist, so show "not found" rather than an error.
          catchError((err: HttpErrorResponse): Observable<DetailState> =>
            err.status === 404 ? of({ kind: 'empty' }) : of({ kind: 'error' }),
          ),
          startWith<DetailState>({ kind: 'loading' }),
        );
      }),
    ),
    { initialValue: { kind: 'loading' } satisfies DetailState },
  );

  // Restore the list's filters/page from router state.
  // If the page was opened directly, state is empty and we go to the unfiltered list.
  goBack() {
    const listQueryParams = (history.state as { listQueryParams?: Params } | null)?.listQueryParams;
    this.router.navigate(['/characters'], { queryParams: listQueryParams });
  }
}
