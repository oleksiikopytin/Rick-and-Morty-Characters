import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { STATUSES, GENDERS, CharacterFilter, CharactersResponse } from '../../core/model';
import { CharacterApi } from '../../core/character-api';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  debounceTime,
  map,
  switchMap,
  catchError,
  distinctUntilChanged,
  merge,
  Observable,
  of,
  startWith,
} from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { TitleCasePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { MatProgressBarModule } from '@angular/material/progress-bar';

type ListState =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'error' }
  | { kind: 'success'; data: CharactersResponse };

@Component({
  selector: 'app-character-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    TitleCasePipe,
    MatProgressBarModule,
  ],
  templateUrl: './character-list.html',
  styleUrl: './character-list.scss',
})
export class CharacterList {
  protected readonly statuses = STATUSES;
  protected readonly genders = GENDERS;
  protected readonly pageSize = 20;
  private characterApi = inject(CharacterApi);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private activatedRoute = inject(ActivatedRoute);

  protected readonly columns = [
    'avatar',
    'name',
    'status',
    'species',
    'gender',
    'origin',
    'location',
  ];

  private fb = inject(NonNullableFormBuilder);
  protected readonly form = this.fb.group({
    name: '',
    status: '',
    species: '',
    gender: '',
  });

  // URL -> filters object
  private filter$ = this.activatedRoute.queryParamMap.pipe(
    map((params): CharacterFilter => {
      const page = Number(params.get('page'));
      return {
        page: Number.isInteger(page) && page >= 1 ? page : 1,
        name: params.get('name') ?? '',
        status: STATUSES.find((s) => s === params.get('status')) ?? '',
        gender: GENDERS.find((g) => g === params.get('gender')) ?? '',
        species: params.get('species') ?? '',
      };
    }),
    distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
  );

  currentPage = toSignal(this.filter$.pipe(map((f) => f.page)), { initialValue: 1 });

  // Filters -> API request (switchMap cancels outdated requests)
  characters = toSignal(
    this.filter$.pipe(
      switchMap((f) =>
        this.characterApi.getCharacters(f).pipe(
          map((response): ListState => ({ kind: 'success', data: response })),
          // The API returns 404 when no characters match, so treat it as "no results", not a failure
          catchError((err: HttpErrorResponse): Observable<ListState> =>
            err.status === 404 ? of({ kind: 'empty' }) : of({ kind: 'error' }),
          ),
          startWith<ListState>({ kind: 'loading' }),
        ),
      ),
    ),
    { initialValue: { kind: 'loading' } },
  );

  // Page change -> URL update
  onPage(event: PageEvent) {
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: { page: event.pageIndex + 1 },
      queryParamsHandling: 'merge',
    });
  }

  constructor() {
    // Form -> URL. The URL is the source of truth, so filters survive reload and can be shared.
    // Text inputs are debounced to avoid a request per keystroke; a filter change resets to page 1.
    merge(
      this.form.controls.name.valueChanges.pipe(debounceTime(400)),
      this.form.controls.species.valueChanges.pipe(debounceTime(400)),
      this.form.controls.status.valueChanges,
      this.form.controls.gender.valueChanges,
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const { name, species, status, gender } = this.form.getRawValue();
        this.router.navigate([], {
          relativeTo: this.activatedRoute,
          queryParams: {
            name: name.trim() || null,
            species: species.trim() || null,
            status: status || null,
            gender: gender || null,
            page: null,
          },
          queryParamsHandling: 'merge',
        });
      });

    //the URL → form sync subscription
    // URL -> form (back/forward buttons, shared links).
    // emitEvent: false prevents a form -> URL -> form loop.
    // Keep the user's untrimmed input if it matches the URL, so typing isn't interrupted.
    this.filter$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((filter) => {
      const name = filter.name ?? '';
      const species = filter.species ?? '';
      const currentName = this.form.controls.name.value;
      const currentSpecies = this.form.controls.species.value;

      this.form.patchValue(
        {
          name: currentName.trim() === name ? currentName : name,
          species: currentSpecies.trim() === species ? currentSpecies : species,
          status: filter.status ?? '',
          gender: filter.gender ?? '',
        },
        { emitEvent: false },
      );
    });
  }

  reset() {
    this.router.navigate([], {
      queryParams: { name: null, status: null, species: null, gender: null, page: null },
      queryParamsHandling: 'merge',
      relativeTo: this.activatedRoute,
    });
  }

  onRowClick(id: number) {
    if (!id) return;
    // Pass the list's query params in router state (not the URL), so the detail URL stays clean
    // and Back can restore the filters
    const queryParams = this.activatedRoute.snapshot.queryParams;

    this.router.navigate(['/characters', id], {
      state: { listQueryParams: queryParams },
    });
  }
}
