import { BenchState, emptyState, parseState } from './model';
export interface KeyValueStore { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void>; }
export const STATE_KEY = 'benchkeep.state.v1';
export const BACKUP_KEY = 'benchkeep.backup.v1';

/** Serial writes prevent a slow autosave from replacing a newer explicit checkpoint. */
export class BenchRepository {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private readonly store: KeyValueStore) {}
  async load(): Promise<{ state: BenchState; recovered: boolean }> {
    const raw = await this.store.getItem(STATE_KEY);
    if (raw === null) {
      const backup = await this.store.getItem(BACKUP_KEY);
      return backup === null ? { state: emptyState(), recovered: false } : { state: parseState(backup), recovered: true };
    }
    try { return { state: parseState(raw), recovered: false }; }
    catch {
      const backup = await this.store.getItem(BACKUP_KEY);
      if (backup === null) throw new Error('Your saved bench could not be read. It has not been replaced.');
      return { state: parseState(backup), recovered: true };
    }
  }
  save(state: BenchState): Promise<void> {
    const serialized = JSON.stringify(state);
    parseState(serialized);
    const task = this.queue.then(async () => {
      const previous = await this.store.getItem(STATE_KEY);
      if (previous) {
        let valid = true;
        try { parseState(previous); } catch { valid = false; }
        // Corrupt primary is not allowed to replace a known-good backup.
        if (valid) await this.store.setItem(BACKUP_KEY, previous);
      }
      await this.store.setItem(STATE_KEY, serialized);
    });
    this.queue = task.catch(() => {});
    return task;
  }
}
