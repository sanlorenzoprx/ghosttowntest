import type { Env } from './env';

export interface SearchDiscoveryResult {
  title: string;
  url: string;
  description?: string;
}

export interface SearchProvider {
  id: string;
  search(env: Env, query: string): Promise<SearchDiscoveryResult[]>;
}
