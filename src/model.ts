import type { Point } from './geometry';

export type Photo = { uri: string; width: number; height: number };
export type Checkpoint = {
  id: string; photo: Photo; pin: Point; nextMove: string; detail: string; createdAt: string;
};
export type Project = {
  id: string; title: string; status: 'paused' | 'making' | 'finished';
  createdAt: string; updatedAt: string; sample?: boolean; checkpoints: Checkpoint[];
};
export type Draft = {
  projectId?: string; title: string; photo: Photo | null; pin: Point | null; nextMove: string; detail: string;
};
export type BenchState = { version: 1; projects: Project[]; draft: Draft | null };
export const emptyState = (): BenchState => ({ version: 1, projects: [], draft: null });
export const freshDraft = (project?: Project): Draft => ({ projectId: project?.id, title: project?.title ?? '', photo: null, pin: null, nextMove: '', detail: '' });
export const id = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
export const isSampleProject = (p: Project) => p.sample === true && p.id === 'sample-botanical' && p.checkpoints.length === 1 && p.checkpoints[0].photo.uri === 'sample:botanical';
export const activeCount = (state: BenchState) => state.projects.filter(p => !isSampleProject(p) && p.status !== 'finished').length;
export const latest = (p: Project) => p.checkpoints[p.checkpoints.length - 1];

export function draftError(draft: Draft): string | null {
  if (!draft.photo) return 'Add a photo of your piece first.';
  if (!draft.pin) return 'Place a point on the photo where you will continue.';
  if (!draft.title.trim()) return 'Give this piece a short name.';
  if (!draft.nextMove.trim()) return 'Leave yourself one clear next move.';
  return null;
}

export function commitDraft(state: BenchState, isPlus = false, now = new Date().toISOString()): { state: BenchState; projectId: string } {
  const d = state.draft;
  if (!d) throw new Error('There is no checkpoint to save.');
  const error = draftError(d);
  if (error) throw new Error(error);
  const existing = state.projects.find(p => p.id === d.projectId);
  if (existing?.sample) throw new Error('The example is read-only. Start your own piece to save a checkpoint.');
  if ((!existing || existing.status === 'finished') && !isPlus && activeCount(state) >= 2) throw new Error('Your free bench holds two active pieces. Finish one or unlock Full bench.');
  const checkpoint: Checkpoint = { id: id(), photo: { ...d.photo! }, pin: { ...d.pin! }, nextMove: d.nextMove.trim(), detail: d.detail.trim(), createdAt: now };
  const project: Project = existing
    ? { ...existing, title: d.title.trim(), status: 'paused', updatedAt: now, checkpoints: [...existing.checkpoints, checkpoint] }
    : { id: id(), title: d.title.trim(), status: 'paused', createdAt: now, updatedAt: now, checkpoints: [checkpoint] };
  return { state: { version: 1, projects: [project, ...state.projects.filter(p => p.id !== project.id)], draft: null }, projectId: project.id };
}

function isPhoto(value: any): value is Photo {
  return !!value && typeof value.uri === 'string' && value.uri.length < 5000 && Number.isFinite(value.width) && value.width > 0 && Number.isFinite(value.height) && value.height > 0;
}
function isPoint(value: any): value is Point {
  return !!value && Number.isFinite(value.x) && Number.isFinite(value.y) && value.x >= 0 && value.x <= 1 && value.y >= 0 && value.y <= 1;
}
const string = (v: any) => typeof v === 'string';
export function parseState(raw: string): BenchState {
  const value = JSON.parse(raw);
  if (value?.version !== 1 || !Array.isArray(value.projects)) throw new Error('This backup uses an unsupported format.');
  const ids = new Set<string>();
  for (const p of value.projects) {
    if (!p || !string(p.id) || ids.has(p.id) || !string(p.title) || !['paused', 'making', 'finished'].includes(p.status) || !string(p.createdAt) || !string(p.updatedAt) || !Array.isArray(p.checkpoints) || p.checkpoints.length < 1) throw new Error('A project record is incomplete.');
    ids.add(p.id);
    if (p.sample !== undefined && typeof p.sample !== 'boolean') throw new Error('A project sample flag is invalid.');
    for (const c of p.checkpoints) {
      if (!c || !string(c.id) || !isPhoto(c.photo) || !isPoint(c.pin) || !string(c.nextMove) || !string(c.detail) || !string(c.createdAt)) throw new Error('A saved point is incomplete.');
    }
    if (p.sample && !isSampleProject(p)) throw new Error('An edited sample must be saved as your own piece.');
  }
  if (value.draft !== null) {
    const d = value.draft;
    if (!d || !string(d.title) || !string(d.nextMove) || !string(d.detail) || (d.photo !== null && !isPhoto(d.photo)) || (d.pin !== null && !isPoint(d.pin)) || (d.projectId !== undefined && !string(d.projectId))) throw new Error('The unfinished checkpoint is incomplete.');
  }
  return value;
}
