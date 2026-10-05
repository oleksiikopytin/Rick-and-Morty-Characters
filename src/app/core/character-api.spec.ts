import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { CharacterApi } from './character-api';

describe('CharacterApi', () => {
  let service: CharacterApi;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CharacterApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
