# GitHub Pages preview

Published at [eazyhood.github.io/benchkeep](https://eazyhood.github.io/benchkeep/), from [EazyHood/benchkeep](https://github.com/EazyHood/benchkeep). GitHub Actions run `34803956262` completed both build and deployment successfully for application commit `c75a1a056c9f17496644e355c7fc597a84ebff5c`. The deployed preview was opened and its sample, point and focus interaction checked on 14 September 2026 UTC. This is a web preview, not a mobile store release.

`app.config.js` starts from the existing `app.json`. It adds `experiments.baseUrl` only when `BENCHKEEP_WEB_BASE_URL=/benchkeep` is explicitly present. Native/prebuild and local development configuration otherwise remain unchanged.

The workflow in `.github/workflows/pages.yml` runs on `main` pushes or manual dispatch. It installs the lockfile, checks TypeScript, runs tests, exports a production preview and uses GitHub's Pages artifact/deployment actions. Build permissions are read-only; the deployment job alone receives Pages and OIDC write permissions. Actions are pinned to verified release commit IDs.

The repository uses **Settings → Pages → Source: GitHub Actions**. No Pages, Expo or RevenueCat personal token is needed by this workflow. `.env.local` is neither committed nor loaded; Test Store configuration is excluded from the production export.

For a local PowerShell validation without changing the dev/native configuration in other processes:

```powershell
$env:BENCHKEEP_WEB_BASE_URL = '/benchkeep'
$env:EXPO_NO_DOTENV = '1'
$env:EXPO_PUBLIC_REVENUECAT_MODE = 'production'
$env:EXPO_PUBLIC_REVENUECAT_TEST_STORE_KEY = ''
npx expo export --platform web --output-dir dist-pages
```

Run this in a separate shell. `dist-pages/` is ignored by Git. It is the exported artifact; source files are published through the repository separately. A production web preview cannot buy or restore Full bench and does not replace the mobile store listing required by Shipaton.

References: [Expo website publishing / GitHub Pages](https://docs.expo.dev/guides/publishing-websites/#github-pages), [GitHub custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
