import { parseState, type BenchState, type Photo, type Project, type Draft } from './model';

export const MAX_BACKUP_BYTES = 25 * 1024 * 1024;
export const MAX_BACKUP_IMAGE_BYTES = 6 * 1024 * 1024;
const MAX_PHOTOS = 200;
const MAX_PROJECTS = 250;
const MAX_CHECKPOINTS = 2000;
const PREFIX = 'data:image/jpeg;base64,';
const FORMAT = 'benchkeep-portable';
type EmbeddedPhoto = { mime: 'image/jpeg'; width: number; height: number; base64: string };
type PhotoMap = Record<string, EmbeddedPhoto>;
type Backup = { format: typeof FORMAT; version: 1; exportedAt: string; bench: BenchState; photos: PhotoMap };
export interface BackupReader { readPhoto(photo: Photo): Promise<string> }
export interface BackupWriter {
  writePhoto(dataUri: string, width: number, height: number): Promise<Photo>;
  /** Optional cleanup of files created during a failed import; never existing photos. */
  removePhoto?(photo: Photo): Promise<void>;
}

function fail(message: string): never { throw new Error(message); }
function record(value: unknown, keys: string[], label: string): asserts value is Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).some(key => !keys.includes(key))) fail(`Invalid ${label} in this backup.`);
}
function text(value: unknown, max: number, label: string, allowEmpty = false): asserts value is string {
  if (typeof value !== 'string' || value.length > max || (!allowEmpty && !value.trim())) fail(`Invalid ${label} in this backup.`);
}
function date(value: unknown) {
  text(value, 40, 'date');
  if (!Number.isFinite(Date.parse(value))) fail('Invalid date in this backup.');
}
function size(value: unknown): asserts value is number {
  // keepPhoto caps the longest edge at 1600; reject oversized decoded images
  // before the platform decoder allocates pixel buffers.
  if (!Number.isSafeInteger(value) || (value as number) < 1 || (value as number) > 1600) fail('Invalid photo dimensions in this backup (maximum 1600 pixels per edge).');
}
function point(value: unknown, optional = false) {
  if (optional && value === null) return;
  record(value, ['x', 'y'], 'photo point');
  if (![value.x, value.y].every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1)) fail('Invalid photo point in this backup.');
}
function utf8Size(value: string): number {
  let bytes = 0;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 0x80) bytes++;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff && i + 1 < value.length && value.charCodeAt(i + 1) >= 0xdc00 && value.charCodeAt(i + 1) <= 0xdfff) { bytes += 4; i++; }
    else bytes += 3;
  }
  return bytes;
}
function checkFileSize(raw: string) {
  if (raw.length > MAX_BACKUP_BYTES || utf8Size(raw) > MAX_BACKUP_BYTES) fail('This backup exceeds the 25 MiB limit.');
}

