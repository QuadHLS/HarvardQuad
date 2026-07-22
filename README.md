# Harvard Quad

Harvard Quad is an independent, paused campus social-platform project built with React, TypeScript, Supabase, and PostgreSQL. It is not owned, sponsored, commissioned, or endorsed by Harvard University or any Harvard school.

**Project status:** substantial implementation, unreleased to the public. This repository is published as a source portfolio and engineering record, not as a production-ready service. No hosted demo is linked because the accessible deployment is authentication-gated, its exact deployed revision is unverified, and it cannot currently be updated through the available Vercel access.

## Role and Collaboration

Justin Li served as **Primary Engineer**, implementing the large majority of the application across feeds, messaging, Squads, profiles, mobile workflows, Supabase integration, and the later architecture expansion. A collaborator made limited early contributions to profile, login, messaging, and mobile-interface work. The project should not be represented as a solo effort.

## Product Scope

The current `main` source includes:

- Campus, custom, and friends feeds with rich-text, image, link, and poll posts
- Nested replies, reactions, sharing, reports, mentions, pins, and Realtime updates
- Direct and group messaging with read state, pagination, media, mute/hide controls, and virtualized history
- Open, restricted, and private Squads with invitations, join requests, roles, feeds, chat, and documents
- Profiles, friends, blocking, notifications, Explore, and global search
- Separate desktop and mobile shells with touch drawers, safe-area handling, and mobile keyboard/viewport work

The calendar surface is an in-memory prototype rather than a persistent backend feature. The fuller marketing landing page remains disabled in the current runtime.

## Architecture

![Harvard Quad source architecture](docs/harvard-quad-architecture.svg)

The diagram is a source-derived recruiter overview. It describes implementation mechanisms visible in this repository and does not certify security, privacy, scalability, hosted-schema parity, or deployment success.

- **Client:** React 18, TypeScript, Vite, Tailwind CSS, Radix UI, Tiptap, and TanStack Virtual
- **Application services:** feed, messaging, Squads, profiles, friends, notifications, blocking, and signed-asset helpers
- **Backend design:** Supabase Auth, PostgreSQL, Realtime, Storage, Row Level Security, triggers, and database functions
- **Mobile web:** dedicated navigation and layouts, Visual Viewport handling, safe areas, touch drawers, and local UI-library patches
- **Deployment configuration:** Vercel SPA configuration; configuration is not proof of a current or successful deployment

## Web and iOS Source Boundaries

`main` is the strongest and latest web/mobile-web product state. The public `IOS-branch` is a divergent, older product snapshot that packages its React/Vite application with Capacitor 8 and an Xcode/SPM wrapper. That branch includes a custom URL scheme, Google OAuth return handling, lifecycle-state persistence, and limited Swift WKWebView customization.

The two branch tips were not combined into one completed release. The repository does not establish a successful App Store release or independently verified TestFlight distribution, and this project should not be described as a native Swift application.

## Source, Data, and Deployment Boundaries

- The project was paused before a verified public launch; no adoption, active-user, production-scale, or institutional-use claim is made.
- The GitHub homepage is intentionally blank and the hosted authentication gateway is not promoted as a recruiter demo.
- The exact deployed commit is unknown, and repository changes should not be treated as live-site changes.
- The SQL directory records schema and authorization evolution, but the hosted migration ledger was not sufficient to prove a canonical replay order.
- Direct Supabase access makes RLS, RPC grants, and Storage policies critical. Earlier review identified profile, function-grant, and message-media boundaries that require dedicated environment-level remediation and testing before any production or open-demo use.
- Current source expects a Harvard-email validation function that was not present in the reviewed hosted Edge Function state.
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

This source is publicly visible for portfolio and evaluation purposes under the proprietary [LICENSE](LICENSE). External contributions are not currently accepted. Any future licensing or contribution-policy change requires agreement among the project owners.
