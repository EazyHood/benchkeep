# Benchkeep

**A little pause. A place to return.**

Benchkeep keeps a visual bookmark in a craft project: a photo, a point on that photo, and the next move. Open the piece later, look closer at the point, and continue without searching through a camera roll and a separate note.

Built for hobby work done in more than one sitting: embroidery, model making, collage and similar projects. This is a visual record of the maker’s own next step, not an instruction generator or a safety tool.

## The working flow

1. Choose a photo or use the device camera.
2. Place a point on the picture. Direction buttons provide another way to position it.
3. Name the piece, write the next move, and optionally preserve a small detail.
4. Save the checkpoint. Return to the same location, switch between the whole piece and a closer view, then continue making.
5. Save another checkpoint or mark the piece finished. Previous notes remain in the trail.

Drafts and project metadata persist locally. Photos are decoded and resized before permanent storage, with the orientation-normalized dimensions used for point geometry. Android/iOS use app document files; web uses IndexedDB. Coordinates are normalized to the image rather than screen pixels, so they survive layout changes.

The built-in **Autumn leaves** example and its generated embroidery image are marked as sample content. It is not customer evidence. Starting another checkpoint from the sample starts a normal personal project rather than creating an unlimited free sample.

## Full bench and RevenueCat

The free bench supports two active pieces. **Full bench** is a one-time unlock for more active pieces. Completed pieces, reading existing work and exporting remain available. If an imported backup has more than two active pieces, it remains readable; creating more requires the entitlement or finishing existing work.

RevenueCat supplies the localized price and real `benchkeep_plus` entitlement. There is no local “premium” switch. Cancellation, pending/failed purchases and absent configuration do not unlock access. Development Test Store purchases are visibly labeled **Test purchase · no real charge**. Production web purchasing is disabled. Native store credentials and public release remain separate deployment tasks.

See [RevenueCat setup](docs/revenuecat-setup.md) for the gateway configuration and store limitations. Never put a secret RevenueCat key or store service-account credential in an `EXPO_PUBLIC_` variable.

## Taking your work elsewhere

- **Export notes** produces a readable text record. It contains notes and point positions, not photos.
- **About & privacy → Export full backup** produces a portable JSON file containing JPEG bytes, project data, draft and points. The built-in example is excluded.
- **Import a backup** validates the structure, image data, dimensions and size, then asks before replacing the current bench. Photos are written under new local IDs; purchases are not restored by a data backup.
- Limits: 25 MiB per backup and 6 MiB per embedded photo. Failed imports clean newly created photos while preserving the current bench.

Backups are not encrypted by Benchkeep. Keep them somewhere appropriate for their contents. Uninstalling the app or clearing browser storage can remove local work.

## Run locally

Requires a supported Node LTS runtime. Development here used Node 24, Expo SDK 57, React Native 0.86 and React 19.2.3, selected from the current official Expo template. Expo-compatible native dependencies were installed using `expo install`; exact resolved versions are in `package-lock.json`.

```sh
npm ci
npm run web
npm run typecheck
npm test
npm run export:web
```

`npm run export:web` writes the standalone web preview to `dist/`. It is a preview/export target and does not replace an eligible mobile store listing. Native Android preparation/build notes live in [Android build](docs/android-build.md).

Official framework references used: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [ImagePicker](https://docs.expo.dev/versions/v57.0.0/sdk/imagepicker/), [ImageManipulator](https://docs.expo.dev/versions/v57.0.0/sdk/imagemanipulator/).

## Verification and practical limits

The automated suite covers pin geometry under multiple image and viewport sizes, letterboxing, focus near edges, draft/checkpoint persistence, write failures, primary/backup recovery, free limits, purchase cancellation/concurrency and portable backup validation/rollback. These tests do not claim user adoption or measured time savings.

Browser walkthroughs additionally exercise photo import, point placement, checkpoint creation, resumption, completion, persistence after reload, RevenueCat Test Store outcomes and moving a backup to a fresh origin. Physical camera behavior, store-signed purchase restoration and actual store publication require device/store checks before claiming a production release.

Known scope: there is no cloud sync, collaboration, automated capture or interpretation of what appears in a photo. The maker supplies the next move. The focus animation respects reduced-motion preferences. Four bundled font files provide DM Sans and DM Serif Display without a runtime font service.

## Project map

| Path | Responsibility |
|---|---|
| `App.tsx`, `src/appStyles.ts` | Application routes, functional screens and editorial layout |
| `src/components/PhotoBoard.tsx`, `src/geometry.ts` | Image-relative pin placement and focus interaction |
| `src/model.ts`, `src/repository.ts` | Checkpoints, limits, validated state and serialized persistence |
| `src/media.ts`, `src/media.web.ts` | Platform photo storage and decoding |
| `src/backup.ts`, `src/backupIO*` | Portable backup validation, export/import and platform file UI |
| `src/purchases/` | RevenueCat configuration, gateways, entitlement controller and tests |
| `assets/` | Original app icon and clearly identified generated sample image |

Internal dependency note: at this build, `npm audit` reports 11 moderate findings propagated through the Expo prebuild `xcode → uuid` toolchain, with no high or critical findings. The suggested automatic downgrade to an obsolete Expo major was not applied.
