# Changelog

All notable changes to the JHTS website. Versions follow [Semantic Versioning](https://semver.org/).

## [0.1.0] - Milestone 1: Foundation

- Next.js 16 app with the JHTS design tokens, self-hosted Fraunces, Literata and Instrument Sans, and light and dark themes.
- `<Weave />` lattice and generated `<IssueCover />` components.
- Header with mega-menus, Cmd/Ctrl + K search palette, mobile full-screen menu; footer with weave band.
- Supabase migrations: content, submissions, in-site peer review (Reviewer role), payments, operations, RLS and storage policies; RLS smoke tests.
- Seed generator for categories, editorial board, pages and policies, settings and SAMPLE issues.
- Health, liveness and readiness endpoints; structured logging; optional Sentry; security headers.
- CI, Dockerfile and docker-compose, Dependabot.
