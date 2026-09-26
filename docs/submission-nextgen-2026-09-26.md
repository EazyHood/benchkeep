# Benchkeep — Next Gen submission package

Updated 26 September 2026 against source commit `227b2d75db31613107042ace40729b4b4ec4372c` and the independently tested Android APK. This file contains current submission copy, **not a submission receipt**. The public video is still being finalized; add its verified URL before final submission.

## Category and reviewer access

- Requested category: **Next Gen Award only**.
- Public source: <https://github.com/EazyHood/benchkeep>
- Android judging release: <https://github.com/EazyHood/benchkeep/releases/tag/shipaton-nextgen-2026-09-26>
- APK asset: `benchkeep-nextgen-sandbox-2026-09-26.apk`.
- APK SHA-256: `9F16E220BAC060F7235774B49C6F84F0462E96EB3B2B44BFFC897C33D8985A5B`.
- Supporting web preview: <https://eazyhood.github.io/benchkeep/> — craft workflow preview; production purchasing disabled.
- Public YouTube/Vimeo video: **pending final upload and verification**.
- Student eligibility information belongs in Devpost's dedicated fields, not in the repository or media.

The APK is a debug-signed Android development sandbox, Android 7 or later, with an embedded JavaScript bundle. No Metro server, Benchkeep account or payment details are required. Network access is needed for RevenueCat Test Store; saved craft work can be read offline. This download is not a Google Play or Galaxy Store release.

Next Gen is the requested student category. Clear the prior Design Award request if the entry remains unpublished; the design decisions still belong in the main story. Do not populate store URLs, growth, revenue or customer fields with substitutes.

## Devpost title and tagline

**Title:** Benchkeep

**Tagline:** Save the spot, the photo and your next move. Return to an unfinished craft with a visual bookmark.

## Devpost project story — ready to paste

### Inspiration

A progress photo can show what you made without showing where to begin again. For an embroidery piece, model or collage that takes several sittings, the missing detail may be a particular spot and one short instruction.

Benchkeep brings those two things together. It is a visual bookmark for unfinished craft work: a photo, a point on that photo and the maker's own next move. The goal is a clear return to the work, without having to reconnect a camera-roll image with a separate note. This is a product hypothesis, not a claim from a user study.

### What it does

Choose a photo, place a point, name the piece and write the next move. Direction controls provide another way to position the point. Save the checkpoint, then reopen the piece with its photo, point and note together. “Look closer” focuses on the marked detail; “Whole piece” restores the context.

Each new checkpoint preserves the previous note in a trail. A finished piece remains readable and can return to the bench. Craft photos and notes are stored locally. The built-in Autumn leaves example is labeled as sample content.

Portable backups include photos and project data. Import validates the file before replacing the bench. Reading and exporting existing work remain available even when the free plan's capacity is exceeded. Native backup controls are implemented; their Android export/import flow was not part of the final emulator walkthrough.

### How it was built

Benchkeep uses React Native, Expo and TypeScript. Photo points are stored relative to the image rather than screen pixels, so the location is preserved when the layout changes. Serialized writes prevent an earlier autosave from replacing a newer checkpoint. A recoverable local backup and validated portable backups address failed writes and malformed data.

The visual design gives the piece priority: quiet typography, a large image and a short next action. Focus motion respects reduced-motion preferences. The privacy notice and fonts are bundled in the app.

The final source passed 27 automated tests and TypeScript checking. The tests cover geometry, checkpoint history, capacity rules, persistence failures, purchase-state handling, backup validation and the Android embedded-development bootstrap.

### RevenueCat and the business model

The free bench holds two active pieces. Full bench is a one-time unlock for more active pieces. This packaging fits a small personal tool used whenever a maker returns to a project; it does not require an ongoing subscription to keep reading their work.

RevenueCat supplies the offering, localized price and `benchkeep_plus` entitlement. Benchkeep does not unlock premium from a local flag. Cancellation, pending or failed responses and a response without the expected active entitlement cannot grant access. A data backup contains craft work, not a premium entitlement.

The Android demonstration uses RevenueCat Test Store and is explicitly labeled “Test purchase · no real charge.” On the final APK, the native SDK loaded the $4.99 sandbox product. Cancelling kept access locked; a valid sandbox purchase unlocked Full bench. The restore action and another app restart retained access in the same sandbox installation. These checks are not real-money sales, Google Play/Galaxy purchases or cross-device store restoration.

### Challenges and evidence

Keeping a point attached to a photo involves more than drawing a marker. Letterboxing, layout changes and focus near an edge all affect where that point appears. Another boundary was separating craft data from paid capacity: importing a backup must preserve readable work without granting premium or silently discarding extra pieces.

