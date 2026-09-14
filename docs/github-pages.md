# GitHub Pages preview

Prepared for `EazyHood/benchkeep`, with expected preview path `/benchkeep`. Preparing these files does not publish a repository or site.

`app.config.js` starts from the existing `app.json`. It adds `experiments.baseUrl` only when `BENCHKEEP_WEB_BASE_URL=/benchkeep` is explicitly present. Native/prebuild and local development configuration otherwise remain unchanged.

The workflow in `.github/workflows/pages.yml` runs on `main` pushes or manual dispatch. It installs the lockfile, checks TypeScript, runs tests, exports a production preview and uses GitHub's Pages artifact/deployment actions. Build permissions are read-only; the deployment job alone receives Pages and OIDC write permissions. Actions are pinned to verified release commit IDs.

Before running the workflow, the repository owner must enable **Settings → Pages → Source: GitHub Actions**. No Pages, Expo or RevenueCat personal token is needed by this workflow. `.env.local` is neither committed nor loaded; Test Store configuration is excluded from the production export.

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
