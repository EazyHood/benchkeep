# Portable backup

`src/backup.ts` exports and imports a versioned JSON format with embedded JPEG photo bytes. It is distinct from the smaller text-only notes export and from the on-device previous-state recovery record.

```ts
const raw = await exportBenchBackup(bench, { readPhoto });
const candidate = await importBenchBackup(raw, { writePhoto, removePhoto });
// Only after successful validation/photo writes and the user's in-app confirmation:
await repository.save(candidate);
```

`readPhoto(Photo)` returns a `data:image/jpeg;base64,...` string. `writePhoto(dataUri, width, height)` decodes the image and stores a new app-owned image, returning its local `Photo`. The optional `removePhoto(Photo)` rolls back only newly written photos if import fails. The caller also removes staged photos if the user cancels the replacement dialog.

The codec validates the entire input before the first photo write: schema/version, project and point records, dates, unique IDs, normalized marker coordinates, complete references, canonical base64, JPEG container/header and matching image dimensions. Platform adapters perform a full pixel decode as an additional check. Referenced files, remote URLs and SVG payloads are not imported or fetched. Photos are deduplicated by original URI during export and replaced with new local IDs during import. Built-in samples are excluded, and imported records cannot carry sample flags or purchase state.

Limits are 25 MiB of UTF-8 JSON, 6 MiB of decoded bytes per photo, 1600 pixels per image edge (matching app photo normalization), 200 unique photos, 250 projects and 2000 checkpoints. Backups exceeding a limit fail with an explanation; they are not partially imported.

The original bench stays intact until the caller successfully commits the returned state. The codec never saves application state itself. If new photo creation fails, it invokes the provided cleanup adapter; a cleanup failure does not replace the original exception. Existing images are not removed by this module.

Premium status is not part of this file. Import can preserve multiple previously owned projects without fabricating an entitlement; creating or reactivating active projects remains governed by the app's actual purchase status. Neither this backup nor a notes export restores a store purchase.

Unit validation:

```sh
npx tsx --test tests/backup.test.ts
```

Seven tests cover complete round trip with shared photo/draft, sample isolation, external/private references, malformed payloads, missing/extra images, size limits, failed-write cleanup and empty benches. Unit photo IO is injected. A successful unit round trip is not a substitute for the browser/native download → file pick → pixel decode → persisted restart check.
