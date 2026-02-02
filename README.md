# Skynetlabs Productivity Chrome Extension

> Focus mode, task management, floating notes, and site blocking.

A premium Chrome extension serving as a private command center for elite operators—founders, CEOs, and high-performing entrepreneurs.

![Chrome](https://img.shields.io/badge/Chrome-Extension-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-10B981?style=for-the-badge)
![Version](https://img.shields.io/badge/Version-3.0.0-000000?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

---

## Features

| Feature | Description |
|---------|-------------|
| **Focus Mode** | Unbypassable site blocking to eliminate distractions |
| **Task Management** | Gamified task system with productivity scoring |
| **Floating Notes** | Quick notes overlay on any webpage |
| **New Tab Dashboard** | Custom command center replacing default new tab |
| **Side Panel** | Persistent productivity panel alongside your browsing |
| **Keyboard Shortcuts** | Full keyboard control for power users |
| **Deep Work Tracking** | Monitor and optimize your focus sessions |

---

## Installation

### From Source (Developer Mode)

1. **Clone the repository**
   ```bash
   git clone https://github.com/waseemnasir2k26/skynetlabs-productivity-extension.git
   ```

2. **Open Chrome Extensions**
   - Navigate to `chrome://extensions/`
   - Enable **Developer mode** (toggle in top-right)

3. **Load the extension**
   - Click **Load unpacked**
   - Select the cloned folder

4. **Pin the extension**
   - Click the puzzle piece icon in toolbar
   - Pin Skynetlabs Productivity for quick access

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+H` | Open extension popup |
| `Alt+F` | Toggle Focus Mode |
| `Alt+T` | Quick Add Task |
| `Ctrl+Shift+N` | Toggle Floating Notes |

---

## Project Structure

```
skynetlabs-productivity-extension/
├── manifest.json          # Extension configuration (Manifest V3)
├── popup.html             # Main popup interface
├── newtab.html            # New tab dashboard
├── sidepanel.html         # Side panel interface
├── focus.html             # Focus mode page
├── blocked.html           # Blocked site page
├── css/
│   ├── styles.css         # Main styles
│   └── popup.css          # Popup-specific styles
├── js/
│   ├── background.js      # Service worker
│   ├── popup.js           # Popup logic
│   ├── newtab.js          # Dashboard logic
│   ├── sidepanel.js       # Side panel logic
│   ├── floating-notes.js  # Content script for notes
│   └── offscreen.js       # Offscreen document handler
├── icons/                 # Extension icons
└── rules/
    └── blocking_rules.json
```

---

## Tech Stack

- **Platform:** Chrome Extension (Manifest V3)
- **Languages:** JavaScript, HTML, CSS
- **APIs Used:**
  - Chrome Storage API
  - Declarative Net Request
  - Side Panel API
  - Alarms & Notifications API
  - Tab Groups API

---

## Permissions Explained

| Permission | Purpose |
|------------|---------|
| `storage` | Save tasks, settings, and preferences |
| `declarativeNetRequest` | Block distracting websites |
| `sidePanel` | Enable side panel functionality |
| `notifications` | Focus mode and task reminders |
| `tabs` | Manage tab states and groups |

---

## Roadmap

- [ ] Cloud sync across devices
- [ ] Calendar integration
- [ ] Pomodoro timer mode
- [ ] Analytics dashboard
- [ ] Mobile companion app

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Author

**Waseem Nasir**
- Website: [skynetjoe.com](https://www.skynetjoe.com)
- LinkedIn: [@waseemnasir2k26](https://linkedin.com/in/waseemnasir2k26)
- GitHub: [@waseemnasir2k26](https://github.com/waseemnasir2k26)

---

<p align="center">
  <b>Built by <a href="https://www.skynetjoe.com">Skynetlabs</a></b><br>
  AI Automation & Systems Studio
</p>
