import { read, remove, write } from "./local-storage";

const TOKEN_KEY = "fieldpulse.token";

export function getToken(): string | null {
  return read(TOKEN_KEY);
}

export function setToken(token: string): void {
  write(TOKEN_KEY, token);
}

export function clearToken(): void {
  remove(TOKEN_KEY);
}
