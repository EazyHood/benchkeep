/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { exportBenchBackup, importBenchBackup, MAX_BACKUP_BYTES, isManagedPhotoUri } from '../src/backup';
import type { BenchState, Photo } from '../src/model';

// Small JPEG fixture. Unit tests verify the container and transfer protocol;
// media adapters must also decode images before persisting imported pixels.
const jpeg = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9oADAMBAAIAAwAAABD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/EH//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/EH//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/EH//2Q==';
const dataUri = `data:image/jpeg;base64,${jpeg}`;
const photo: Photo = { uri: 'benchkeep-photo:source-1', width: 1, height: 1 };
function fixture(): BenchState {
  return { version: 1, projects: [{ id: 'p1', title: 'My embroidery', status: 'paused', createdAt: '2026-09-14T02:00:00.000Z', updatedAt: '2026-09-14T02:00:00.000Z', checkpoints: [{ id: 'c1', photo: { ...photo }, pin: { x: 0.25, y: 0.75 }, nextMove: 'Finish the rust leaf', detail: 'One strand', createdAt: '2026-09-14T02:00:00.000Z' }] }], draft: { projectId: 'p1', title: 'My embroidery', photo: { ...photo }, pin: null, nextMove: '', detail: '' } };
}
const reader = { async readPhoto() { return dataUri; } };
function writer() {
  const writes: string[] = [];
  return { writes, async writePhoto(data: string, width: number, height: number) { writes.push(data); return { uri: `benchkeep-photo:imported-${writes.length}`, width, height }; } };
}

test('round trip embeds photo bytes once and restores checkpoints and draft on another device', async () => {
  let reads = 0;
  const original = fixture();
  const raw = await exportBenchBackup(original, { async readPhoto() { reads++; return dataUri; } });
  assert.equal(reads, 1);
  assert.ok(!raw.includes(photo.uri));
  const payload = JSON.parse(raw);
  assert.equal(Object.keys(payload.photos).length, 1);
  assert.equal(payload.photos['img-1'].base64, jpeg);
  const io = writer();
  const restored = await importBenchBackup(raw, io);
  assert.equal(io.writes.length, 1);
  assert.equal(io.writes[0], dataUri);
  assert.equal(restored.projects[0].checkpoints[0].photo.uri, 'benchkeep-photo:imported-1');
  assert.equal(restored.draft?.photo?.uri, 'benchkeep-photo:imported-1');
  assert.deepEqual(restored.projects[0].checkpoints[0].pin, { x: 0.25, y: 0.75 });
  assert.equal(original.projects[0].checkpoints[0].photo.uri, photo.uri);
});

test('a built-in sample is excluded and cannot become an imported free-limit exemption', async () => {
  const bench = fixture();
  bench.projects.push({ ...bench.projects[0], id: 'sample-botanical', sample: true, checkpoints: [{ ...bench.projects[0].checkpoints[0], photo: { uri: 'sample:botanical', width: 1, height: 1 } }] });
  const raw = await exportBenchBackup(bench, reader);
  assert.equal(JSON.parse(raw).bench.projects.length, 1);
  const payload = JSON.parse(raw);
  payload.bench.projects[0].sample = true;
  const io = writer();
  await assert.rejects(importBenchBackup(JSON.stringify(payload), io), /Invalid project/);
  assert.equal(io.writes.length, 0);
});

test('external URLs and private local paths are rejected before any photo IO', async () => {
  for (const uri of ['https://example.org/tracker.jpg', 'file:///private/secrets.jpg', 'file:///documents/benchkeep-photos/../secrets.jpg', 'data:image/svg+xml,<svg/>']) {
    const bench = fixture(); bench.projects[0].checkpoints[0].photo.uri = uri;
    let calls = 0;
    await assert.rejects(exportBenchBackup(bench, { async readPhoto() { calls++; return dataUri; } }), /external or unsupported/);
    assert.equal(calls, 0);
  }
  assert.equal(isManagedPhotoUri('file:///documents/benchkeep-photos/saved-1.jpg'), true);
  const payload = JSON.parse(await exportBenchBackup(fixture(), reader));
  payload.bench.projects[0].checkpoints[0].photo.uri = 'file:///private/secrets.jpg';
  const io = writer();
  await assert.rejects(importBenchBackup(JSON.stringify(payload), io), /external or unsupported/);
  assert.equal(io.writes.length, 0);
});

test('malformed photos, missing references and schema changes fail before writing', async () => {
  const valid = await exportBenchBackup(fixture(), reader);
  const cases: Array<(p: any) => void> = [
    p => { p.photos['img-1'].base64 = 'not_base64'; },
    p => { p.photos['img-1'].base64 = 'SGVsbG8='; },
    p => { p.photos['img-1'].width = 2; },
    p => { delete p.photos['img-1']; },
    p => { p.photos['img-2'] = p.photos['img-1']; },
    p => { p.bench.projects[0].checkpoints[0].pin.x = 2; },
    p => { p.bench.draft.projectId = 'absent'; },
    p => { p.bench.projects.push(p.bench.projects[0]); },
    p => { p.bench.projects[0].sample = 'false'; },
    p => { p.version = 99; },
  ];
  for (const mutate of cases) {
    const payload = JSON.parse(valid); mutate(payload); const io = writer();
    await assert.rejects(importBenchBackup(JSON.stringify(payload), io));
    assert.equal(io.writes.length, 0);
  }
});

test('oversized files fail before parsing and without IO', async () => {
  const io = writer();
  await assert.rejects(importBenchBackup(' '.repeat(MAX_BACKUP_BYTES + 1), io), /25 MiB/);
  assert.equal(io.writes.length, 0);
});

test('a failed second photo write leaves current state intact and cleans only newly created files', async () => {
  const bench = fixture();
  bench.draft!.photo = { ...photo, uri: 'benchkeep-photo:source-2' };
  const before = JSON.stringify(bench);
  const raw = await exportBenchBackup(bench, reader);
  let writes = 0; const removed: string[] = [];
  await assert.rejects(importBenchBackup(raw, {
    async writePhoto(_data, width, height) { if (++writes === 2) throw new Error('disk full'); return { uri: 'benchkeep-photo:new-1', width, height }; },
    async removePhoto(photo) { removed.push(photo.uri); },
  }), /disk full/);
  assert.deepEqual(removed, ['benchkeep-photo:new-1']);
  assert.equal(JSON.stringify(bench), before);
});

test('an empty bench round trips without photo IO', async () => {
  let calls = 0;
  const bench: BenchState = { version: 1, projects: [], draft: null };
  const raw = await exportBenchBackup(bench, { async readPhoto() { calls++; return dataUri; } });
  const io = writer();
  assert.deepEqual(await importBenchBackup(raw, io), bench);
  assert.equal(calls + io.writes.length, 0);
});
