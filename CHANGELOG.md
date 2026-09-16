# Changelog

All notable changes to this project are documented in this file.

## [2026.09] - 2026-09-16

- Maintenance review of skynetlabs-productivity-extension — a Chrome Manifest V3 productivity extension by SkynetLabs (focus mode, task management, floating notes, site blocking).
- Status: vanilla HTML/CSS/JS extension, no build step. Surfaces are `popup.html`, `newtab.html`, `sidepanel.html`, `focus.html`, `blocked.html` and `offscreen.html`, backed by `js/background.js` and `rules/blocking_rules.json` (declarativeNetRequest). `manifest.json` reports version 3.0.0. Installed from source via Chrome developer mode; the README states no Chrome Web Store listing.
- Reviewed September 2026: documentation refreshed and the repo versioned as v2026.09. Extension code and `manifest.json` version were deliberately left untouched.
- Known gaps: no CHANGELOG before this release; no tests or CI; no package.json or lint/build tooling; README roadmap items (cloud sync, calendar integration, pomodoro mode, analytics dashboard, mobile companion) remain unstarted.
- Licensing: MIT LICENSE file is present.
