// ═══════════════════════════════════════════════════════════════════════════════
// ZENFLOW // NEURAL LABS v2.2 — Advanced Floating Notes System
// Neural-Link Productivity System | DATA FRAGMENTS Across All Pages
// www.skynetjoe.com
// ═══════════════════════════════════════════════════════════════════════════════
//
// FEATURES:
// - Floating notes on all pages with Shadow DOM isolation
// - URL-specific notes (global or page-specific)
// - Categories & Tags system
// - Quick capture (select text → create note)
// - Pin to page element
// - Rich text formatting (markdown preview)
// - Note linking (connect related notes)
// - Reminders & due dates
// - Search & filter
// - Focus mode integration
// - Export/Import
// - Keyboard shortcuts
//
// ═══════════════════════════════════════════════════════════════════════════════

'use strict';

(function() {
  // Prevent double injection
  if (window.__ZENFLOW_FLOATING_NOTES_V2__) return;
  window.__ZENFLOW_FLOATING_NOTES_V2__ = true;

  // Don't run on extension pages
  if (window.location.protocol === 'chrome-extension:' ||
      window.location.protocol === 'chrome:' ||
      window.location.protocol === 'about:' ||
      window.location.protocol === 'moz-extension:') {
    console.log('[ZENFLOW] Floating Notes: Skipping extension page');
    return;
  }

  console.log('[ZENFLOW] Floating Notes: Initializing on', window.location.hostname);

  // ═══════════════════════════════════════════════════════════════════════════
  // CONSTANTS
  // ═══════════════════════════════════════════════════════════════════════════

  const STORAGE_KEY = 'floatingNotes';
  const SETTINGS_KEY = 'floatingNotesSettings';

  const NOTE_CATEGORIES = {
    idea: { name: 'Idea', icon: 'lightbulb', color: '#F59E0B' },
    task: { name: 'Task', icon: 'target', color: '#EF4444' },
    code: { name: 'Code', icon: 'code', color: '#8B5CF6' },
    link: { name: 'Link', icon: 'link', color: '#3B82F6' },
    quote: { name: 'Quote', icon: 'quote', color: '#22C55E' },
    secret: { name: 'Secret', icon: 'lock', color: '#EC4899' }
  };

  const NOTE_COLORS = {
    cyber: { bg: 'rgba(0, 243, 255, 0.1)', accent: '#00F3FF', glow: 'rgba(0, 243, 255, 0.3)' },
    neon: { bg: 'rgba(255, 0, 255, 0.1)', accent: '#FF00FF', glow: 'rgba(255, 0, 255, 0.3)' },
    plasma: { bg: 'rgba(139, 92, 246, 0.1)', accent: '#8B5CF6', glow: 'rgba(139, 92, 246, 0.3)' },
    ghost: { bg: 'rgba(34, 197, 94, 0.1)', accent: '#22C55E', glow: 'rgba(34, 197, 94, 0.3)' },
    ember: { bg: 'rgba(249, 115, 22, 0.1)', accent: '#F97316', glow: 'rgba(249, 115, 22, 0.3)' },
    blood: { bg: 'rgba(239, 68, 68, 0.1)', accent: '#EF4444', glow: 'rgba(239, 68, 68, 0.3)' }
  };

  const DEFAULT_NOTE = {
    id: null,
    content: '',
    title: '',
    x: 20,
    y: 20,
    width: 300,
    height: 220,
    minimized: false,
    color: 'cyber',
    category: 'idea',
    tags: [],
    scope: 'global', // 'global', 'domain', 'page'
    url: null,
    domain: null,
    pinned: false,
    pinnedElement: null, // CSS selector for pinned element
    linkedNotes: [],
    reminder: null,
    createdAt: null,
    updatedAt: null,
    isEncrypted: false,
    focusModeOnly: false,
    priority: 0 // 0-3
  };

  const DEFAULT_SETTINGS = {
    enabled: true,
    showFAB: true,
    fabPosition: 'bottom-right',
    defaultCategory: 'idea',
    defaultColor: 'cyber',
    defaultScope: 'global',
    quickCaptureEnabled: true,
    showOnFocusMode: true,
    soundEnabled: false,
    compactMode: false
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // STYLES
  // ═══════════════════════════════════════════════════════════════════════════

  const STYLES = `
    :host {
      all: initial;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    /* ═══════════════════════════════════════════════════════════════
       THEME VARIABLES
       ═══════════════════════════════════════════════════════════════ */

    :host {
      --bg-base: #0F0F0F;
      --bg-surface: #1A1A1A;
      --bg-elevated: #252525;
      --border: #2E2E2E;
      --border-light: #3A3A3A;
      --text-primary: #FFFFFF;
      --text-secondary: #A1A1A1;
      --text-muted: #6B6B6B;
      --primary: #3B82F6;
      --accent: #8B5CF6;
      --success: #22C55E;
      --warning: #F59E0B;
      --error: #EF4444;
      --radius-sm: 6px;
      --radius-md: 10px;
      --radius-lg: 14px;
      --shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    }

    /* ═══════════════════════════════════════════════════════════════
       COLOR THEMES
       ═══════════════════════════════════════════════════════════════ */

    .floating-note { --note-accent: #3B82F6; --note-glow: rgba(59, 130, 246, 0.3); }
    .floating-note.cyber { --note-accent: #00F3FF; --note-glow: rgba(0, 243, 255, 0.3); }
    .floating-note.neon { --note-accent: #FF00FF; --note-glow: rgba(255, 0, 255, 0.3); }
    .floating-note.plasma { --note-accent: #8B5CF6; --note-glow: rgba(139, 92, 246, 0.3); }
    .floating-note.ghost { --note-accent: #22C55E; --note-glow: rgba(34, 197, 94, 0.3); }
    .floating-note.ember { --note-accent: #F97316; --note-glow: rgba(249, 115, 22, 0.3); }
    .floating-note.blood { --note-accent: #EF4444; --note-glow: rgba(239, 68, 68, 0.3); }

    /* ═══════════════════════════════════════════════════════════════
       FLOATING NOTE
       ═══════════════════════════════════════════════════════════════ */

    .floating-note {
      position: fixed;
      z-index: 2147483647;
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow), 0 0 30px var(--note-glow);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      will-change: transform;
      transition: box-shadow 0.2s ease, opacity 0.2s ease, transform 0.2s ease;
      opacity: 0.95;
      min-width: 240px;
      min-height: 120px;
    }

    .floating-note:hover {
      opacity: 1;
      box-shadow: var(--shadow), 0 0 40px var(--note-glow);
    }

    .floating-note.dragging {
      opacity: 0.85;
      cursor: grabbing !important;
      transform: scale(1.02);
    }

    .floating-note.minimized {
      height: auto !important;
      min-height: auto !important;
    }

    .floating-note.pinned-mode {
      border-width: 2px;
      border-style: dashed;
    }

    .floating-note.focus-only {
      border-left: 3px solid var(--accent);
    }

    .floating-note.high-priority { border-top: 3px solid var(--error); }
    .floating-note.medium-priority { border-top: 3px solid var(--warning); }

    /* ═══════════════════════════════════════════════════════════════
       HEADER
       ═══════════════════════════════════════════════════════════════ */

    .note-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      background: var(--bg-elevated);
      border-bottom: 1px solid var(--border);
      cursor: grab;
      user-select: none;
    }

    .note-header:active { cursor: grabbing; }

    .note-category-icon {
      width: 28px;
      height: 28px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: 14px;
    }

    .note-category-icon.idea { background: rgba(245, 158, 11, 0.2); color: #F59E0B; }
    .note-category-icon.task { background: rgba(239, 68, 68, 0.2); color: #EF4444; }
    .note-category-icon.code { background: rgba(139, 92, 246, 0.2); color: #8B5CF6; }
    .note-category-icon.link { background: rgba(59, 130, 246, 0.2); color: #3B82F6; }
    .note-category-icon.quote { background: rgba(34, 197, 94, 0.2); color: #22C55E; }
    .note-category-icon.secret { background: rgba(236, 72, 153, 0.2); color: #EC4899; }

    .note-header-content {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .note-title-input {
      background: transparent;
      border: none;
      color: var(--text-primary);
      font-size: 13px;
      font-weight: 600;
      outline: none;
      width: 100%;
    }

    .note-title-input::placeholder {
      color: var(--text-muted);
    }

    .note-scope-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 9px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .note-scope-badge svg {
      width: 10px;
      height: 10px;
    }

    .note-controls {
      display: flex;
      align-items: center;
      gap: 2px;
    }

    .note-btn {
      width: 26px;
      height: 26px;
      background: transparent;
      border: none;
      border-radius: var(--radius-sm);
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }

    .note-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: var(--text-primary);
    }

    .note-btn.active {
      background: var(--note-accent);
      color: var(--bg-base);
    }

    .note-btn.close:hover {
      background: rgba(239, 68, 68, 0.2);
      color: #EF4444;
    }

    .note-btn svg {
      width: 14px;
      height: 14px;
    }

    /* ═══════════════════════════════════════════════════════════════
       TOOLBAR
       ═══════════════════════════════════════════════════════════════ */

    .note-toolbar {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px 10px;
      background: var(--bg-base);
      border-bottom: 1px solid var(--border);
      flex-wrap: wrap;
    }

    .floating-note.minimized .note-toolbar { display: none; }

    .toolbar-group {
      display: flex;
      align-items: center;
      gap: 2px;
    }

    .toolbar-divider {
      width: 1px;
      height: 18px;
      background: var(--border);
      margin: 0 4px;
    }

    .toolbar-btn {
      width: 28px;
      height: 28px;
      background: transparent;
      border: none;
      border-radius: var(--radius-sm);
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
      font-size: 12px;
    }

    .toolbar-btn:hover {
      background: var(--bg-elevated);
      color: var(--text-primary);
    }

    .toolbar-btn.active {
      background: var(--note-accent);
      color: var(--bg-base);
    }

    .toolbar-btn svg {
      width: 14px;
      height: 14px;
    }

    /* Tags Input */
    .tags-container {
      display: flex;
      align-items: center;
      gap: 4px;
      flex: 1;
      min-width: 100px;
      flex-wrap: wrap;
    }

    .tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      background: var(--bg-elevated);
      border-radius: 10px;
      font-size: 10px;
      color: var(--note-accent);
      border: 1px solid var(--border);
    }

    .tag-remove {
      cursor: pointer;
      opacity: 0.6;
    }

    .tag-remove:hover {
      opacity: 1;
    }

    .tag-input {
      background: transparent;
      border: none;
      color: var(--text-primary);
      font-size: 10px;
      outline: none;
      width: 60px;
    }

    .tag-input::placeholder {
      color: var(--text-muted);
    }

    /* ═══════════════════════════════════════════════════════════════
       CONTENT
       ═══════════════════════════════════════════════════════════════ */

    .note-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
      position: relative;
    }

    .floating-note.minimized .note-body { display: none; }

    .note-textarea {
      flex: 1;
      width: 100%;
      padding: 12px;
      background: transparent;
      border: none;
      color: var(--text-primary);
      font-family: inherit;
      font-size: 13px;
      line-height: 1.6;
      resize: none;
      outline: none;
    }

    .note-textarea::placeholder {
      color: var(--text-muted);
    }

    .note-textarea::-webkit-scrollbar { width: 6px; }
    .note-textarea::-webkit-scrollbar-track { background: transparent; }
    .note-textarea::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

    .note-textarea.code-mode {
      font-family: 'Fira Code', 'Monaco', 'Consolas', monospace;
      font-size: 12px;
      tab-size: 2;
    }

    /* Markdown Preview */
    .note-preview {
      flex: 1;
      padding: 12px;
      overflow-y: auto;
      color: var(--text-primary);
      font-size: 13px;
      line-height: 1.6;
    }

    .note-preview h1, .note-preview h2, .note-preview h3 {
      color: var(--note-accent);
      margin: 12px 0 8px 0;
    }

    .note-preview h1 { font-size: 18px; }
    .note-preview h2 { font-size: 16px; }
    .note-preview h3 { font-size: 14px; }

    .note-preview code {
      background: var(--bg-base);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Fira Code', monospace;
      font-size: 12px;
    }

    .note-preview pre {
      background: var(--bg-base);
      padding: 12px;
      border-radius: var(--radius-sm);
      overflow-x: auto;
      margin: 8px 0;
    }

    .note-preview pre code {
      padding: 0;
      background: none;
    }

    .note-preview a {
      color: var(--note-accent);
      text-decoration: none;
    }

    .note-preview a:hover {
      text-decoration: underline;
    }

    .note-preview ul, .note-preview ol {
      padding-left: 20px;
      margin: 8px 0;
    }

    .note-preview blockquote {
      border-left: 3px solid var(--note-accent);
      padding-left: 12px;
      margin: 8px 0;
      color: var(--text-secondary);
      font-style: italic;
    }

    /* ═══════════════════════════════════════════════════════════════
       FOOTER
       ═══════════════════════════════════════════════════════════════ */

    .note-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      border-top: 1px solid var(--border);
      font-size: 10px;
      color: var(--text-muted);
      gap: 8px;
    }

    .floating-note.minimized .note-footer { display: none; }

    .note-meta {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .note-meta-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .note-meta-item svg {
      width: 10px;
      height: 10px;
    }

    .note-reminder {
      display: flex;
      align-items: center;
      gap: 4px;
      color: var(--warning);
      cursor: pointer;
    }

    .note-reminder:hover {
      color: var(--text-primary);
    }

    .note-links-count {
      cursor: pointer;
    }

    .note-links-count:hover {
      color: var(--note-accent);
    }

    /* ═══════════════════════════════════════════════════════════════
       RESIZE HANDLE
       ═══════════════════════════════════════════════════════════════ */

    .resize-handle {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 20px;
      height: 20px;
      cursor: se-resize;
      opacity: 0;
      transition: opacity 0.15s ease;
    }

    .floating-note:hover .resize-handle { opacity: 1; }
    .floating-note.minimized .resize-handle { display: none; }

    .resize-handle::after {
      content: '';
      position: absolute;
      bottom: 4px;
      right: 4px;
      width: 10px;
      height: 10px;
      border-right: 2px solid var(--note-accent);
      border-bottom: 2px solid var(--note-accent);
      opacity: 0.5;
    }

    /* ═══════════════════════════════════════════════════════════════
       DROPDOWNS & MENUS
       ═══════════════════════════════════════════════════════════════ */

    .dropdown-menu {
      position: absolute;
      top: 100%;
      right: 0;
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 6px;
      min-width: 160px;
      opacity: 0;
      visibility: hidden;
      transform: translateY(-8px);
      transition: all 0.15s ease;
      z-index: 100;
      box-shadow: var(--shadow);
    }

    .dropdown-menu.show {
      opacity: 1;
      visibility: visible;
      transform: translateY(4px);
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      border-radius: var(--radius-sm);
      font-size: 12px;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.1s ease;
    }

    .dropdown-item:hover {
      background: var(--bg-elevated);
      color: var(--text-primary);
    }

    .dropdown-item svg {
      width: 14px;
      height: 14px;
    }

    .dropdown-item.danger:hover {
      background: rgba(239, 68, 68, 0.1);
      color: var(--error);
    }

    .dropdown-divider {
      height: 1px;
      background: var(--border);
      margin: 6px 0;
    }

    /* Color Picker */
    .color-picker {
      display: flex;
      gap: 6px;
      padding: 8px;
      flex-wrap: wrap;
      max-width: 150px;
    }

    .color-dot {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      cursor: pointer;
      border: 2px solid transparent;
      transition: all 0.15s ease;
    }

    .color-dot:hover { transform: scale(1.15); }
    .color-dot.active { border-color: var(--text-primary); }

    .color-dot.cyber { background: #00F3FF; }
    .color-dot.neon { background: #FF00FF; }
    .color-dot.plasma { background: #8B5CF6; }
    .color-dot.ghost { background: #22C55E; }
    .color-dot.ember { background: #F97316; }
    .color-dot.blood { background: #EF4444; }

    /* Category Picker */
    .category-picker {
      padding: 6px;
    }

    .category-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all 0.1s ease;
    }

    .category-item:hover {
      background: var(--bg-elevated);
    }

    .category-item.active {
      background: var(--bg-elevated);
    }

    .category-item-icon {
      width: 24px;
      height: 24px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
    }

    .category-item-name {
      font-size: 12px;
      color: var(--text-secondary);
    }

    .category-item.active .category-item-name {
      color: var(--text-primary);
      font-weight: 500;
    }

    /* ═══════════════════════════════════════════════════════════════
       COMMAND CENTER (FAB + MENU)
       ═══════════════════════════════════════════════════════════════ */

    .command-center {
      position: fixed;
      z-index: 2147483646;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
    }

    .command-center.bottom-right { bottom: 24px; right: 24px; }
    .command-center.bottom-left { bottom: 24px; left: 24px; align-items: flex-start; }
    .command-center.top-right { top: 24px; right: 24px; }
    .command-center.top-left { top: 24px; left: 24px; align-items: flex-start; }

    .fab-menu {
      display: flex;
      flex-direction: column;
      gap: 8px;
      opacity: 0;
      visibility: hidden;
      transform: translateY(10px);
      transition: all 0.2s ease;
    }

    .fab-menu.show {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    .fab-menu-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      color: var(--text-secondary);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }

    .fab-menu-item:hover {
      background: var(--bg-elevated);
      border-color: var(--note-accent);
      color: var(--text-primary);
      transform: translateX(-4px);
    }

    .fab-menu-item svg {
      width: 16px;
      height: 16px;
      color: var(--note-accent);
    }

    .fab-main {
      width: 52px;
      height: 52px;
      background: linear-gradient(135deg, #3B82F6, #8B5CF6);
      border: none;
      border-radius: 50%;
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 20px rgba(59, 130, 246, 0.4), 0 0 30px rgba(139, 92, 246, 0.3);
      transition: all 0.2s ease;
    }

    .fab-main:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 28px rgba(59, 130, 246, 0.5), 0 0 40px rgba(139, 92, 246, 0.4);
    }

    .fab-main.active {
      transform: rotate(45deg);
      background: var(--bg-surface);
      color: var(--text-primary);
      border: 1px solid var(--border);
    }

    .fab-main svg {
      width: 24px;
      height: 24px;
      transition: transform 0.2s ease;
    }

    .fab-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      min-width: 18px;
      height: 18px;
      background: var(--error);
      border-radius: 9px;
      font-size: 10px;
      font-weight: 700;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
    }

    .command-center.hidden {
      opacity: 0;
      pointer-events: none;
    }

    /* ═══════════════════════════════════════════════════════════════
       QUICK CAPTURE TOOLTIP
       ═══════════════════════════════════════════════════════════════ */

    .quick-capture {
      position: fixed;
      z-index: 2147483648;
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 8px;
      display: flex;
      gap: 4px;
      box-shadow: var(--shadow);
      opacity: 0;
      visibility: hidden;
      transform: translateY(8px);
      transition: all 0.15s ease;
    }

    .quick-capture.show {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    .quick-capture-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      color: var(--text-secondary);
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .quick-capture-btn:hover {
      background: var(--note-accent);
      border-color: var(--note-accent);
      color: var(--bg-base);
    }

    .quick-capture-btn svg {
      width: 14px;
      height: 14px;
    }

    /* ═══════════════════════════════════════════════════════════════
       SEARCH PANEL
       ═══════════════════════════════════════════════════════════════ */

    .search-panel {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.95);
      z-index: 2147483649;
      width: 500px;
      max-width: 90vw;
      max-height: 80vh;
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow), 0 0 60px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      opacity: 0;
      visibility: hidden;
      transition: all 0.2s ease;
    }

    .search-panel.show {
      opacity: 1;
      visibility: visible;
      transform: translate(-50%, -50%) scale(1);
    }

    .search-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      border-bottom: 1px solid var(--border);
    }

    .search-header svg {
      width: 20px;
      height: 20px;
      color: var(--text-muted);
    }

    .search-input {
      flex: 1;
      background: transparent;
      border: none;
      color: var(--text-primary);
      font-size: 16px;
      outline: none;
    }

    .search-input::placeholder {
      color: var(--text-muted);
    }

    .search-close {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 4px;
    }

    .search-close:hover {
      color: var(--text-primary);
    }

    .search-filters {
      display: flex;
      gap: 8px;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      flex-wrap: wrap;
    }

    .search-filter {
      padding: 6px 12px;
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      border-radius: 20px;
      font-size: 11px;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .search-filter:hover {
      border-color: var(--primary);
      color: var(--primary);
    }

    .search-filter.active {
      background: var(--primary);
      border-color: var(--primary);
      color: white;
    }

    .search-results {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }

    .search-result {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .search-result:hover {
      background: var(--bg-elevated);
    }

    .search-result-icon {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .search-result-content {
      flex: 1;
      min-width: 0;
    }

    .search-result-title {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-primary);
      margin-bottom: 4px;
    }

    .search-result-preview {
      font-size: 12px;
      color: var(--text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .search-result-meta {
      display: flex;
      gap: 8px;
      margin-top: 6px;
      font-size: 10px;
      color: var(--text-muted);
    }

    .search-empty {
      text-align: center;
      padding: 40px 20px;
      color: var(--text-muted);
    }

    .search-empty svg {
      width: 48px;
      height: 48px;
      margin-bottom: 12px;
      opacity: 0.5;
    }

    /* ═══════════════════════════════════════════════════════════════
       LINK NOTES PANEL
       ═══════════════════════════════════════════════════════════════ */

    .link-panel {
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      width: 280px;
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow);
      z-index: 100;
      opacity: 0;
      visibility: hidden;
      transition: all 0.15s ease;
    }

    .link-panel.show {
      opacity: 1;
      visibility: visible;
    }

    .link-panel-header {
      padding: 12px;
      border-bottom: 1px solid var(--border);
      font-size: 12px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .link-panel-list {
      max-height: 200px;
      overflow-y: auto;
      padding: 8px;
    }

    .link-panel-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all 0.1s ease;
    }

    .link-panel-item:hover {
      background: var(--bg-elevated);
    }

    .link-panel-item.linked {
      background: var(--bg-elevated);
    }

    .link-panel-item-checkbox {
      width: 16px;
      height: 16px;
      border: 2px solid var(--border);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .link-panel-item.linked .link-panel-item-checkbox {
      background: var(--note-accent);
      border-color: var(--note-accent);
    }

    .link-panel-item-checkbox svg {
      width: 10px;
      height: 10px;
      color: var(--bg-base);
      opacity: 0;
    }

    .link-panel-item.linked .link-panel-item-checkbox svg {
      opacity: 1;
    }

    .link-panel-item-title {
      flex: 1;
      font-size: 12px;
      color: var(--text-secondary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* ═══════════════════════════════════════════════════════════════
       REMINDER PANEL
       ═══════════════════════════════════════════════════════════════ */

    .reminder-panel {
      padding: 12px;
    }

    .reminder-presets {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 12px;
    }

    .reminder-preset {
      padding: 6px 12px;
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      font-size: 11px;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .reminder-preset:hover {
      border-color: var(--warning);
      color: var(--warning);
    }

    .reminder-custom {
      display: flex;
      gap: 8px;
    }

    .reminder-input {
      flex: 1;
      padding: 8px 12px;
      background: var(--bg-base);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      font-size: 12px;
      outline: none;
    }

    .reminder-input:focus {
      border-color: var(--warning);
    }

    /* ═══════════════════════════════════════════════════════════════
       TOAST NOTIFICATIONS
       ═══════════════════════════════════════════════════════════════ */

    .toast {
      position: fixed;
      bottom: 90px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 12px 20px;
      display: flex;
      align-items: center;
      gap: 10px;
      box-shadow: var(--shadow);
      font-size: 13px;
      color: var(--text-primary);
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s ease;
      z-index: 2147483650;
    }

    .toast.show {
      opacity: 1;
      visibility: visible;
      transform: translateX(-50%) translateY(0);
    }

    .toast.success { border-color: var(--success); }
    .toast.error { border-color: var(--error); }
    .toast.warning { border-color: var(--warning); }

    .toast svg {
      width: 18px;
      height: 18px;
    }

    .toast.success svg { color: var(--success); }
    .toast.error svg { color: var(--error); }
    .toast.warning svg { color: var(--warning); }

    /* ═══════════════════════════════════════════════════════════════
       OVERLAY
       ═══════════════════════════════════════════════════════════════ */

    .overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 2147483648;
      opacity: 0;
      visibility: hidden;
      transition: all 0.2s ease;
    }

    .overlay.show {
      opacity: 1;
      visibility: visible;
    }

    /* ═══════════════════════════════════════════════════════════════
       ANIMATIONS
       ═══════════════════════════════════════════════════════════════ */

    @keyframes noteAppear {
      from { opacity: 0; transform: scale(0.9); }
      to { opacity: 0.95; transform: scale(1); }
    }

    .floating-note.appearing {
      animation: noteAppear 0.2s ease-out;
    }

    @keyframes pulse {
      0%, 100% { box-shadow: 0 4px 20px rgba(59, 130, 246, 0.4), 0 0 30px rgba(139, 92, 246, 0.3); }
      50% { box-shadow: 0 4px 28px rgba(59, 130, 246, 0.6), 0 0 40px rgba(139, 92, 246, 0.5); }
    }

    .fab-main.pulse {
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-4px); }
      75% { transform: translateX(4px); }
    }

    .floating-note.shake {
      animation: shake 0.3s ease;
    }
  `;

  // ═══════════════════════════════════════════════════════════════════════════
  // SVG ICONS
  // ═══════════════════════════════════════════════════════════════════════════

  const ICONS = {
    // Basic
    plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    minimize: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    maximize: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15,3 21,3 21,9"/><polyline points="9,21 3,21 3,15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`,
    more: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>`,
    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20,6 9,17 4,12"/></svg>`,

    // Categories
    lightbulb: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>`,
    target: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
    code: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16,18 22,12 16,6"/><polyline points="8,6 2,12 8,18"/></svg>`,
    link: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
    quote: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3"/></svg>`,
    lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,

    // Actions
    search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    palette: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z"/></svg>`,
    pin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>`,
    clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>`,
    bell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
    trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
    copy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
    download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    upload: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,

    // Scope
    globe: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
    home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>`,
    file: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/></svg>`,

    // Formatting
    bold: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>`,
    italic: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>`,
    list: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
    heading: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 12h12"/><path d="M6 20V4"/><path d="M18 20V4"/></svg>`,
    eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,

    // Misc
    zap: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/></svg>`,
    star: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>`,
    focus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/></svg>`,
    layers: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12,2 2,7 12,12 22,7"/><polyline points="2,17 12,22 22,17"/><polyline points="2,12 12,17 22,12"/></svg>`,
    grid: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
    skynet: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITY FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  function generateId() {
    return `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  function getCurrentDomain() {
    return window.location.hostname;
  }

  function getCurrentUrl() {
    return window.location.href.split('?')[0].split('#')[0];
  }

  function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;

    return date.toLocaleDateString();
  }

  function simpleMarkdown(text) {
    if (!text) return '';

    return text
      // Headers
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      // Bold & Italic
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Code
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      // Links
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>')
      // Lists
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      // Blockquotes
      .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
      // Line breaks
      .replace(/\n/g, '<br>');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN MANAGER CLASS
  // ═══════════════════════════════════════════════════════════════════════════

  class FloatingNotesManager {
    constructor() {
      this.container = null;
      this.shadowRoot = null;
      this.notes = new Map();
      this.allNotes = []; // All notes from storage
      this.settings = { ...DEFAULT_SETTINGS };
      this.notesVisible = true;
      this.fabMenuOpen = false;
      this.searchPanelOpen = false;
      this.saveTimeout = null;
      this.selectedText = '';
      this.quickCaptureElement = null;

      this.init();
    }

    async init() {
      this.createContainer();
      this.injectStyles();
      await this.loadSettings();
      await this.loadNotes();
      this.createCommandCenter();
      this.createSearchPanel();
      this.createToast();
      this.setupQuickCapture();
      this.setupMessageListener();
      this.setupKeyboardShortcuts();
      this.setupStorageListener();
      console.log('[ZENFLOW] Floating Notes v2 initialized - FAB should be visible');
    }

    setupStorageListener() {
      // Listen for settings changes from popup (fallback if message doesn't arrive)
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;

        if (changes[SETTINGS_KEY]) {
          const newSettings = changes[SETTINGS_KEY].newValue;
          console.log('[ZENFLOW] Floating Notes: Settings changed via storage:', newSettings);
          if (newSettings) {
            this.applySettings(newSettings);
          }
        }
      });
    }

    createContainer() {
      this.container = document.createElement('div');
      this.container.id = 'zenflow-floating-notes-v2';
      this.container.setAttribute('data-zenflow', 'true');
      this.shadowRoot = this.container.attachShadow({ mode: 'open' });

      // Ensure we're appending to body or documentElement
      const target = document.body || document.documentElement;
      target.appendChild(this.container);
      console.log('[ZENFLOW] Floating Notes: Container created and attached');
    }

    injectStyles() {
      const style = document.createElement('style');
      style.textContent = STYLES;
      this.shadowRoot.appendChild(style);
    }

    async loadSettings() {
      try {
        console.log('[ZENFLOW] Floating Notes: Loading settings...');
        const result = await chrome.storage.local.get([SETTINGS_KEY]);
        console.log('[ZENFLOW] Floating Notes: Raw storage result:', JSON.stringify(result));

        if (result[SETTINGS_KEY]) {
          // Merge with defaults, ensuring enabled and showFAB default to true
          this.settings = { ...DEFAULT_SETTINGS, ...result[SETTINGS_KEY] };

          // Force enable if settings seem corrupted (both disabled)
          if (this.settings.enabled === false && this.settings.showFAB === false) {
            console.log('[ZENFLOW] Floating Notes: Resetting corrupted settings');
            this.settings = { ...DEFAULT_SETTINGS };
            await chrome.storage.local.set({ [SETTINGS_KEY]: this.settings });
          }
        } else {
          // Initialize settings in storage if they don't exist
          console.log('[ZENFLOW] Floating Notes: No settings found, using defaults');
          this.settings = { ...DEFAULT_SETTINGS };
          await chrome.storage.local.set({ [SETTINGS_KEY]: this.settings });
          console.log('[ZENFLOW] Floating Notes: Initialized default settings');
        }
        console.log('[ZENFLOW] Floating Notes final settings:', JSON.stringify(this.settings));
      } catch (e) {
        console.error('[ZENFLOW] Error loading settings:', e);
        console.error('[ZENFLOW] Using defaults due to error');
        // Use defaults on error
        this.settings = { ...DEFAULT_SETTINGS };
      }
    }

    async loadNotes() {
      try {
        const result = await chrome.storage.local.get([STORAGE_KEY]);
        this.allNotes = result[STORAGE_KEY] || [];
        console.log('[ZENFLOW] Floating Notes: Loaded', this.allNotes.length, 'total notes');

        // Filter notes for current page
        const currentDomain = getCurrentDomain();
        const currentUrl = getCurrentUrl();

        let visibleCount = 0;
        this.allNotes.forEach(noteData => {
          const shouldShow = this.shouldShowNote(noteData, currentDomain, currentUrl);
          if (shouldShow) {
            this.createNoteElement(noteData);
            visibleCount++;
          }
        });
        console.log('[ZENFLOW] Floating Notes: Showing', visibleCount, 'notes on this page');
      } catch (e) {
        console.error('[ZENFLOW] Error loading notes:', e);
      }
    }

    shouldShowNote(noteData, currentDomain, currentUrl) {
      if (noteData.scope === 'global') return true;
      if (noteData.scope === 'domain' && noteData.domain === currentDomain) return true;
      if (noteData.scope === 'page' && noteData.url === currentUrl) return true;
      return false;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // COMMAND CENTER (FAB)
    // ═══════════════════════════════════════════════════════════════════════

    createCommandCenter() {
      const center = document.createElement('div');
      center.className = `command-center ${this.settings.fabPosition}`;
      center.innerHTML = `
        <div class="fab-menu">
          <div class="fab-menu-item" data-action="new-global">
            ${ICONS.globe}
            <span>Global Note</span>
          </div>
          <div class="fab-menu-item" data-action="new-domain">
            ${ICONS.home}
            <span>Domain Note</span>
          </div>
          <div class="fab-menu-item" data-action="new-page">
            ${ICONS.file}
            <span>Page Note</span>
          </div>
          <div class="fab-menu-item" data-action="search">
            ${ICONS.search}
            <span>Search Notes</span>
          </div>
          <div class="fab-menu-item" data-action="export">
            ${ICONS.download}
            <span>Export All</span>
          </div>
        </div>
        <button class="fab-main pulse">
          ${ICONS.plus}
          <span class="fab-badge" style="display:none">0</span>
        </button>
      `;

      this.commandCenter = center;
      this.fab = center.querySelector('.fab-main');
      this.fabMenu = center.querySelector('.fab-menu');
      this.fabBadge = center.querySelector('.fab-badge');

      // Update badge count
      this.updateNoteBadge();

      // FAB click
      this.fab.addEventListener('click', () => {
        this.fabMenuOpen = !this.fabMenuOpen;
        this.fabMenu.classList.toggle('show', this.fabMenuOpen);
        this.fab.classList.toggle('active', this.fabMenuOpen);
        this.fab.classList.remove('pulse');
      });

      // Menu item clicks
      center.querySelectorAll('.fab-menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
          const action = item.dataset.action;
          this.handleFabAction(action);
          this.fabMenuOpen = false;
          this.fabMenu.classList.remove('show');
          this.fab.classList.remove('active');
        });
      });

      // Close menu on outside click
      document.addEventListener('click', (e) => {
        if (this.fabMenuOpen && !this.shadowRoot.contains(e.target)) {
          this.fabMenuOpen = false;
          this.fabMenu.classList.remove('show');
          this.fab.classList.remove('active');
        }
      });

      // Apply initial visibility based on settings (default to showing)
      // Only hide if EXPLICITLY set to false
      const isDisabled = this.settings.enabled === false;
      const isFabHidden = this.settings.showFAB === false;
      const shouldShow = !isDisabled && !isFabHidden;

      center.style.display = shouldShow ? 'flex' : 'none';
      console.log('[ZENFLOW] Floating Notes FAB visibility check:');
      console.log('[ZENFLOW]   enabled:', this.settings.enabled, '(isDisabled:', isDisabled, ')');
      console.log('[ZENFLOW]   showFAB:', this.settings.showFAB, '(isFabHidden:', isFabHidden, ')');
      console.log('[ZENFLOW]   shouldShow:', shouldShow);
      console.log('[ZENFLOW]   FAB position:', this.settings.fabPosition);
      console.log('[ZENFLOW]   center.style.display:', center.style.display);

      this.shadowRoot.appendChild(center);
      console.log('[ZENFLOW] Floating Notes: FAB appended to shadow DOM');
    }

    handleFabAction(action) {
      switch (action) {
        case 'new-global':
          this.addNewNote('global');
          break;
        case 'new-domain':
          this.addNewNote('domain');
          break;
        case 'new-page':
          this.addNewNote('page');
          break;
        case 'search':
          this.openSearchPanel();
          break;
        case 'export':
          this.exportNotes();
          break;
      }
    }

    updateNoteBadge() {
      const count = this.notes.size;
      if (count > 0) {
        this.fabBadge.textContent = count;
        this.fabBadge.style.display = 'flex';
      } else {
        this.fabBadge.style.display = 'none';
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // NOTE CREATION
    // ═══════════════════════════════════════════════════════════════════════

    addNewNote(scope = 'global', initialContent = '') {
      const id = generateId();
      const existingCount = this.notes.size;
      const offset = (existingCount % 5) * 35;

      const noteData = {
        ...DEFAULT_NOTE,
        id,
        content: initialContent,
        x: 20 + offset,
        y: 80 + offset,
        scope,
        domain: scope === 'domain' || scope === 'page' ? getCurrentDomain() : null,
        url: scope === 'page' ? getCurrentUrl() : null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        color: this.settings.defaultColor,
        category: this.settings.defaultCategory
      };

      this.allNotes.push(noteData);
      this.createNoteElement(noteData);
      this.saveNotes();
      this.updateNoteBadge();

      this.showToast('Note created', 'success');
      return noteData;
    }

    createNoteElement(noteData) {
      const note = document.createElement('div');
      note.className = `floating-note ${noteData.color} appearing`;
      note.id = noteData.id;
      note.style.transform = `translate(${noteData.x}px, ${noteData.y}px)`;
      note.style.width = `${noteData.width}px`;
      note.style.height = noteData.minimized ? 'auto' : `${noteData.height}px`;

      if (noteData.minimized) note.classList.add('minimized');
      if (noteData.focusModeOnly) note.classList.add('focus-only');
      if (noteData.priority === 3) note.classList.add('high-priority');
      if (noteData.priority === 2) note.classList.add('medium-priority');

      const category = NOTE_CATEGORIES[noteData.category] || NOTE_CATEGORIES.idea;
      const scopeIcon = noteData.scope === 'global' ? ICONS.globe :
                       noteData.scope === 'domain' ? ICONS.home : ICONS.file;
      const scopeLabel = noteData.scope === 'global' ? 'Global' :
                        noteData.scope === 'domain' ? noteData.domain : 'This Page';

      note.innerHTML = `
        <div class="note-header">
          <div class="note-category-icon ${noteData.category}">
            ${ICONS[category.icon]}
          </div>
          <div class="note-header-content">
            <input type="text" class="note-title-input" placeholder="Untitled note..." value="${noteData.title || ''}">
            <div class="note-scope-badge">
              ${scopeIcon}
              <span>${scopeLabel}</span>
            </div>
          </div>
          <div class="note-controls">
            <button class="note-btn preview-btn" title="Preview Markdown">
              ${ICONS.eye}
            </button>
            <button class="note-btn minimize-btn" title="Minimize">
              ${noteData.minimized ? ICONS.maximize : ICONS.minimize}
            </button>
            <button class="note-btn more-btn" title="More Options">
              ${ICONS.more}
            </button>
            <button class="note-btn close" title="Close">
              ${ICONS.close}
            </button>
          </div>

          <!-- Dropdown Menu -->
          <div class="dropdown-menu more-menu">
            <div class="dropdown-item" data-action="category">
              ${ICONS.layers} Change Category
            </div>
            <div class="dropdown-item" data-action="color">
              ${ICONS.palette} Change Color
            </div>
            <div class="dropdown-item" data-action="scope">
              ${ICONS.globe} Change Scope
            </div>
            <div class="dropdown-item" data-action="link">
              ${ICONS.link} Link Notes
            </div>
            <div class="dropdown-item" data-action="reminder">
              ${ICONS.bell} Set Reminder
            </div>
            <div class="dropdown-item" data-action="priority">
              ${ICONS.star} Set Priority
            </div>
            <div class="dropdown-item" data-action="focus">
              ${ICONS.focus} Focus Mode Only
            </div>
            <div class="dropdown-divider"></div>
            <div class="dropdown-item" data-action="duplicate">
              ${ICONS.copy} Duplicate
            </div>
            <div class="dropdown-item" data-action="copy">
              ${ICONS.copy} Copy Content
            </div>
            <div class="dropdown-divider"></div>
            <div class="dropdown-item danger" data-action="delete">
              ${ICONS.trash} Delete Note
            </div>
          </div>

          <!-- Sub-menus -->
          <div class="dropdown-menu color-menu">
            <div class="color-picker">
              ${Object.keys(NOTE_COLORS).map(c => `
                <div class="color-dot ${c} ${noteData.color === c ? 'active' : ''}" data-color="${c}"></div>
              `).join('')}
            </div>
          </div>

          <div class="dropdown-menu category-menu">
            <div class="category-picker">
              ${Object.entries(NOTE_CATEGORIES).map(([key, cat]) => `
                <div class="category-item ${noteData.category === key ? 'active' : ''}" data-category="${key}">
                  <div class="category-item-icon ${key}">${ICONS[cat.icon]}</div>
                  <span class="category-item-name">${cat.name}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="dropdown-menu scope-menu">
            <div class="dropdown-item ${noteData.scope === 'global' ? 'active' : ''}" data-scope="global">
              ${ICONS.globe} Global (All Pages)
            </div>
            <div class="dropdown-item ${noteData.scope === 'domain' ? 'active' : ''}" data-scope="domain">
              ${ICONS.home} This Domain
            </div>
            <div class="dropdown-item ${noteData.scope === 'page' ? 'active' : ''}" data-scope="page">
              ${ICONS.file} This Page Only
            </div>
          </div>

          <div class="dropdown-menu reminder-menu">
            <div class="reminder-panel">
              <div class="reminder-presets">
                <div class="reminder-preset" data-minutes="15">15 min</div>
                <div class="reminder-preset" data-minutes="30">30 min</div>
                <div class="reminder-preset" data-minutes="60">1 hour</div>
                <div class="reminder-preset" data-minutes="1440">Tomorrow</div>
              </div>
              <div class="reminder-custom">
                <input type="datetime-local" class="reminder-input">
              </div>
            </div>
          </div>

          <div class="dropdown-menu priority-menu">
            <div class="dropdown-item" data-priority="3">
              ${ICONS.star} High Priority
            </div>
            <div class="dropdown-item" data-priority="2">
              ${ICONS.star} Medium Priority
            </div>
            <div class="dropdown-item" data-priority="1">
              ${ICONS.star} Low Priority
            </div>
            <div class="dropdown-item" data-priority="0">
              ${ICONS.star} No Priority
            </div>
          </div>
        </div>

        <div class="note-toolbar">
          <div class="toolbar-group">
            <button class="toolbar-btn" data-format="bold" title="Bold">
              ${ICONS.bold}
            </button>
            <button class="toolbar-btn" data-format="italic" title="Italic">
              ${ICONS.italic}
            </button>
            <button class="toolbar-btn" data-format="heading" title="Heading">
              ${ICONS.heading}
            </button>
            <button class="toolbar-btn" data-format="list" title="List">
              ${ICONS.list}
            </button>
            <button class="toolbar-btn" data-format="code" title="Code">
              ${ICONS.code}
            </button>
            <button class="toolbar-btn" data-format="link" title="Link">
              ${ICONS.link}
            </button>
          </div>
          <div class="toolbar-divider"></div>
          <div class="tags-container">
            ${(noteData.tags || []).map(tag => `
              <span class="tag">${tag}<span class="tag-remove" data-tag="${tag}">×</span></span>
            `).join('')}
            <input type="text" class="tag-input" placeholder="+ tag">
          </div>
        </div>

        <div class="note-body">
          <textarea class="note-textarea ${noteData.category === 'code' ? 'code-mode' : ''}" placeholder="Start typing... (Markdown supported)">${noteData.content || ''}</textarea>
          <div class="note-preview" style="display:none"></div>
        </div>

        <div class="note-footer">
          <div class="note-meta">
            <span class="note-meta-item" title="Characters">
              ${ICONS.edit}
              <span class="char-count">${(noteData.content || '').length}</span>
            </span>
            ${noteData.reminder ? `
              <span class="note-reminder" title="Reminder set">
                ${ICONS.bell}
                <span>${formatDate(noteData.reminder)}</span>
              </span>
            ` : ''}
            ${noteData.linkedNotes?.length ? `
              <span class="note-links-count" title="Linked notes">
                ${ICONS.link}
                <span>${noteData.linkedNotes.length}</span>
              </span>
            ` : ''}
          </div>
          <span class="note-meta-item" title="Last updated">
            ${ICONS.clock}
            <span class="updated-time">${formatDate(noteData.updatedAt)}</span>
          </span>
        </div>

        <div class="resize-handle"></div>
      `;

      this.notes.set(noteData.id, { element: note, data: noteData });
      this.setupNoteEvents(note, noteData.id);
      this.shadowRoot.appendChild(note);

      setTimeout(() => note.classList.remove('appearing'), 200);
      return note;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // NOTE EVENT HANDLERS
    // ═══════════════════════════════════════════════════════════════════════

    setupNoteEvents(note, noteId) {
      const header = note.querySelector('.note-header');
      const titleInput = note.querySelector('.note-title-input');
      const textarea = note.querySelector('.note-textarea');
      const preview = note.querySelector('.note-preview');
      const minimizeBtn = note.querySelector('.minimize-btn');
      const closeBtn = note.querySelector('.close');
      const moreBtn = note.querySelector('.more-btn');
      const previewBtn = note.querySelector('.preview-btn');
      const tagInput = note.querySelector('.tag-input');
      const resizeHandle = note.querySelector('.resize-handle');

      // Dragging
      this.setupDragging(note, header, noteId);

      // Resizing
      this.setupResizing(note, resizeHandle, noteId);

      // Title
      titleInput.addEventListener('input', (e) => {
        const noteObj = this.notes.get(noteId);
        if (noteObj) {
          noteObj.data.title = e.target.value;
          noteObj.data.updatedAt = Date.now();
          this.debouncedSave();
        }
      });

      titleInput.addEventListener('mousedown', e => e.stopPropagation());

      // Textarea
      textarea.addEventListener('input', (e) => {
        const noteObj = this.notes.get(noteId);
        if (noteObj) {
          noteObj.data.content = e.target.value;
          noteObj.data.updatedAt = Date.now();
          note.querySelector('.char-count').textContent = e.target.value.length;
          note.querySelector('.updated-time').textContent = formatDate(Date.now());
          this.debouncedSave();
        }
      });

      // Preview toggle
      let previewMode = false;
      previewBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        previewMode = !previewMode;
        previewBtn.classList.toggle('active', previewMode);

        if (previewMode) {
          preview.innerHTML = simpleMarkdown(textarea.value);
          preview.style.display = 'block';
          textarea.style.display = 'none';
        } else {
          preview.style.display = 'none';
          textarea.style.display = 'block';
        }
      });

      // Minimize
      minimizeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleMinimize(noteId);
      });

      // Close
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeNote(noteId);
      });

      // More menu
      const moreMenu = note.querySelector('.more-menu');
      moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeAllMenus(note);
        moreMenu.classList.toggle('show');
      });

      // Menu actions
      this.setupMenuActions(note, noteId);

      // Formatting toolbar
      note.querySelectorAll('.toolbar-btn[data-format]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.applyFormatting(textarea, btn.dataset.format);
        });
      });

      // Tags
      tagInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.value.trim()) {
          e.preventDefault();
          this.addTag(noteId, e.target.value.trim());
          e.target.value = '';
        }
      });

      note.querySelectorAll('.tag-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.removeTag(noteId, btn.dataset.tag);
        });
      });

      // Bring to front
      note.addEventListener('mousedown', () => this.bringToFront(note));

      // Close menus on outside click
      note.addEventListener('click', (e) => {
        if (!e.target.closest('.note-btn') && !e.target.closest('.dropdown-menu')) {
          this.closeAllMenus(note);
        }
      });
    }

    setupMenuActions(note, noteId) {
      const noteObj = this.notes.get(noteId);

      // More menu actions
      note.querySelectorAll('.more-menu .dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const action = item.dataset.action;

          this.closeAllMenus(note);

          switch (action) {
            case 'category':
              note.querySelector('.category-menu').classList.add('show');
              break;
            case 'color':
              note.querySelector('.color-menu').classList.add('show');
              break;
            case 'scope':
              note.querySelector('.scope-menu').classList.add('show');
              break;
            case 'reminder':
              note.querySelector('.reminder-menu').classList.add('show');
              break;
            case 'priority':
              note.querySelector('.priority-menu').classList.add('show');
              break;
            case 'link':
              this.openLinkPanel(noteId);
              break;
            case 'focus':
              this.toggleFocusMode(noteId);
              break;
            case 'duplicate':
              this.duplicateNote(noteId);
              break;
            case 'copy':
              this.copyNoteContent(noteId);
              break;
            case 'delete':
              this.deleteNote(noteId);
              break;
          }
        });
      });

      // Color picker
      note.querySelectorAll('.color-dot').forEach(dot => {
        dot.addEventListener('click', (e) => {
          e.stopPropagation();
          this.changeNoteColor(noteId, dot.dataset.color);
          this.closeAllMenus(note);
        });
      });

      // Category picker
      note.querySelectorAll('.category-item').forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          this.changeNoteCategory(noteId, item.dataset.category);
          this.closeAllMenus(note);
        });
      });

      // Scope picker
      note.querySelectorAll('.scope-menu .dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          this.changeNoteScope(noteId, item.dataset.scope);
          this.closeAllMenus(note);
        });
      });

      // Reminder presets
      note.querySelectorAll('.reminder-preset').forEach(preset => {
        preset.addEventListener('click', (e) => {
          e.stopPropagation();
          const minutes = parseInt(preset.dataset.minutes);
          this.setReminder(noteId, Date.now() + minutes * 60000);
          this.closeAllMenus(note);
        });
      });

      // Custom reminder
      const reminderInput = note.querySelector('.reminder-input');
      reminderInput?.addEventListener('change', (e) => {
        const date = new Date(e.target.value);
        if (date > new Date()) {
          this.setReminder(noteId, date.getTime());
          this.closeAllMenus(note);
        }
      });

      // Priority
      note.querySelectorAll('.priority-menu .dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          this.setPriority(noteId, parseInt(item.dataset.priority));
          this.closeAllMenus(note);
        });
      });
    }

    closeAllMenus(note) {
      note.querySelectorAll('.dropdown-menu').forEach(menu => {
        menu.classList.remove('show');
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // NOTE ACTIONS
    // ═══════════════════════════════════════════════════════════════════════

    setupDragging(note, handle, noteId) {
      let isDragging = false;
      let startX, startY, noteX, noteY;

      const onMouseDown = (e) => {
        if (e.target.closest('input') || e.target.closest('.note-btn') || e.target.closest('.dropdown-menu')) return;

        isDragging = true;
        note.classList.add('dragging');

        const noteObj = this.notes.get(noteId);
        noteX = noteObj.data.x;
        noteY = noteObj.data.y;
        startX = e.clientX;
        startY = e.clientY;

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      };

      const onMouseMove = (e) => {
        if (!isDragging) return;

        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;

        const newX = Math.max(0, Math.min(window.innerWidth - 100, noteX + deltaX));
        const newY = Math.max(0, Math.min(window.innerHeight - 50, noteY + deltaY));

        note.style.transform = `translate(${newX}px, ${newY}px)`;

        const noteObj = this.notes.get(noteId);
        if (noteObj) {
          noteObj.data.x = newX;
          noteObj.data.y = newY;
        }
      };

      const onMouseUp = () => {
        if (isDragging) {
          isDragging = false;
          note.classList.remove('dragging');
          this.debouncedSave();
        }
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      handle.addEventListener('mousedown', onMouseDown);
    }

    setupResizing(note, handle, noteId) {
      let isResizing = false;
      let startX, startY, startWidth, startHeight;

      const onMouseDown = (e) => {
        e.preventDefault();
        e.stopPropagation();

        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startWidth = note.offsetWidth;
        startHeight = note.offsetHeight;

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      };

      const onMouseMove = (e) => {
        if (!isResizing) return;

        const newWidth = Math.max(240, startWidth + (e.clientX - startX));
        const newHeight = Math.max(150, startHeight + (e.clientY - startY));

        note.style.width = `${newWidth}px`;
        note.style.height = `${newHeight}px`;

        const noteObj = this.notes.get(noteId);
        if (noteObj) {
          noteObj.data.width = newWidth;
          noteObj.data.height = newHeight;
        }
      };

      const onMouseUp = () => {
        if (isResizing) {
          isResizing = false;
          this.debouncedSave();
        }
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      handle.addEventListener('mousedown', onMouseDown);
    }

    toggleMinimize(noteId) {
      const noteObj = this.notes.get(noteId);
      if (!noteObj) return;

      noteObj.data.minimized = !noteObj.data.minimized;
      const note = noteObj.element;
      const minimizeBtn = note.querySelector('.minimize-btn');

      if (noteObj.data.minimized) {
        note.classList.add('minimized');
        note.style.height = 'auto';
        minimizeBtn.innerHTML = ICONS.maximize;
      } else {
        note.classList.remove('minimized');
        note.style.height = `${noteObj.data.height}px`;
        minimizeBtn.innerHTML = ICONS.minimize;
      }

      this.saveNotes();
    }

    closeNote(noteId) {
      const noteObj = this.notes.get(noteId);
      if (!noteObj) return;

      noteObj.element.style.opacity = '0';
      noteObj.element.style.transform += ' scale(0.9)';

      setTimeout(() => {
        noteObj.element.remove();
        this.notes.delete(noteId);
        this.updateNoteBadge();
      }, 200);
    }

    deleteNote(noteId) {
      const noteObj = this.notes.get(noteId);
      if (!noteObj) return;

      // Remove from allNotes
      this.allNotes = this.allNotes.filter(n => n.id !== noteId);

      // Close and remove
      this.closeNote(noteId);
      this.saveNotes();
      this.showToast('Note deleted', 'success');
    }

    duplicateNote(noteId) {
      const noteObj = this.notes.get(noteId);
      if (!noteObj) return;

      const newNote = this.addNewNote(noteObj.data.scope, noteObj.data.content);
      newNote.title = `${noteObj.data.title || 'Untitled'} (copy)`;
      newNote.category = noteObj.data.category;
      newNote.color = noteObj.data.color;
      newNote.tags = [...noteObj.data.tags];

      this.saveNotes();
      this.showToast('Note duplicated', 'success');
    }

    copyNoteContent(noteId) {
      const noteObj = this.notes.get(noteId);
      if (!noteObj) return;

      navigator.clipboard.writeText(noteObj.data.content).then(() => {
        this.showToast('Content copied', 'success');
      });
    }

    changeNoteColor(noteId, color) {
      const noteObj = this.notes.get(noteId);
      if (!noteObj) return;

      Object.keys(NOTE_COLORS).forEach(c => noteObj.element.classList.remove(c));
      noteObj.element.classList.add(color);
      noteObj.data.color = color;

      // Update color picker
      noteObj.element.querySelectorAll('.color-dot').forEach(dot => {
        dot.classList.toggle('active', dot.dataset.color === color);
      });

      this.saveNotes();
    }

    changeNoteCategory(noteId, category) {
      const noteObj = this.notes.get(noteId);
      if (!noteObj) return;

      noteObj.data.category = category;
      const cat = NOTE_CATEGORIES[category];

      const iconEl = noteObj.element.querySelector('.note-category-icon');
      iconEl.className = `note-category-icon ${category}`;
      iconEl.innerHTML = ICONS[cat.icon];

      // Update textarea code mode
      const textarea = noteObj.element.querySelector('.note-textarea');
      textarea.classList.toggle('code-mode', category === 'code');

      this.saveNotes();
    }

    changeNoteScope(noteId, scope) {
      const noteObj = this.notes.get(noteId);
      if (!noteObj) return;

      noteObj.data.scope = scope;
      noteObj.data.domain = scope !== 'global' ? getCurrentDomain() : null;
      noteObj.data.url = scope === 'page' ? getCurrentUrl() : null;

      // Update badge
      const scopeIcon = scope === 'global' ? ICONS.globe :
                       scope === 'domain' ? ICONS.home : ICONS.file;
      const scopeLabel = scope === 'global' ? 'Global' :
                        scope === 'domain' ? noteObj.data.domain : 'This Page';

      const badge = noteObj.element.querySelector('.note-scope-badge');
      badge.innerHTML = `${scopeIcon}<span>${scopeLabel}</span>`;

      this.saveNotes();
      this.showToast(`Scope changed to ${scope}`, 'success');
    }

    setReminder(noteId, timestamp) {
      const noteObj = this.notes.get(noteId);
      if (!noteObj) return;

      noteObj.data.reminder = timestamp;

      // Update footer
      const footer = noteObj.element.querySelector('.note-meta');
      const existingReminder = footer.querySelector('.note-reminder');

      if (existingReminder) {
        existingReminder.querySelector('span').textContent = formatDate(timestamp);
      } else {
        const reminderEl = document.createElement('span');
        reminderEl.className = 'note-reminder';
        reminderEl.innerHTML = `${ICONS.bell}<span>${formatDate(timestamp)}</span>`;
        footer.appendChild(reminderEl);
      }

      this.saveNotes();
      this.showToast('Reminder set', 'success');

      // Send to background for notification
      chrome.runtime.sendMessage({
        action: 'setNoteReminder',
        noteId,
        reminder: timestamp,
        title: noteObj.data.title || 'Note Reminder'
      });
    }

    setPriority(noteId, priority) {
      const noteObj = this.notes.get(noteId);
      if (!noteObj) return;

      noteObj.data.priority = priority;
      noteObj.element.classList.remove('high-priority', 'medium-priority');

      if (priority === 3) noteObj.element.classList.add('high-priority');
      if (priority === 2) noteObj.element.classList.add('medium-priority');

      this.saveNotes();
    }

    toggleFocusMode(noteId) {
      const noteObj = this.notes.get(noteId);
      if (!noteObj) return;

      noteObj.data.focusModeOnly = !noteObj.data.focusModeOnly;
      noteObj.element.classList.toggle('focus-only', noteObj.data.focusModeOnly);

      this.saveNotes();
      this.showToast(noteObj.data.focusModeOnly ? 'Will show in Focus Mode only' : 'Will show always', 'success');
    }

    addTag(noteId, tag) {
      const noteObj = this.notes.get(noteId);
      if (!noteObj) return;

      if (!noteObj.data.tags.includes(tag)) {
        noteObj.data.tags.push(tag);

        // Add tag element
        const tagsContainer = noteObj.element.querySelector('.tags-container');
        const tagInput = tagsContainer.querySelector('.tag-input');
        const tagEl = document.createElement('span');
        tagEl.className = 'tag';
        tagEl.innerHTML = `${tag}<span class="tag-remove" data-tag="${tag}">×</span>`;
        tagEl.querySelector('.tag-remove').addEventListener('click', () => this.removeTag(noteId, tag));
        tagsContainer.insertBefore(tagEl, tagInput);

        this.saveNotes();
      }
    }

    removeTag(noteId, tag) {
      const noteObj = this.notes.get(noteId);
      if (!noteObj) return;

      noteObj.data.tags = noteObj.data.tags.filter(t => t !== tag);

      // Remove tag element
      noteObj.element.querySelectorAll('.tag').forEach(el => {
        if (el.textContent.replace('×', '') === tag) el.remove();
      });

      this.saveNotes();
    }

    applyFormatting(textarea, format) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const selected = text.substring(start, end);

      let replacement;
      let cursorOffset = 0;

      switch (format) {
        case 'bold':
          replacement = `**${selected || 'bold text'}**`;
          cursorOffset = selected ? 0 : -2;
          break;
        case 'italic':
          replacement = `*${selected || 'italic text'}*`;
          cursorOffset = selected ? 0 : -1;
          break;
        case 'heading':
          replacement = `## ${selected || 'Heading'}`;
          break;
        case 'list':
          replacement = `- ${selected || 'List item'}`;
          break;
        case 'code':
          replacement = selected.includes('\n')
            ? `\`\`\`\n${selected || 'code'}\n\`\`\``
            : `\`${selected || 'code'}\``;
          break;
        case 'link':
          replacement = `[${selected || 'link text'}](url)`;
          break;
        default:
          return;
      }

      textarea.value = text.substring(0, start) + replacement + text.substring(end);
      textarea.focus();
      textarea.dispatchEvent(new Event('input'));
    }

    bringToFront(note) {
      this.notes.forEach(n => n.element.style.zIndex = '2147483647');
      note.style.zIndex = '2147483648';
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SEARCH PANEL
    // ═══════════════════════════════════════════════════════════════════════

    createSearchPanel() {
      const overlay = document.createElement('div');
      overlay.className = 'overlay';
      this.overlay = overlay;

      const panel = document.createElement('div');
      panel.className = 'search-panel';
      panel.innerHTML = `
        <div class="search-header">
          ${ICONS.search}
          <input type="text" class="search-input" placeholder="Search notes...">
          <button class="search-close">${ICONS.close}</button>
        </div>
        <div class="search-filters">
          <button class="search-filter active" data-filter="all">All</button>
          ${Object.entries(NOTE_CATEGORIES).map(([key, cat]) => `
            <button class="search-filter" data-filter="${key}">${cat.name}</button>
          `).join('')}
        </div>
        <div class="search-results">
          <div class="search-empty">
            ${ICONS.search}
            <p>Start typing to search</p>
          </div>
        </div>
      `;

      this.searchPanel = panel;

      const searchInput = panel.querySelector('.search-input');
      const searchResults = panel.querySelector('.search-results');
      const closeBtn = panel.querySelector('.search-close');

      let currentFilter = 'all';

      searchInput.addEventListener('input', () => {
        this.performSearch(searchInput.value, currentFilter, searchResults);
      });

      panel.querySelectorAll('.search-filter').forEach(btn => {
        btn.addEventListener('click', () => {
          panel.querySelectorAll('.search-filter').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          currentFilter = btn.dataset.filter;
          this.performSearch(searchInput.value, currentFilter, searchResults);
        });
      });

      closeBtn.addEventListener('click', () => this.closeSearchPanel());
      overlay.addEventListener('click', () => this.closeSearchPanel());

      this.shadowRoot.appendChild(overlay);
      this.shadowRoot.appendChild(panel);
    }

    openSearchPanel() {
      this.searchPanelOpen = true;
      this.overlay.classList.add('show');
      this.searchPanel.classList.add('show');
      this.searchPanel.querySelector('.search-input').focus();
    }

    closeSearchPanel() {
      this.searchPanelOpen = false;
      this.overlay.classList.remove('show');
      this.searchPanel.classList.remove('show');
    }

    performSearch(query, filter, resultsContainer) {
      const results = this.allNotes.filter(note => {
        const matchesQuery = !query ||
          note.content?.toLowerCase().includes(query.toLowerCase()) ||
          note.title?.toLowerCase().includes(query.toLowerCase()) ||
          note.tags?.some(t => t.toLowerCase().includes(query.toLowerCase()));

        const matchesFilter = filter === 'all' || note.category === filter;

        return matchesQuery && matchesFilter;
      });

      if (results.length === 0) {
        resultsContainer.innerHTML = `
          <div class="search-empty">
            ${ICONS.search}
            <p>No notes found</p>
          </div>
        `;
        return;
      }

      resultsContainer.innerHTML = results.map(note => {
        const cat = NOTE_CATEGORIES[note.category] || NOTE_CATEGORIES.idea;
        return `
          <div class="search-result" data-id="${note.id}">
            <div class="search-result-icon ${note.category}">
              ${ICONS[cat.icon]}
            </div>
            <div class="search-result-content">
              <div class="search-result-title">${note.title || 'Untitled'}</div>
              <div class="search-result-preview">${(note.content || '').substring(0, 100)}...</div>
              <div class="search-result-meta">
                <span>${note.scope}</span>
                <span>${formatDate(note.updatedAt)}</span>
                ${note.tags?.length ? `<span>${note.tags.join(', ')}</span>` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('');

      // Click to focus note
      resultsContainer.querySelectorAll('.search-result').forEach(result => {
        result.addEventListener('click', () => {
          const noteId = result.dataset.id;
          const noteObj = this.notes.get(noteId);

          if (noteObj) {
            this.bringToFront(noteObj.element);
            noteObj.element.classList.add('shake');
            setTimeout(() => noteObj.element.classList.remove('shake'), 300);
          } else {
            // Note not on this page, show it
            const noteData = this.allNotes.find(n => n.id === noteId);
            if (noteData) {
              this.createNoteElement(noteData);
              this.updateNoteBadge();
            }
          }

          this.closeSearchPanel();
        });
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LINK NOTES
    // ═══════════════════════════════════════════════════════════════════════

    openLinkPanel(noteId) {
      const noteObj = this.notes.get(noteId);
      if (!noteObj) return;

      // Create link panel if it doesn't exist
      let linkPanel = noteObj.element.querySelector('.link-panel');
      if (!linkPanel) {
        linkPanel = document.createElement('div');
        linkPanel.className = 'link-panel';
        noteObj.element.appendChild(linkPanel);
      }

      const otherNotes = this.allNotes.filter(n => n.id !== noteId);
      const linkedIds = noteObj.data.linkedNotes || [];

      linkPanel.innerHTML = `
        <div class="link-panel-header">Link to other notes</div>
        <div class="link-panel-list">
          ${otherNotes.map(note => `
            <div class="link-panel-item ${linkedIds.includes(note.id) ? 'linked' : ''}" data-link-id="${note.id}">
              <div class="link-panel-item-checkbox">
                ${ICONS.check}
              </div>
              <span class="link-panel-item-title">${note.title || 'Untitled'}</span>
            </div>
          `).join('')}
        </div>
      `;

      linkPanel.classList.add('show');

      // Toggle links
      linkPanel.querySelectorAll('.link-panel-item').forEach(item => {
        item.addEventListener('click', () => {
          const linkId = item.dataset.linkId;
          item.classList.toggle('linked');

          if (item.classList.contains('linked')) {
            if (!noteObj.data.linkedNotes.includes(linkId)) {
              noteObj.data.linkedNotes.push(linkId);
            }
          } else {
            noteObj.data.linkedNotes = noteObj.data.linkedNotes.filter(id => id !== linkId);
          }

          this.saveNotes();
        });
      });

      // Close on outside click
      setTimeout(() => {
        const closeHandler = (e) => {
          if (!linkPanel.contains(e.target)) {
            linkPanel.classList.remove('show');
            document.removeEventListener('click', closeHandler);
          }
        };
        document.addEventListener('click', closeHandler);
      }, 100);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // QUICK CAPTURE
    // ═══════════════════════════════════════════════════════════════════════

    setupQuickCapture() {
      if (!this.settings.quickCaptureEnabled) return;

      const capture = document.createElement('div');
      capture.className = 'quick-capture';
      capture.innerHTML = `
        <button class="quick-capture-btn" data-action="idea">
          ${ICONS.lightbulb} Idea
        </button>
        <button class="quick-capture-btn" data-action="quote">
          ${ICONS.quote} Quote
        </button>
        <button class="quick-capture-btn" data-action="task">
          ${ICONS.target} Task
        </button>
      `;

      this.quickCaptureElement = capture;
      this.shadowRoot.appendChild(capture);

      // Handle selection
      document.addEventListener('mouseup', (e) => {
        setTimeout(() => {
          const selection = window.getSelection();
          const text = selection.toString().trim();

          if (text && text.length > 3 && !this.shadowRoot.contains(e.target)) {
            this.selectedText = text;

            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            capture.style.left = `${rect.left + rect.width / 2}px`;
            capture.style.top = `${rect.bottom + 10}px`;
            capture.classList.add('show');
          } else {
            capture.classList.remove('show');
          }
        }, 10);
      });

      // Quick capture actions
      capture.querySelectorAll('.quick-capture-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const category = btn.dataset.action;

          const newNote = this.addNewNote('page', this.selectedText);
          const noteObj = this.notes.get(newNote.id);
          if (noteObj) {
            this.changeNoteCategory(newNote.id, category);
          }

          capture.classList.remove('show');
          window.getSelection().removeAllRanges();
        });
      });

      // Hide on click outside
      document.addEventListener('mousedown', (e) => {
        if (!capture.contains(e.target)) {
          capture.classList.remove('show');
        }
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TOAST NOTIFICATIONS
    // ═══════════════════════════════════════════════════════════════════════

    createToast() {
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.innerHTML = `
        ${ICONS.check}
        <span class="toast-message"></span>
      `;
      this.toast = toast;
      this.shadowRoot.appendChild(toast);
    }

    showToast(message, type = 'success') {
      const icons = {
        success: ICONS.check,
        error: ICONS.close,
        warning: ICONS.bell
      };

      this.toast.innerHTML = `${icons[type]}<span class="toast-message">${message}</span>`;
      this.toast.className = `toast ${type} show`;

      setTimeout(() => {
        this.toast.classList.remove('show');
      }, 2500);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // EXPORT / IMPORT
    // ═══════════════════════════════════════════════════════════════════════

    exportNotes() {
      const data = {
        version: '2.2',
        exportedAt: new Date().toISOString(),
        notes: this.allNotes,
        settings: this.settings
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `skynet-notes-${new Date().toISOString().split('T')[0]}.json`;
      a.click();

      URL.revokeObjectURL(url);
      this.showToast(`Exported ${this.allNotes.length} notes`, 'success');
    }

    async importNotes(jsonString) {
      try {
        const data = JSON.parse(jsonString);

        if (data.notes && Array.isArray(data.notes)) {
          this.allNotes = [...this.allNotes, ...data.notes];
          await this.saveNotes();

          // Show imported notes
          const currentDomain = getCurrentDomain();
          const currentUrl = getCurrentUrl();
          data.notes.forEach(noteData => {
            if (this.shouldShowNote(noteData, currentDomain, currentUrl)) {
              this.createNoteElement(noteData);
            }
          });

          this.updateNoteBadge();
          this.showToast(`Imported ${data.notes.length} notes`, 'success');
        }
      } catch (e) {
        this.showToast('Failed to import notes', 'error');
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STORAGE & MESSAGING
    // ═══════════════════════════════════════════════════════════════════════

    debouncedSave() {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = setTimeout(() => this.saveNotes(), 500);
    }

    async saveNotes() {
      try {
        // Update allNotes with current note data
        this.notes.forEach((noteObj, id) => {
          const idx = this.allNotes.findIndex(n => n.id === id);
          if (idx >= 0) {
            this.allNotes[idx] = noteObj.data;
          }
        });

        await chrome.storage.local.set({ [STORAGE_KEY]: this.allNotes });
      } catch (e) {
        console.error('[ZENFLOW] Error saving notes:', e);
      }
    }

    async saveSettings() {
      try {
        await chrome.storage.local.set({ [SETTINGS_KEY]: this.settings });
      } catch (e) {
        console.error('[ZENFLOW] Error saving settings:', e);
      }
    }

    setupMessageListener() {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        switch (message.action) {
          case 'toggleFloatingNotes':
            this.toggleAllNotes();
            sendResponse({ success: true, visible: this.notesVisible });
            break;
          case 'addFloatingNote':
            this.addNewNote(message.scope || 'global');
            sendResponse({ success: true });
            break;
          case 'openFloatingNote':
            // Open a new note on the current page
            this.addNewNote('page');
            sendResponse({ success: true });
            break;
          case 'getFloatingNotesCount':
            sendResponse({ count: this.notes.size, total: this.allNotes.length });
            break;
          case 'importFloatingNotes':
            this.importNotes(message.data);
            sendResponse({ success: true });
            break;
          case 'focusModeChanged':
            this.handleFocusModeChange(message.active);
            sendResponse({ success: true });
            break;
          case 'updateFloatingNotesSettings':
            this.applySettings(message.settings);
            sendResponse({ success: true });
            break;
          case 'resetFloatingNotesSettings':
            // Force reset to defaults
            this.settings = { ...DEFAULT_SETTINGS };
            this.saveSettings();
            if (this.commandCenter) {
              this.commandCenter.style.display = 'flex';
            }
            sendResponse({ success: true, settings: this.settings });
            break;
          case 'getFloatingNotesStatus':
            sendResponse({
              initialized: true,
              settings: this.settings,
              notesCount: this.notes.size,
              fabVisible: this.commandCenter ? this.commandCenter.style.display !== 'none' : false
            });
            break;
        }
        return true;
      });
    }

    applySettings(newSettings) {
      this.settings = { ...this.settings, ...newSettings };

      // Toggle notes visibility
      if (!newSettings.enabled) {
        this.notes.forEach(noteObj => {
          noteObj.element.style.display = 'none';
        });
        if (this.commandCenter) this.commandCenter.style.display = 'none';
      } else {
        this.notes.forEach(noteObj => {
          noteObj.element.style.display = 'flex';
        });
        if (this.commandCenter) this.commandCenter.style.display = 'flex';
      }

      // Toggle FAB visibility
      if (this.commandCenter) {
        this.commandCenter.style.display = newSettings.showFAB && newSettings.enabled ? 'flex' : 'none';
      }

      // Save settings
      this.saveSettings();
    }

    setupKeyboardShortcuts() {
      document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + Shift + F to search
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
          e.preventDefault();
          if (this.searchPanelOpen) {
            this.closeSearchPanel();
          } else {
            this.openSearchPanel();
          }
        }
      });
    }

    toggleAllNotes() {
      this.notesVisible = !this.notesVisible;

      this.notes.forEach(noteObj => {
        noteObj.element.style.display = this.notesVisible ? 'flex' : 'none';
      });

      if (this.commandCenter) {
        this.commandCenter.classList.toggle('hidden', !this.notesVisible);
      }

      this.showToast(this.notesVisible ? 'Notes visible' : 'Notes hidden');
    }

    handleFocusModeChange(active) {
      this.notes.forEach(noteObj => {
        if (noteObj.data.focusModeOnly) {
          noteObj.element.style.display = active ? 'flex' : 'none';
        }
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZE
  // ═══════════════════════════════════════════════════════════════════════════

  let initAttempts = 0;
  const MAX_INIT_ATTEMPTS = 5;

  function initFloatingNotes() {
    initAttempts++;
    console.log(`[ZENFLOW] Floating Notes: Init attempt ${initAttempts}/${MAX_INIT_ATTEMPTS}`);
    console.log(`[ZENFLOW] Document state: ${document.readyState}, Body exists: ${!!document.body}`);
    console.log(`[ZENFLOW] URL: ${window.location.href}`);

    try {
      // Check if chrome API is available
      if (typeof chrome === 'undefined' || !chrome.storage) {
        console.warn('[ZENFLOW] Floating Notes: Chrome API not available');
        if (initAttempts < MAX_INIT_ATTEMPTS) {
          setTimeout(initFloatingNotes, 500 * initAttempts);
        }
        return;
      }

      // Also check if chrome.storage.local exists
      if (!chrome.storage.local) {
        console.warn('[ZENFLOW] Floating Notes: chrome.storage.local not available');
        if (initAttempts < MAX_INIT_ATTEMPTS) {
          setTimeout(initFloatingNotes, 500 * initAttempts);
        }
        return;
      }

      // Wait for body to be available
      if (!document.body) {
        console.log('[ZENFLOW] Floating Notes: Waiting for body...');
        if (initAttempts < MAX_INIT_ATTEMPTS) {
          setTimeout(initFloatingNotes, 300);
        }
        return;
      }

      // Check if already initialized
      if (document.getElementById('zenflow-floating-notes-v2')) {
        console.log('[ZENFLOW] Floating Notes: Already initialized');
        return;
      }

      console.log('[ZENFLOW] Floating Notes: Creating manager...');
      const manager = new FloatingNotesManager();
      window.__ZENFLOW_FLOATING_NOTES__ = manager; // Store reference for debugging
      console.log('[ZENFLOW] Floating Notes: Successfully initialized!');
      console.log('[ZENFLOW] To debug, use: window.__ZENFLOW_FLOATING_NOTES__');
    } catch (e) {
      console.error('[ZENFLOW] Floating Notes: Init error:', e);
      console.error('[ZENFLOW] Stack:', e.stack);
      if (initAttempts < MAX_INIT_ATTEMPTS) {
        setTimeout(initFloatingNotes, 1000);
      }
    }
  }

  // Use multiple strategies to ensure initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFloatingNotes);
  } else if (document.readyState === 'interactive') {
    setTimeout(initFloatingNotes, 50);
  } else {
    // Document is complete - init immediately
    setTimeout(initFloatingNotes, 10);
  }

  // Fallback: also try when window loads
  window.addEventListener('load', () => {
    if (!document.getElementById('zenflow-floating-notes-v2')) {
      console.log('[ZENFLOW] Floating Notes: Window load fallback');
      initFloatingNotes();
    }
  });

})();
