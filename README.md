# Skynetlabs Productivity (Chrome extension)

Focus mode, a task list, floating notes and a new-tab dashboard in one Manifest V3 extension. Data stays in the browser's extension storage; there is no account and no server.

## What it does

- **Focus mode**: redirects a list of distracting sites to a local `focus.html` page (declarativeNetRequest rules in `rules/blocking_rules.json`)
- **Tasks**: add and complete tasks from the popup, new tab and side panel
- **Floating notes**: a notes overlay you can toggle on any page
- **New-tab dashboard** and **side panel**
- **Shortcuts**: `Ctrl+Shift+H` open popup, `Alt+F` toggle focus mode, `Alt+T` quick-add task, `Ctrl+Shift+N` toggle notes

## Install (developer mode)

```bash
git clone https://github.com/waseemnasir2k26/skynetlabs-productivity-extension.git
```

1. Open `chrome://extensions` and switch on Developer mode.
2. Click Load unpacked and pick the cloned folder.
3. Pin the extension from the puzzle-piece menu.

## Permissions

`storage`, `unlimitedStorage`, `alarms`, `notifications`, `idle`, `tabs`, `offscreen`, `sidePanel`, `declarativeNetRequest`, plus access to all sites (needed to inject the notes overlay and block pages). Check `manifest.json` before installing.

## Status

Version 3.0.0, loaded unpacked only; it is not on the Chrome Web Store. Focus mode can be switched off from the extension, so treat it as a nudge, not a lock. Not tested on Firefox or Safari.

MIT.

For you if: you want a free, local-only focus and task tool and are fine loading an extension from source.

---

Need this wired into your business? SkynetLabs builds voice agents, n8n back offices and sites that convert → https://skynetjoe.com
Contact: info@skynetjoe.com