/** Only app-managed photos can be exported/read or created by the import adapter. */
export function isManagedPhotoUri(uri: string): boolean {
  if (/^benchkeep-photo:[a-z0-9-]+$/i.test(uri)) return true;
  if (!uri.startsWith('file:///')) return false;
  try {
    const path = decodeURIComponent(uri.slice(7));
    return !path.split(/[\\/]/).includes('..')
      && /\/benchkeep-photos\/[a-z0-9-]+\.jpg$/i.test(path)
      && !/[?#\u0000]/.test(path);
  } catch { return false; }
}

function validateBench(value: unknown, portable: boolean): BenchState {
  record(value, ['version', 'projects', 'draft'], 'bench');
  if (value.version !== 1 || !Array.isArray(value.projects) || value.projects.length > MAX_PROJECTS) fail('This backup has an unsupported bench format or too many projects.');
  const projectIds = new Set<string>();
  let checkpoints = 0;
  const photo = (p: unknown, optional = false) => {
    if (optional && p === null) return;
    record(p, ['uri', 'width', 'height'], 'photo');
    text(p.uri, 2048, 'photo reference'); size(p.width); size(p.height);
    if (portable ? !/^backup-photo:img-[0-9]{1,4}$/.test(p.uri) : !isManagedPhotoUri(p.uri)) {
      fail('This backup contains an external or unsupported photo reference.');
    }
  };
  for (const p of value.projects) {
    record(p, ['id', 'title', 'status', 'createdAt', 'updatedAt', 'checkpoints'], 'project');
    text(p.id, 160, 'project ID'); text(p.title, 200, 'project title'); date(p.createdAt); date(p.updatedAt);
    if (projectIds.has(p.id) || !['paused', 'making', 'finished'].includes(p.status)
      || !Array.isArray(p.checkpoints) || !p.checkpoints.length) fail('A project is duplicated or incomplete in this backup.');
    projectIds.add(p.id);
    const checkpointIds = new Set<string>();
    for (const c of p.checkpoints) {
      if (++checkpoints > MAX_CHECKPOINTS) fail('This backup contains too many saved points.');
      record(c, ['id', 'photo', 'pin', 'nextMove', 'detail', 'createdAt'], 'saved point');
      text(c.id, 160, 'saved point ID'); text(c.nextMove, 4000, 'next move'); text(c.detail, 20000, 'detail', true); date(c.createdAt);
      if (checkpointIds.has(c.id)) fail('A saved point is duplicated in this backup.');
      checkpointIds.add(c.id); photo(c.photo); point(c.pin);
    }
  }
  if (value.draft !== null) {
    const d = value.draft;
    record(d, ['projectId', 'title', 'photo', 'pin', 'nextMove', 'detail'], 'draft');
    text(d.title, 200, 'draft title', true); text(d.nextMove, 4000, 'draft next move', true); text(d.detail, 20000, 'draft detail', true);
    if (d.projectId !== undefined && (!projectIds.has(d.projectId) || typeof d.projectId !== 'string')) fail('The draft refers to a project missing from this backup.');
    photo(d.photo, true); point(d.pin, true);
  }
  return parseState(JSON.stringify(value));
}

function decodeBase64(encoded: string): Uint8Array {
  if (!encoded || encoded.length > Math.ceil(MAX_BACKUP_IMAGE_BYTES / 3) * 4
    || encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) fail('A photo has invalid or oversized base64 data.');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const padding = encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0;
  const length = encoded.length / 4 * 3 - padding;
  if (length > MAX_BACKUP_IMAGE_BYTES) fail('A photo exceeds the 6 MiB image limit.');
  const out = new Uint8Array(length);
  let pos = 0;
  for (let i = 0; i < encoded.length; i += 4) {
    const a = alphabet.indexOf(encoded[i]), b = alphabet.indexOf(encoded[i + 1]);
    const c = encoded[i + 2] === '=' ? 0 : alphabet.indexOf(encoded[i + 2]);
    const d = encoded[i + 3] === '=' ? 0 : alphabet.indexOf(encoded[i + 3]);
    const n = (a << 18) | (b << 12) | (c << 6) | d;
    if (pos < length) out[pos++] = (n >> 16) & 255;
    if (pos < length) out[pos++] = (n >> 8) & 255;
    if (pos < length) out[pos++] = n & 255;
    if (i === encoded.length - 4 && ((padding === 2 && (b & 15)) || (padding === 1 && (c & 3)))) fail('A photo uses non-canonical base64 data.');
  }
  return out;
}

function jpegDimensions(bytes: Uint8Array): { width: number; height: number } {
  if (bytes.length < 12 || bytes[0] !== 255 || bytes[1] !== 216 || bytes[bytes.length - 2] !== 255 || bytes[bytes.length - 1] !== 217) fail('A photo is not a supported JPEG image.');
  let offset = 2;
  while (offset + 3 < bytes.length) {
    if (bytes[offset++] !== 255) break;
    while (bytes[offset] === 255) offset++;
    const marker = bytes[offset++];
    if (marker === 218 || marker === 217) break;
    if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
    const length = (bytes[offset] << 8) | bytes[offset + 1];
    if (length < 2 || offset + length > bytes.length) break;
    if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker)) {
      if (length < 8) break;
      const height = (bytes[offset + 3] << 8) | bytes[offset + 4];
      const width = (bytes[offset + 5] << 8) | bytes[offset + 6];
      size(width); size(height);
      return { width, height };
    }
    offset += length;
  }
  return fail('A photo has an invalid JPEG header.');
}

function validateEmbedded(value: unknown): EmbeddedPhoto {
  record(value, ['mime', 'width', 'height', 'base64'], 'embedded photo');
  if (value.mime !== 'image/jpeg' || typeof value.base64 !== 'string') fail('Only embedded JPEG photos are supported.');
  size(value.width); size(value.height);
  const actual = jpegDimensions(decodeBase64(value.base64));
  if (actual.width !== value.width || actual.height !== value.height) fail('A photo does not match its declared dimensions.');
  return value as EmbeddedPhoto;
}

function visitPhotos(state: BenchState, fn: (photo: Photo) => void) {
  state.projects.forEach(project => project.checkpoints.forEach(checkpoint => fn(checkpoint.photo)));
  if (state.draft?.photo) fn(state.draft.photo);
}
function replacePhotos(state: BenchState, lookup: (photo: Photo) => Photo): BenchState {
  return {
    version: 1,
    projects: state.projects.map(project => ({ ...project, checkpoints: project.checkpoints.map(checkpoint => ({ ...checkpoint, photo: lookup(checkpoint.photo) })) })),
    draft: state.draft ? { ...state.draft, photo: state.draft.photo ? lookup(state.draft.photo) : null } : null,
  };
}

