import type { AppData } from "../domain/types";
import { parseAppData, type Repository } from "./repository";

export const STORAGE_KEY = "cedra-gourmet-os:v1";

export class LocalStorageRepository implements Repository {
  async load(): Promise<AppData | null> {
    return this.loadSync();
  }

  loadSync(): AppData | null {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? parseAppData(JSON.parse(raw)) : null;
    } catch {
      return null;
    }
  }

  async save(data: AppData): Promise<void> {
    this.saveSync(data);
  }

  /** Devuelve false si el navegador rechazó la escritura (cuota llena, modo privado). */
  saveSync(data: AppData): boolean {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }
}
