import { inject, Injectable } from '@angular/core';
import { Character, CharacterFilter, CharactersResponse, Episode } from './model';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CharacterApi {
  private url = 'https://rickandmortyapi.com/api/character';
  private episodeUrl = 'https://rickandmortyapi.com/api/episode';
  private httpClient = inject(HttpClient);

  getCharacters(filter: CharacterFilter): Observable<CharactersResponse> {
    let params = new HttpParams();
    params = params.set('page', filter.page);

    if (filter.name) {
      params = params.set('name', filter.name);
    }
    if (filter.status) {
      params = params.set('status', filter.status);
    }
    if (filter.gender) {
      params = params.set('gender', filter.gender);
    }
    if (filter.species) {
      params = params.set('species', filter.species);
    }

    return this.httpClient.get<CharactersResponse>(this.url, { params });
  }

  getCharacter(id: number): Observable<Character> {
    return this.httpClient.get<Character>(`${this.url}/${id}`);
  }

  getEpisodes(urls: string[]): Observable<Episode[]> {
    const ids = urls
      .map((url) => url.split('/').pop())
      .filter((id): id is string => !!id && Number.isInteger(Number(id)) && Number(id) > 0)
      .join(',');

    if (!ids) {
      return of([]);
    }

    return this.httpClient
      .get<Episode | Episode[]>(`${this.episodeUrl}/${ids}`)
      .pipe(map((episodes) => (Array.isArray(episodes) ? episodes : [episodes])));
  }
}