export async function exportBenchBackup(state: BenchState, io: BackupReader): Promise<string> {
  state = parseState(JSON.stringify(state));
  // Built-in examples are recreated by the app; they are not the user's media.
  const removedIds = new Set(state.projects.filter(project => project.sample === true).map(project => project.id));
  const projects = state.projects.filter(project => project.sample !== true).map(({ sample: _sample, ...project }) => project as Project);
  const draft: Draft | null = state.draft?.projectId && removedIds.has(state.draft.projectId) ? null : state.draft;
  const clean = validateBench({ version: state.version, projects, draft }, false);
  const sources = new Map<string, Photo>();
  visitPhotos(clean, photo => {
    const previous = sources.get(photo.uri);
    if (previous && (previous.width !== photo.width || previous.height !== photo.height)) fail('A saved photo has inconsistent dimensions.');
    sources.set(photo.uri, photo);
  });
  if (sources.size > MAX_PHOTOS) fail('A backup can include at most 200 unique photos.');
  const photos: PhotoMap = {};
  const references = new Map<string, string>();
  let estimatedSize = utf8Size(JSON.stringify(clean));
  for (const [uri, photo] of sources) {
    const dataUri = await io.readPhoto(photo);
    if (!dataUri.startsWith(PREFIX)) fail('A saved photo could not be exported as JPEG.');
    const embedded = validateEmbedded({ mime: 'image/jpeg', width: photo.width, height: photo.height, base64: dataUri.slice(PREFIX.length) });
    estimatedSize += embedded.base64.length;
    if (estimatedSize > MAX_BACKUP_BYTES) fail('This backup exceeds the 25 MiB limit.');
    const imageId = `img-${references.size + 1}`;
    references.set(uri, `backup-photo:${imageId}`);
    photos[imageId] = embedded;
  }
  const bench = replacePhotos(clean, photo => ({ ...photo, uri: references.get(photo.uri)! }));
  const backup: Backup = { format: FORMAT, version: 1, exportedAt: new Date().toISOString(), bench, photos };
  const raw = JSON.stringify(backup);
  checkFileSize(raw);
  return raw;
}

export async function importBenchBackup(raw: string, io: BackupWriter): Promise<BenchState> {
  checkFileSize(raw);
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return fail('This file is not a valid Benchkeep backup.'); }
  record(value, ['format', 'version', 'exportedAt', 'bench', 'photos'], 'backup');
  if (value.format !== FORMAT || value.version !== 1) fail('This file uses an unsupported backup format.');
  date(value.exportedAt);
  const bench = validateBench(value.bench, true);
  if (!value.photos || typeof value.photos !== 'object' || Array.isArray(value.photos)) fail('This backup has no embedded photo collection.');
  const entries = Object.entries(value.photos);
  if (entries.length > MAX_PHOTOS) fail('This backup contains too many photos.');
  const photos = new Map<string, EmbeddedPhoto>();
  for (const [imageId, embedded] of entries) {
    if (!/^img-[0-9]{1,4}$/.test(imageId)) fail('Invalid embedded photo ID.');
    photos.set(`backup-photo:${imageId}`, validateEmbedded(embedded));
  }
  const referenced = new Set<string>();
  visitPhotos(bench, photo => {
    const embedded = photos.get(photo.uri);
    if (!embedded || embedded.width !== photo.width || embedded.height !== photo.height) fail('A referenced photo is missing or inconsistent.');
    referenced.add(photo.uri);
  });
  if (referenced.size !== photos.size) fail('This backup contains unreferenced photo data.');
  // Complete validation before the first write. App state is returned only after
  // all photos exist; the caller can then atomically replace its current bench.
  const imported = new Map<string, Photo>();
  const created: Photo[] = [];
  try {
    for (const [reference, embedded] of photos) {
      const photo = await io.writePhoto(`${PREFIX}${embedded.base64}`, embedded.width, embedded.height);
      created.push(photo);
      if (!isManagedPhotoUri(photo.uri) || photo.width !== embedded.width || photo.height !== embedded.height) fail('The imported photo could not be saved correctly.');
      imported.set(reference, photo);
    }
    return validateBench(replacePhotos(bench, photo => ({ ...imported.get(photo.uri)! })), false);
  } catch (error) {
    if (io.removePhoto) await Promise.allSettled(created.map(photo => io.removePhoto!(photo)));
    throw error;
  }
}
