import type { AuthConfig } from './types.js';

export class Auth {
  private readonly apiKey?: string;
  private readonly token?: string;

  constructor(cfg: AuthConfig) {
    this.apiKey = cfg.apiKey;
    this.token = cfg.token;
  }

  asHeaders(): Record<string, string> {
    if (this.apiKey) return { Authorization: `Bearer ${this.apiKey}` };
    if (this.token) return { Authorization: `Bearer ${this.token}` };
    return {};
  }

  tokenParam(): string | undefined {
    return this.token;
  }
}
