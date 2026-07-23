# Harvard Quad

Harvard Quad is an independent campus social platform that brings feeds, realtime messaging, student communities, profiles, and discovery into one React/TypeScript application backed by Supabase and PostgreSQL. It is not owned, sponsored, commissioned, or endorsed by Harvard University or any Harvard school.

**Current status:** The project reached substantial implementation and was paused before public launch. This repository shows the implemented product and architecture; no live demo is linked.

## Role and Collaboration

Justin Li served as **Primary Engineer**, leading most implementation across feeds, messaging, Squads, profiles, mobile workflows, Supabase integration, and the later architecture expansion. A collaborator contributed to early profile, authentication, messaging, and mobile-interface work.

## Product Scope

The current `main` source includes:

- Campus, custom, and friends feeds with rich-text, image, link, and poll posts
- Nested replies, reactions, sharing, reports, mentions, pins, and Realtime updates
- Direct and group messaging with read state, pagination, media, mute/hide controls, and virtualized history
- Open, restricted, and private Squads with invitations, join requests, roles, feeds, chat, and documents
- Profiles, friends, blocking, notifications, Explore, and global search
- Separate desktop and mobile shells with touch drawers, safe-area handling, and mobile keyboard/viewport work

The calendar surface remains an in-memory prototype rather than a persistent backend feature.

## Architecture

![Harvard Quad architecture overview](docs/harvard-quad-architecture.svg)

The diagram summarizes the architecture visible in this repository. It does not establish hosted-schema parity, deployment status, or production security or scalability.

- **Client:** React 18, TypeScript, Vite, Tailwind CSS, Radix UI, Tiptap, and TanStack Virtual
- **Application services:** feed, messaging, Squads, profiles, friends, notifications, blocking, and signed-asset helpers
- **Backend design:** Supabase Auth, PostgreSQL, Realtime, Storage, Row Level Security, triggers, and database functions
- **Mobile web:** dedicated navigation and layouts, Visual Viewport handling, safe areas, touch drawers, and local UI-library patches
- **Deployment configuration:** Vercel SPA configuration; configuration is not proof of a current or successful deployment

## Web and iOS Branches

`main` contains the latest and most complete web/mobile-web implementation. The public `IOS-branch` is an older, divergent product snapshot that packages its React/Vite application with Capacitor 8 and an Xcode/SPM wrapper. That branch includes a custom URL scheme, Google OAuth return handling, lifecycle-state persistence, and limited Swift WKWebView customization.

The branches were not combined into one completed release. The iOS work supports an accurate description of a React/TypeScript application packaged for iOS with Capacitor—not a native Swift application. No App Store release or independently verified TestFlight distribution is claimed.

## Source, Data, and Deployment Boundaries

- The project was paused before public launch; no adoption, active-user, production-scale, or institutional-use claim is made.
- No live site is linked. The accessible deployment is authentication-gated, its exact revision has not been verified, and repository changes should not be treated as live-site changes.
- The SQL directory records schema and authorization evolution, but the hosted migration ledger was not sufficient to prove a canonical replay order.
- The included authorization and Storage policies require a fresh environment-level review and testing before any hosted demo or production use.
- Current sign-up source expects a Harvard-email validation function that was absent from the reviewed hosted Edge Function state.
- No automated unit, integration, end-to-end, or iOS test suite is configured. The repository workflow validates dependency installation and the production source build only.
- Landing-page phone mockups use fictional illustrative names and content; they are not user records, testimonials, or adoption evidence.
- No private user-level content, database dump, or production credential is included in the public repository.

## Local Setup

Use Node.js 20.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Provide credentials for a Supabase project you control:

```dotenv
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Validate the source:

```bash
npm run check
npm run build
```

Authentication and data workflows require a compatible Supabase backend. Do not point a local copy at an existing hosted project without authorization, and do not apply the migration collection to production without establishing and testing an explicit migration order.

## License and Contributions

The repository is publicly viewable for technical evaluation under the proprietary [LICENSE](LICENSE). External contributions are not currently accepted. Any future licensing or contribution-policy change requires agreement among the project owners.
