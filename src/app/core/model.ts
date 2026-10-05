export const STATUSES = ['alive', 'dead', 'unknown'] as const;
export const GENDERS = ['female', 'male', 'genderless', 'unknown'] as const;

export type Status = (typeof STATUSES)[number];
export type Gender = (typeof GENDERS)[number];

export interface Character {
  id: number;
  name: string;
  status: string;
  species: string;
  gender: string;
  image: string;
  origin: {
    name: string;
  };
  location: {
    name: string;
  };
  type: string;
  episode: string[];
  created: string;
}

export interface PageInfo {
  count: number;
  pages: number;
  next: string | null;
  prev: string | null;
}

export interface CharacterFilter {
  name?: string;
  status?: Status | '';
  gender?: Gender | '';
  species?: string;
  page: number;
}

export interface CharactersResponse {
  info: PageInfo;
  results: Character[];
}

export interface Episode {
  id: number;
  name: string;
  air_date: string;
  episode: string;
}
