# Benchkeep — observed QA session

Date: 14 September 2026 UTC / evening of 13 September in Colombia. Operator: Codex, through the Edge browser UI. The app was under active development; preserve the final source commit separately. Test material was the generated embroidery asset and explicitly named QA pieces, not user craft data.

## Environment and scope

- Expo 57 development web preview: `http://localhost:8089`.
- Separate production web export, with independent browser storage: `http://localhost:8090`.
- Windows / Edge. Responsive home layout checked at 393 CSS pixels, then viewport override reset.
- These are browser observations. They do not establish native camera behavior, Android runtime, native store restoration, store availability, accessibility certification, or user-study results.
- Public preview deployed from commit `c75a1a056c9f17496644e355c7fc597a84ebff5c` through [successful workflow 34803956262](https://github.com/EazyHood/benchkeep/actions/runs/34803956262). The [live page](https://eazyhood.github.io/benchkeep/) was opened and its sample image, fonts, pin and completed focus animation were observed after deployment.

## Observed results

| Control | Observed result |
|---|---|
| Sample resume view | Generated embroidery was labeled as sample; Look closer focused on the saved point and Whole piece returned to context. |
| Photo import and checkpoint | Imported the generated image through the file chooser, placed a point using accessible directional controls, entered title/next move/detail, and saved successfully. |
| Reload | Reopened the first piece after a full reload. Photo, next move, detail and point remained. |
| Notes export | Downloaded `qa-embroidery-generated-sample-notes.txt`; file contained the exact next move/detail and point at 50% across, 48% down. |
| Free capacity | Two normal QA pieces were saved. Attempting a third opened Full bench; no third piece was created yet. |
| RevenueCat offering | The app displayed `$4.99` from the official SDK. Its Test Store modal named `benchkeep_full_lifetime`, `non_consumable`, `$4.99`. |
| Cancel purchase | Official Test Store Cancel returned “Purchase cancelled. No access was changed.” Upgrade remained available; no Plus granted. |
| Failed purchase | Official Test failed purchase returned a purchase error; no Plus granted. |
| Valid purchase | Official Test valid purchase returned Full bench unlocked. A third normal piece could then be saved. No real payment was made. |
| Refresh and reload access | Refreshed the same sandbox customer's access. Reloaded and observed Full bench plus all three saved pieces. This is not native purchase restoration on a fresh installation. |
| Server-side corroboration | RevenueCat's product page with Sandbox enabled showed an anonymous customer and a One Time transaction at 03:33 UTC, 14 September 2026. |
| Portable backup export | Downloaded `benchkeep-backup-2026-09-14.json`, 1,662,504 bytes, format `benchkeep-portable`, version 1. Photos were embedded rather than only referenced by the original browser storage. |
| Portable backup import | Imported the file into the independent production origin with zero pieces and no premium access. The confirmation accurately showed 3 incoming / 0 existing. Three pieces, photos, notes and points were recovered. The first piece showed the original point and detail. |
| Backup does not grant premium | The fresh production origin could read the three imported pieces but did not acquire Plus. Adding another piece opened an unavailable native-purchase panel. Test Store purchase was not exposed by the production build. |
| Complete and reopen | Continued an imported piece, observed Making again, then finished it and retained the photo, point and trail. With two other active pieces and no Plus, Put back on the bench opened the purchase panel and kept the piece finished. |

## Issues found and corrected during this session

- Literal `\\n` displayed in the sample headline.
- Finished-project reopening and editable sample state could evade the free active-piece limit.
- Invalid imported sample flags could evade counting; missing primary storage ignored an available recovery copy.
- Photo preparation incorrectly used the checkpoint-saving label.
- Web sandbox refresh needed wording distinct from native store restoration.
- Portable export needed the image bytes, full validation and rollback.
- Over-limit imported data needed explanatory capacity text instead of “3 of 2”.

The independent reviewer also identified save/import cancellation races. Check the final implementation and automated results before release; finding a defect does not itself prove a fix was tested on every platform.

## Remaining release evidence

Native runtime, camera/gallery permissions, offline restart, native purchase/restore, store listing in the United States, free judge access, final device video, and submission receipt remain separate requirements. A web sandbox receipt is not revenue and this QA document is not a hackathon submission.
