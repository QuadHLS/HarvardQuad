# Harvard Quad — iOS Branch

This branch preserves the strongest historical iOS packaging work for Harvard Quad. It is a divergent, older product snapshot—not `main` plus iOS support and not a completed cross-platform release.

Harvard Quad is an independent, paused, unreleased project. It is not owned, sponsored, commissioned, or endorsed by Harvard University or any Harvard school. For the overall project scope, role, architecture, and publication boundaries, see the [default-branch README](https://github.com/QuadHLS/HarvardQuad#readme).

## Verified Branch Scope

- React 18, Vite, and TypeScript application packaged with Capacitor 8
- Xcode and Swift Package Manager project targeting iOS 15
- Capacitor App and Browser plugins for lifecycle and in-app OAuth flows
- Custom `harvardquad` URL scheme and Supabase PKCE return handling
- App-state persistence across lifecycle changes
- Limited Swift customization for WKWebView navigation behavior

The branch does not establish App Store publication, independently verified TestFlight distribution, or a native Swift application. The custom `AuthBrowserPlugin` files are not wired into the verified TypeScript/Xcode flow and should not be treated as an active integration.

## Source and Build Boundaries

- Generated Capacitor web output is intentionally not tracked. Run a fresh build and `cap sync ios` locally.
- No hosted deployment is promoted or verified against this branch.
- Functional authentication and data workflows require a compatible Supabase project controlled by the developer.
- Do not connect this source to an existing hosted project or apply migrations without authorization and a tested migration plan.
- No automated unit, integration, end-to-end, or iOS test suite is configured.

## Local Setup

Use Node.js 22 as specified by `.nvmrc`.

```bash
npm ci
cp .env.example .env.local
npm run build
npm run sync:ios
```

Provide credentials for a Supabase project you control:

```dotenv
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Opening and signing the Xcode project requires macOS, Xcode, an Apple developer configuration, and independently authorized signing assets. Build configuration is not distribution proof.

## License and Contributions

This source is publicly visible for portfolio and evaluation purposes under the proprietary [LICENSE](LICENSE). External contributions are not currently accepted. Any future licensing or contribution-policy change requires agreement among the project owners.
