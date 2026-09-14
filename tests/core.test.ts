/// <reference types="node" />
import test from 'node:test';
import assert from 'node:assert/strict';
import { imageRect, toNormalized, toViewport } from '../src/geometry';
import { activeCount, commitDraft, emptyState, parseState, type BenchState, type Project } from '../src/model';
import { BenchRepository, STATE_KEY, BACKUP_KEY, type KeyValueStore } from '../src/repository';

const photo = { uri: 'benchkeep-photo:fixture', width: 1448, height: 1086 };
const draft = { title: 'A leaf', photo, pin: { x: .497, y: .454 }, nextMove: 'Finish the rust leaf.', detail: 'Two strands.' };
const committed = () => commitDraft({ ...emptyState(), draft }).state;

test('pin maps to the same image pixel after viewport/orientation changes', () => {
  for (const image of [photo, { width: 1086, height: 1448 }, { width: 3000, height: 400 }, { width: 200, height: 5000 }]) {
    for (const frame of [{ width: 327, height: 245 }, { width: 768, height: 900 }, { width: 1024, height: 400 }]) {
      for (const p of [{ x: .5, y: .5 }, { x: .001, y: .999 }, draft.pin, { x: 1, y: 0 }]) {
        const r = imageRect(image, frame); const roundtrip = toNormalized(toViewport(p, r), r)!;
        assert.ok(Math.abs(roundtrip.x - p.x) < 1e-10); assert.ok(Math.abs(roundtrip.y - p.y) < 1e-10);
      }
    }
  }
});
test('letterbox taps cannot create a false point', () => {
  const r = imageRect({ width: 1000, height: 200 }, { width: 300, height: 300 });
  assert.equal(toNormalized({ x: 150, y: 20 }, r), null);
  assert.deepEqual(toNormalized({ x: 150, y: 150 }, r), { x: .5, y: .5 });
  assert.equal(imageRect({ width: 0, height: 2 }, { width: 100, height: 100 }).width, 0);
});
test('focused view keeps even edge pins visible', () => {
  const frame = { width: 400, height: 300 };
  for (const point of [{ x: 0, y: 0 }, { x: 1, y: 1 }, draft.pin]) {
    const screen = toViewport(point, imageRect(photo, frame, point));
    assert.ok(screen.x >= 0 && screen.x <= frame.width); assert.ok(screen.y >= 0 && screen.y <= frame.height);
  }
});
test('new checkpoints retain the previous photo and coordinates', () => {
  const first = committed(); const original = structuredClone(first.projects[0].checkpoints[0]);
  const result = commitDraft({ ...first, draft: { ...draft, projectId: first.projects[0].id, photo: { ...photo, uri: 'second' }, pin: { x: .9, y: .1 } } });
  assert.equal(result.state.projects[0].checkpoints.length, 2); assert.deepEqual(result.state.projects[0].checkpoints[0], original); assert.equal(result.state.draft, null);
});
test('free limit applies to creation and reopening a finished project', () => {
  const initial = committed(); const p = initial.projects[0];
  const state = { ...initial, projects: [p, { ...p, id: 'second' }, { ...p, id: 'finished', status: 'finished' as const }], draft };
  assert.equal(activeCount(state), 2);
  assert.throws(() => commitDraft(state), /two active pieces/);
  assert.throws(() => commitDraft({ ...state, draft: { ...draft, projectId: 'finished' } }), /two active pieces/);
  assert.equal(activeCount(commitDraft(state, true).state), 3);
  assert.equal(activeCount(commitDraft({ ...state, draft: { ...draft, projectId: p.id } }).state), 2);
});
test('malformed samples and coordinates cannot silently pass validation', () => {
  const state = committed();
  assert.throws(() => parseState(JSON.stringify({ ...state, projects: [{ ...state.projects[0], sample: 'false' }] })));
  assert.throws(() => parseState(JSON.stringify({ ...state, projects: [{ ...state.projects[0], sample: true }] })));
  state.projects[0].checkpoints[0].pin.x = 12;
  assert.throws(() => parseState(JSON.stringify(state)), /incomplete/);
});

class MemoryStore implements KeyValueStore {
  map = new Map<string, string>(); failNext = false;
  async getItem(key: string) { return this.map.get(key) ?? null; }
  async setItem(key: string, value: string) {
    await new Promise(resolve => setTimeout(resolve, 2));
    if (this.failNext && key === STATE_KEY) { this.failNext = false; throw new Error('Disk full'); }
    this.map.set(key, value);
  }
}
test('serial persistence preserves the newest checkpoint over an earlier autosave', async () => {
  const store = new MemoryStore(); const repo = new BenchRepository(store);
  const a = repo.save({ ...emptyState(), draft }); const final = committed(); const b = repo.save(final);
  await Promise.all([a, b]); assert.deepEqual((await repo.load()).state, final);
});
test('write failure does not report success or poison subsequent writes', async () => {
  const store = new MemoryStore(); const repo = new BenchRepository(store); const original = committed();
  await repo.save(original); store.failNext = true;
  await assert.rejects(repo.save(emptyState()), /Disk full/); assert.deepEqual((await repo.load()).state, original);
  await repo.save(emptyState()); assert.deepEqual((await repo.load()).state, emptyState());
});
test('corrupt or absent primary recovers a valid backup without replacing it', async () => {
  const store = new MemoryStore(); const repo = new BenchRepository(store); const expected = committed();
  store.map.set(BACKUP_KEY, JSON.stringify(expected)); store.map.set(STATE_KEY, '{broken');
  assert.deepEqual(await repo.load(), { state: expected, recovered: true });
  store.map.delete(STATE_KEY); assert.deepEqual(await repo.load(), { state: expected, recovered: true });
});
test('unreadable primary without backup rejects instead of silently starting empty', async () => {
  const store = new MemoryStore(); store.map.set(STATE_KEY, '{broken'); const repo = new BenchRepository(store);
  await assert.rejects(repo.load(), /not been replaced/); assert.equal(store.map.get(STATE_KEY), '{broken');
});
