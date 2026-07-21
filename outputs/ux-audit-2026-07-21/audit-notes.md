# Governor frontend UX audit notes

Date: 2026-07-21

## Scope and evidence

- `01-landing-desktop.png`: current local `/` landing page, captured from the running Next.js application.
- `02-sandbox-route-404.png`: current local `/demo` route, captured from the running application.
- Authenticated `/app` redirected to GitHub OAuth; the in-app browser blocked the redirected navigation, so the authenticated dashboard, setup, and receipt detail could not be visually inspected in this run.

## Step notes

1. Landing entry — healthy visual foundation. The promise, primary action, privacy boundary, and illustrative receipt are visible without a login.
2. Public proof path — blocked. The documented `/demo` public sandbox returns the default Next.js 404 page in the current local build.
3. Authenticated workspace entry — not visually verified. Source review was used only to identify navigation, live-state, and accessibility risks; this is not screenshot evidence.

## Highest-impact findings

- The current landing is a major visual upgrade, but the product lost its low-commitment proof route when `/demo` was removed.
- Attribution confidence has been removed from the receipt hero and calculation details, despite being a core product-trust differentiator.
- The landing preview is effective as an explainer, but it is static and resembles a generic analytics mock rather than a navigable receipt artifact.
- Mobile navigation exposes only Overview and Setup; repository switching, Settings, identity, and sign-out are omitted.
- `--dim` text measures 3.69:1 against the standard card surface, below the normal 4.5:1 target for small text.
- No dedicated `:focus-visible` styling or skip link was found in the current styles.