Actual Android execution caught a bootstrap problem that passing unit tests and a compiled APK had missed: Expo's development message socket expected a Metro server. A narrowly scoped adapter now skips that tooling socket only for an embedded Test Store development bundle. The APK remains genuinely debuggable, as RevenueCat requires, while its native host loads the embedded JavaScript without Metro. Purchase guards remain intact.

The final APK was tested on an Android 16 emulator. The run covered photo-picker import, point placement, checkpoint saving, focus and resume. With networking disabled, force-stop and relaunch preserved the photo, point and next move even when RevenueCat could not connect. The sandbox purchase outcomes above were then checked with networking restored.

### Current scope and next steps

This entry targets Next Gen, with public MIT-licensed source and a downloadable Android judging sandbox. Benchkeep has no public app-store release, verified paid customers or measured time-saving results. It does not provide cloud sync, collaboration or automatic interpretation of craft photos. The maker writes the next move.

The final native run did not cover camera capture, native backup export/import or the failed-purchase option. Failure/pending cases have automated coverage, with separately recorded Web SDK failure evidence. There was no physical-device test or production store restoration. Those checks, followed by a small user trial, are next steps before a production release.

The code and project materials were developed with AI assistance. The generated embroidery imagery is demonstration content, not a customer's work or evidence of adoption.

## RevenueCat field — ready to paste

Benchkeep uses RevenueCat for its one-time Full bench unlock. Two active craft pieces are free; additional active pieces require `benchkeep_plus`. The SDK supplies the Lifetime offering and displayed price. On the final Android 16 emulator run, the native SDK loaded the $4.99 sandbox product; cancellation kept access locked, a valid Test Store purchase unlocked Full bench, and restore plus restart retained access in the same installation. The app visibly labels this “Test purchase · no real charge.” There is no local premium flag, payment or real revenue. Pending/failure guards also have automated coverage; they were not replayed in the final native session. Production web purchasing is disabled.

## Additional notes field — ready to paste

Next Gen entry with public MIT-licensed source and an Android judging APK: https://github.com/EazyHood/benchkeep/releases/tag/shipaton-nextgen-2026-09-26 . The release corresponds to source commit 227b2d75db31613107042ace40729b4b4ec4372c. It is a debug-signed development sandbox, not a store release. It runs without Metro and needs no Benchkeep account or payment details. The final APK was tested on an Android 16 emulator for the photo/checkpoint workflow, offline restart and actual RevenueCat Test Store cancellation, successful sandbox purchase, restore and restart. Native camera and backup export/import, physical devices and production store billing remain untested. The supporting web preview explores the craft workflow and has production purchases disabled. Student eligibility details are supplied separately through the form.

## Evidence mapped to the four Next Gen criteria

| Criterion | Present evidence | Boundary |
|---|---|---|
| Useful, clear idea | Save and resume at an image point with a next move. | No user-study or time-saving claim. |
| Progress toward a working app | Public source, installable sandbox APK, observed Android photo/checkpoint and offline restart flows. | Android emulator; no production store release. |
| Thoughtful RevenueCat use | One-time capacity unlock, native SDK product/price, actual Test Store cancel/purchase/restore/restart. | No real-money revenue or production store restoration. |
| Technical and product care | 27 passing tests, image-relative geometry, serialized persistence, validated backups and bundled privacy notice. | Native camera and backup transfer still need device checks. |

## Remaining submission gates

- [ ] Verify the finished public YouTube/Vimeo video is under 120 seconds and contains actual Android footage with accurate emulator and sandbox labels.
- [ ] Verify the exact uploaded icon is 1024 × 1024 and at least one actual app screenshot is 1179 × 2556 without a device frame.
- [ ] Ensure text, source commit, APK, screenshot and video describe the same version.
- [ ] Confirm Next Gen eligibility/repository fields and remove unsupported store-category claims.
- [ ] Complete final submission and preserve the observed confirmation separately from this preparation file.

The public repository, source commit, sandbox release and final native scope are now available. Academic eligibility remains subject to the organizer's determination; it is not established by these technical checks.

## Evidence history and sources

- The historical [14 September browser QA](qa-session-2026-09-14.md) remains scoped to the browser; it included a failed Test Store outcome and portable backup transfer.
- The 23 September APK compiled and matched its source but failed its first actual native cold start on 26 September. It was superseded by the corrected artifact above. [Current QA](qa-nextgen-2026-09-26.md) preserves that distinction.
- [Android build](android-build.md) explains the corrected sandbox recipe; [RevenueCat setup](revenuecat-setup.md) separates native observations, mocked tests and production limits.
- [Official Shipaton rules](https://revenuecat-shipaton-2026.devpost.com/rules), reviewed 26 September: student category, required materials and four judging criteria.
- The earlier [capture plan](shipaton-capture-script-2026-09-23.md) is historical. Its store-listing ending must not be used; this entry links to its public source and sandbox release.

Updating this copy did not create or publish a video, submit the Devpost form, add payment details or make a real-money purchase.
