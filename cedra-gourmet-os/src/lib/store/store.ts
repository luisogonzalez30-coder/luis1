"use client";

import { useSyncExternalStore } from "react";
import { LocalStorageRepository } from "../db/local";
import { parseAppData } from "../db/repository";
import type { AppData, Item, Quote, Recipe, Settings } from "../domain/types";
import { seedData } from "./seed";

type Listener = () => void;

/** Store reactivo mínimo: un único AppData inmutable, persistido en cada cambio. */
class AppStore {
  private data: AppData = seedData();
  private readonly serverSnapshot = this.data;
  private hydrated = false;
  private saveFailed = false;
  private readonly listeners = new Set<Listener>();
  private readonly repo = new LocalStorageRepository();

  subscribe = (l: Listener): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  getSnapshot = (): AppData => this.data;
  getServerSnapshot = (): AppData => this.serverSnapshot;
  isHydrated = (): boolean => this.hydrated;
  hasSaveFailed = (): boolean => this.saveFailed;

  /** Se llama una vez en el cliente. Si no hay datos guardados, deja los de ejemplo. */
  hydrate(): void {
    if (this.hydrated) return;
    const stored = this.repo.loadSync();
    if (stored) this.data = stored;
    this.hydrated = true;
    this.emit();
  }

  update(mutator: (d: AppData) => AppData): void {
    this.data = mutator(this.data);
    this.saveFailed = !this.repo.saveSync(this.data);
    this.emit();
  }

  replaceAll(raw: unknown): void {
    const parsed = parseAppData(raw);
    this.update(() => parsed);
  }

  private emit(): void {
    this.listeners.forEach((l) => l());
  }
}

export const store = new AppStore();

export function useAppData(): AppData {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}

export function useHydrated(): boolean {
  return useSyncExternalStore(store.subscribe, store.isHydrated, () => false);
}

export function useSaveFailed(): boolean {
  return useSyncExternalStore(store.subscribe, store.hasSaveFailed, () => false);
}

const upsert = <T extends { id: string }>(list: T[], value: T): T[] =>
  list.some((x) => x.id === value.id) ? list.map((x) => (x.id === value.id ? value : x)) : [...list, value];

export const actions = {
  saveSettings: (settings: Settings) => store.update((d) => ({ ...d, settings })),
  saveItem: (item: Item) => store.update((d) => ({ ...d, items: upsert(d.items, item) })),
  deleteItem: (id: string) => store.update((d) => ({ ...d, items: d.items.filter((x) => x.id !== id) })),
  saveRecipe: (recipe: Recipe) => store.update((d) => ({ ...d, recipes: upsert(d.recipes, recipe) })),
  deleteRecipe: (id: string) => store.update((d) => ({ ...d, recipes: d.recipes.filter((x) => x.id !== id) })),
  saveQuote: (quote: Quote) => store.update((d) => ({ ...d, quotes: upsert(d.quotes, quote) })),
  deleteQuote: (id: string) => store.update((d) => ({ ...d, quotes: d.quotes.filter((x) => x.id !== id) })),
  importJson: (raw: unknown) => store.replaceAll(raw),
  resetToSeed: () => store.update(() => seedData()),
};

export function nextQuoteNumber(quotes: Quote[]): number {
  return quotes.reduce((max, q) => Math.max(max, q.number), 0) + 1;
}
