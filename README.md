# Rick and Morty App

A small Angular 21 app that browses characters from the [Rick and Morty API](https://rickandmortyapi.com/).

- **Character list** (`/characters`): a paginated table with filters for name, status, species and gender.
- **Character detail** (`/characters/:id`): the character's info and the list of episodes they appear in.

Built with Angular Material, standalone components, `OnPush` change detection and lazy-loaded routes.

## Install and run

Requirements: Node.js (a version supported by Angular 21) and npm.

```bash
npm install      # install dependencies
npm start        # dev server at http://localhost:4200
npm run build    # production build in dist/
```

## Run the tests

Unit tests use [Vitest](https://vitest.dev/) through the Angular CLI.

```bash
npm test                    # watch mode
npm test -- --watch=false   # single run (e.g. for CI)
```

## Project structure

```
src/app/
  core/
    model.ts              # API types (Character, Episode, filters, ...)
    character-api.ts      # HTTP service for characters and episodes
  characters/
    character-list/       # filters + table + paginator
    character-detail/     # single character + episodes
  app.routes.ts           # lazy routes
```

## Data loading approach: signals + RxJS (no resolver)

Both pages use the same pattern. RxJS handles the async work, and the result is turned into a signal for the template:

```
source (URL) -> RxJS pipeline (switchMap to HTTP) -> toSignal() -> template
```

**Character list**

- The URL query params (`?name=...&status=...&page=...`) are the single source of truth for the filters.
- Typing in the form updates the URL. Text fields are debounced by 400 ms.
- `queryParamMap` is mapped to a filter object, then `switchMap` calls the API.

**Character detail**

- The `:id` route param arrives as a signal input (`input.required()`), enabled by `withComponentInputBinding()`.
- `toObservable(id)` feeds a `switchMap` that loads the character and then all its episodes in one request.

**Each page's state** is a single value with four possible kinds: `loading | empty | error | success`. The template switches on it with `@switch`, so each case is handled explicitly.

## Assumptions and trade-offs

- **The URL is the only source of truth for the list.** The form and paginator only update the query params. They never call the API directly, so refresh, shared links and browser back/forward all work the same way.
- **Invalid query params are ignored, not removed.** `?page=abc&status=foo` falls back to page 1 and "any" status. The bad values stay in the URL until the user changes a filter, which then writes clean values.
- **404 means "no results".** The API returns 404 when a filter matches nothing, so 404 shows the "No characters found" state. Any other error shows a generic error.
- **The page size is fixed at 20** to match the API, so the paginator hides the page-size selector.
- **Back from the detail page uses router state, not the URL.** The list's query params are passed in `history.state` when a row is clicked. This keeps detail URLs clean (`/characters/5`) and survives a refresh. If the detail page is opened directly, there is no state, so Back goes to the unfiltered list. Back navigates to the list instead of calling `history.back()`, so it always lands on the list even when the user arrived from another site.
- **Invalid detail IDs are treated as "not found".** `/characters/abc` is rejected before any request is made and shows the same state as `/characters/99999`.
- **Episode failures don't hide the character.** If only the episodes request fails, the character is still shown with a "Couldn't load episodes" message.
- **The table is replaced by the loading bar while data loads.** This keeps the state model simple, at the cost of a short flicker on page changes.

## What I would improve with more time

- **Keep the previous results visible while loading**, with the progress bar on top, so the table and paginator don't flicker.
- **Write real unit tests.** The current specs only check that components are created.
- **Extract the filter form into its own component** with an input for the current values and an output for changes, so the list component only handles URL sync and data loading.
- **Move the URL parsing into a pure function** so it can be tested without a component.
- **Accessibility**: make table rows keyboard-focusable and openable with Enter, not only by mouse click.
