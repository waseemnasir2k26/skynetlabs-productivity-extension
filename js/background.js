// ═══════════════════════════════════════════════════════════════════════════════
// ZENFLOW // NEURAL LABS v3.0 — Service Worker (MV3 Compliant)
// Neural-Link Productivity System | Lock in. Flow state activated.
// www.skynetjoe.com
// + Website Time Tracking & Analytics
// + Wellness Reminders (Breaks, Hydration, Eye Strain)
// + Vibe Mode Themes
// ═══════════════════════════════════════════════════════════════════════════════
//
// ARCHITECTURE:
// - Chrome Alarms API for reliable timing (no setInterval)
// - chrome.storage.local as single source of truth
// - Declarative Net Request (DNR) for site blocking
// - Offscreen Documents API for audio playback
// - Keep-alive pattern for Service Worker persistence
//
// ═══════════════════════════════════════════════════════════════════════════════

'use strict';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const ALARMS = {
  FOCUS_END: 'SKYNET_FOCUS_END',
  KEEP_ALIVE: 'SKYNET_KEEP_ALIVE',
  BADGE_UPDATE: 'SKYNET_BADGE_UPDATE',
  RECOVERY_CHECK: 'SKYNET_RECOVERY_CHECK',
  STREAK_CHECK: 'SKYNET_STREAK_CHECK',
  TIME_TRACKING_SAVE: 'SKYNET_TIME_TRACKING_SAVE',
  GOAL_CHECK: 'SKYNET_GOAL_CHECK',
  WELLNESS_CHECK: 'SKYNET_WELLNESS_CHECK',
  EARNINGS_UPDATE: 'SKYNET_EARNINGS_UPDATE'
};

const DNR_RULE_ID_START = 1000;

// Default blocked sites
const DEFAULT_BLOCKED_SITES = [
  // Social Media
  'facebook.com', 'twitter.com', 'x.com', 'instagram.com', 'tiktok.com',
  'snapchat.com', 'linkedin.com', 'pinterest.com', 'tumblr.com', 'threads.net',
  'reddit.com', 'discord.com', 'telegram.org', 'whatsapp.com',
  // Entertainment
  'youtube.com', 'netflix.com', 'twitch.tv', 'hulu.com', 'disneyplus.com',
  'primevideo.com', 'hbomax.com', 'max.com', 'crunchyroll.com', 'spotify.com',
  // News & Time Wasters
  'news.ycombinator.com', 'buzzfeed.com', '9gag.com', 'imgur.com', 'dailymail.co.uk',
  // Gaming
  'store.steampowered.com', 'steamcommunity.com', 'epicgames.com', 'roblox.com'
];

// XP & Level Configuration
const GAMIFICATION = {
  XP_PER_FOCUS_MINUTE: 2,
  XP_PER_TASK_COMPLETE: 25,
  XP_PER_BLOCKED_RESIST: 5,
  XP_PER_STREAK_DAY: 50,
  XP_BONUS_HARDCORE: 1.5,
  LEVELS: [
    { level: 1, name: 'Initiate', xpRequired: 0 },
    { level: 2, name: 'Recruit', xpRequired: 100 },
    { level: 3, name: 'Operator', xpRequired: 300 },
    { level: 4, name: 'Specialist', xpRequired: 600 },
    { level: 5, name: 'Agent', xpRequired: 1000 },
    { level: 6, name: 'Elite Agent', xpRequired: 1500 },
    { level: 7, name: 'Commander', xpRequired: 2200 },
    { level: 8, name: 'Netrunner', xpRequired: 3000 },
    { level: 9, name: 'Ghost', xpRequired: 4000 },
    { level: 10, name: 'SKYNET Elite', xpRequired: 5500 },
    { level: 11, name: 'Ascended', xpRequired: 7500 },
    { level: 12, name: 'Legendary', xpRequired: 10000 }
  ]
};

// Social media and time-wasting sites for categorization
const SITE_CATEGORIES = {
  social: ['facebook.com', 'twitter.com', 'x.com', 'instagram.com', 'tiktok.com', 'snapchat.com', 'linkedin.com', 'pinterest.com', 'tumblr.com', 'threads.net', 'reddit.com', 'discord.com', 'telegram.org', 'whatsapp.com'],
  entertainment: ['youtube.com', 'netflix.com', 'twitch.tv', 'hulu.com', 'disneyplus.com', 'primevideo.com', 'hbomax.com', 'max.com', 'crunchyroll.com', 'spotify.com', 'vimeo.com'],
  news: ['news.ycombinator.com', 'buzzfeed.com', 'cnn.com', 'bbc.com', 'nytimes.com', 'reddit.com'],
  shopping: ['amazon.com', 'ebay.com', 'aliexpress.com', 'etsy.com', 'walmart.com'],
  gaming: ['store.steampowered.com', 'steamcommunity.com', 'epicgames.com', 'roblox.com', 'twitch.tv'],
  productive: ['github.com', 'gitlab.com', 'stackoverflow.com', 'notion.so', 'docs.google.com', 'drive.google.com', 'figma.com', 'linear.app', 'jira.atlassian.com']
};

// Default storage schema
const DEFAULT_STORAGE = {
  // Focus Mode State
  focus: {
    active: false,
    locked: false,
    hardcoreMode: false,
    endTime: null,
    startTime: null,
    duration: 0,
    sessionsCompleted: 0,
    totalFocusMinutes: 0,
    blockedAttempts: 0,
    currentSessionBlocked: 0
  },

  // Blocked Sites
  blockedSites: {
    defaults: DEFAULT_BLOCKED_SITES,
    custom: [],
    probation: [] // Sites with friction, not fully blocked
  },

  // Tasks
  tasks: [],

  // Projects
  projects: [
    { id: 'inbox', name: 'Inbox', color: '#6B7280', icon: 'inbox' },
    { id: 'work', name: 'Work', color: '#00F3FF', icon: 'briefcase' },
    { id: 'personal', name: 'Personal', color: '#FF00FF', icon: 'user' }
  ],

  // Gamification
  netrunner: {
    xp: 0,
    level: 1,
    levelName: 'Initiate',
    totalTasksCompleted: 0,
    totalFocusSessions: 0,
    totalDistractionsBlocked: 0,
    longestStreak: 0,
    currentStreak: 0,
    lastActiveDate: null,
    achievements: [],
    unlockedThemes: ['default'],
    unlockedSounds: ['rain']
  },

  // Streak tracking (separate from netrunner for easy access)
  streak: {
    current: 0,
    longest: 0,
    lastActiveDate: null
  },

  // Session History
  sessions: [],

  // Daily Stats (for heatmap)
  dailyStats: {},

  // Distraction Log (for heatmap)
  distractionLog: [],

  // Settings
  settings: {
    theme: 'cyberpunk',
    accentColor: '#00F3FF',
    fontSize: 'medium',
    soundEnabled: true,
    notificationsEnabled: true,
    hardcoreModeDefault: false,
    focusSoundType: 'rain', // rain, whitenoise, lofi, silence
    focusSoundVolume: 0.5,
    showMotivationalQuotes: true,
    weekStartsOn: 1, // Monday
    dailyGoalMinutes: 120
  },

  // Quick Links
  quickLinks: [
    { id: '1', title: 'GitHub', url: 'https://github.com', icon: 'github' },
    { id: '2', title: 'Notion', url: 'https://notion.so', icon: 'file-text' }
  ],

  // Notes
  notes: [],

  // Sticky Notes (for quick notes widget)
  stickyNotes: '',

  // Integrations
  integrations: {
    notion: { enabled: false, apiKey: null, databaseId: null },
    todoist: { enabled: false, apiKey: null }
  },

  // Website Time Tracking
  timeTracking: {
    enabled: true,
    sessions: {}, // { 'YYYY-MM-DD': { 'domain.com': { totalSeconds: 0, category: 'social', visits: 0 } } }
    currentSession: null, // { domain: string, startTime: number, tabId: number }
    weeklyData: {}, // Aggregated weekly data
    goals: {
      social: 30, // max minutes per day
      entertainment: 60,
      gaming: 30,
      productive: null // null = no limit
    }
  },

  // Freelancer Billing System
  freelancer: {
    enabled: true,
    defaultHourlyRate: 50, // USD
    currency: 'USD',
    clients: [
      { id: 'personal', name: 'Personal', color: '#6B7280', hourlyRate: null, archived: false }
    ],
    billableProjects: [
      { id: 'general', name: 'General Work', clientId: 'personal', hourlyRate: null, color: '#00F3FF', archived: false }
    ],
    billableSessions: {}, // { 'YYYY-MM-DD': [{ id, projectId, clientId, startTime, endTime, seconds, description, billable, invoiced }] }
    currentBillableSession: null, // { projectId, clientId, startTime, description }
    invoices: [], // { id, clientId, projectId, sessions: [], totalHours, totalAmount, createdAt, paidAt, status }
    todayEarnings: 0,
    weekEarnings: 0,
    monthEarnings: 0
  },

  // Wellness System
  wellness: {
    enabled: true,
    breakReminders: true,
    breakIntervalMinutes: 45,
    hydrationReminders: true,
    hydrationIntervalMinutes: 60,
    eyeStrainReminders: true,
    eyeStrainIntervalMinutes: 20,
    stretchReminders: false,
    stretchIntervalMinutes: 90,
    lastBreakTime: null,
    lastHydrationTime: null,
    lastEyeStrainTime: null,
    dailyBreaksTaken: 0,
    workingHoursStart: 9, // 9 AM
    workingHoursEnd: 18, // 6 PM
    weekendReminders: false
  },

  // Vibe/Theme System
  vibeMode: {
    current: 'cyberpunk',
    available: ['cyberpunk', 'lofi', 'minimal-dark', 'synthwave', 'forest', 'ocean'],
    customColors: {
      primary: '#00F3FF',
      secondary: '#FF00FF',
      background: '#0A0A0F',
      surface: '#1A1A2E'
    },
    ambientSound: 'rain',
    ambientVolume: 0.3
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// STORAGE MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

class StorageManager {
  static async get(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, (result) => {
        resolve(result);
      });
    });
  }

  static async set(data) {
    return new Promise((resolve) => {
      chrome.storage.local.set(data, resolve);
    });
  }

  static async getAll() {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (result) => {
        resolve(result);
      });
    });
  }

  static async getFocus() {
    const { focus } = await this.get(['focus']);
    return { ...DEFAULT_STORAGE.focus, ...focus };
  }

  static async setFocus(data) {
    await this.set({ focus: data });
  }

  static async getNetrunner() {
    const { netrunner } = await this.get(['netrunner']);
    return { ...DEFAULT_STORAGE.netrunner, ...netrunner };
  }

  static async setNetrunner(data) {
    await this.set({ netrunner: data });
  }

  static async getBlockedSites() {
    const { blockedSites } = await this.get(['blockedSites']);
    return { ...DEFAULT_STORAGE.blockedSites, ...blockedSites };
  }

  static async getSettings() {
    const { settings } = await this.get(['settings']);
    return { ...DEFAULT_STORAGE.settings, ...settings };
  }

  static async getTasks() {
    const { tasks } = await this.get(['tasks']);
    return tasks || [];
  }

  static async setTasks(tasks) {
    await this.set({ tasks });
  }

  static async getSessions() {
    const { sessions } = await this.get(['sessions']);
    return sessions || [];
  }

  static async addSession(session) {
    const sessions = await this.getSessions();
    sessions.unshift(session);
    // Keep last 500 sessions
    if (sessions.length > 500) sessions.length = 500;
    await this.set({ sessions });
  }

  static async getDailyStats() {
    const { dailyStats } = await this.get(['dailyStats']);
    return dailyStats || {};
  }

  static async updateDailyStats(date, data) {
    const dailyStats = await this.getDailyStats();
    dailyStats[date] = { ...dailyStats[date], ...data };

    // Clean old entries (keep 365 days)
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 365);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    Object.keys(dailyStats).forEach(key => {
      if (key < cutoffStr) delete dailyStats[key];
    });

    await this.set({ dailyStats });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DNR (DECLARATIVE NET REQUEST) MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

class DNRManager {
  static generateRules(sites, redirectUrl) {
    return sites.map((site, index) => ({
      id: DNR_RULE_ID_START + index,
      priority: 1,
      action: {
        type: 'redirect',
        redirect: { extensionPath: '/focus.html?blocked=' + encodeURIComponent(site) }
      },
      condition: {
        urlFilter: `||${site.replace(/^www\./, '')}`,
        resourceTypes: ['main_frame']
      }
    }));
  }

  static async enableBlocking(sites) {
    try {
      // First, remove any existing dynamic rules
      const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
      const existingIds = existingRules.map(r => r.id);

      if (existingIds.length > 0) {
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: existingIds
        });
      }

      // Generate new rules
      const rules = this.generateRules(sites, '/focus.html');

      // Add new rules
      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: rules
      });

      console.log(`[ZENFLOW] DNR: Enabled blocking for ${sites.length} sites`);
      return true;
    } catch (error) {
      console.error('[ZENFLOW] DNR Error:', error);
      return false;
    }
  }

  static async disableBlocking() {
    try {
      const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
      const existingIds = existingRules.map(r => r.id);

      if (existingIds.length > 0) {
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: existingIds
        });
      }

      console.log('[ZENFLOW] DNR: Disabled all blocking rules');
      return true;
    } catch (error) {
      console.error('[ZENFLOW] DNR Disable Error:', error);
      return false;
    }
  }

  static async getActiveRules() {
    return await chrome.declarativeNetRequest.getDynamicRules();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// OFFSCREEN MANAGER (For Audio)
// ═══════════════════════════════════════════════════════════════════════════════

class OffscreenManager {
  static OFFSCREEN_DOCUMENT_PATH = '/offscreen.html';

  static async hasDocument() {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [chrome.runtime.getURL(this.OFFSCREEN_DOCUMENT_PATH)]
    });
    return contexts.length > 0;
  }

  static async createDocument() {
    if (await this.hasDocument()) return;

    await chrome.offscreen.createDocument({
      url: this.OFFSCREEN_DOCUMENT_PATH,
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Play ambient focus sounds during focus sessions'
    });
  }

  static async closeDocument() {
    if (!(await this.hasDocument())) return;
    await chrome.offscreen.closeDocument();
  }

  static async playSound(soundType, volume = 0.5) {
    await this.createDocument();
    chrome.runtime.sendMessage({
      target: 'offscreen',
      action: 'playSound',
      soundType,
      volume
    });
  }

  static async stopSound() {
    if (await this.hasDocument()) {
      chrome.runtime.sendMessage({
        target: 'offscreen',
        action: 'stopSound'
      });
    }
  }

  static async setVolume(volume) {
    if (await this.hasDocument()) {
      chrome.runtime.sendMessage({
        target: 'offscreen',
        action: 'setVolume',
        volume
      });
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FOCUS LOCK SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

class FocusLockSystem {

  static async startFocus(durationMinutes, options = {}) {
    const focus = await StorageManager.getFocus();

    // Cannot start if already locked
    if (focus.active && focus.locked) {
      return { success: false, error: 'Focus session already active and locked' };
    }

    const now = Date.now();
    const endTime = now + (durationMinutes * 60 * 1000);
    const blockedSites = await StorageManager.getBlockedSites();
    const allSites = [...new Set([...blockedSites.defaults, ...blockedSites.custom])];

    const newFocus = {
      ...focus,
      active: true,
      locked: options.locked !== false, // Default to locked unless explicitly false
      hardcoreMode: options.hardcore || false,
      startTime: now,
      endTime: endTime,
      duration: durationMinutes,
      currentSessionBlocked: 0
    };

    await StorageManager.setFocus(newFocus);

    // Enable site blocking via DNR
    await DNRManager.enableBlocking(allSites);

    // Set alarm for focus end
    await chrome.alarms.create(ALARMS.FOCUS_END, { when: endTime });

    // Set badge update alarm (every minute)
    await chrome.alarms.create(ALARMS.BADGE_UPDATE, { periodInMinutes: 1 });

    // Update badge immediately
    await this.updateBadge(durationMinutes);

    // Play focus sound if enabled
    const settings = await StorageManager.getSettings();
    if (settings.soundEnabled && settings.focusSoundType !== 'silence') {
      await OffscreenManager.playSound(settings.focusSoundType, settings.focusSoundVolume);
    }

    console.log(`[ZENFLOW] Focus started: ${durationMinutes} min, Hardcore: ${options.hardcore}`);

    return { success: true, endTime, duration: durationMinutes };
  }

  static async endFocus(reason = 'completed') {
    const focus = await StorageManager.getFocus();

    if (!focus.active) {
      return { success: false, error: 'No active focus session' };
    }

    // If locked and not expired, reject manual end
    if (focus.locked && focus.endTime > Date.now() && reason !== 'timer') {
      return { success: false, error: 'Focus session is locked until timer expires' };
    }

    const actualMinutes = focus.startTime
      ? Math.round((Date.now() - focus.startTime) / 60000)
      : focus.duration;

    // Record session
    const session = {
      id: Date.now().toString(),
      startTime: focus.startTime,
      endTime: Date.now(),
      plannedDuration: focus.duration,
      actualDuration: actualMinutes,
      completed: reason === 'timer' || reason === 'completed',
      hardcore: focus.hardcoreMode,
      blockedAttempts: focus.currentSessionBlocked
    };
    await StorageManager.addSession(session);

    // Update daily stats
    const today = new Date().toISOString().split('T')[0];
    const dailyStats = await StorageManager.getDailyStats();
    const todayStats = dailyStats[today] || { focusMinutes: 0, sessions: 0, tasksCompleted: 0, distractionsBlocked: 0 };
    todayStats.focusMinutes += actualMinutes;
    todayStats.sessions += 1;
    todayStats.distractionsBlocked += focus.currentSessionBlocked;
    await StorageManager.updateDailyStats(today, todayStats);

    // Award XP
    let xpEarned = actualMinutes * GAMIFICATION.XP_PER_FOCUS_MINUTE;
    xpEarned += focus.currentSessionBlocked * GAMIFICATION.XP_PER_BLOCKED_RESIST;
    if (focus.hardcoreMode) xpEarned *= GAMIFICATION.XP_BONUS_HARDCORE;
    await this.awardXP(Math.round(xpEarned));

    // Reset focus state
    const newFocus = {
      ...focus,
      active: false,
      locked: false,
      hardcoreMode: false,
      endTime: null,
      startTime: null,
      duration: 0,
      sessionsCompleted: focus.sessionsCompleted + (session.completed ? 1 : 0),
      totalFocusMinutes: focus.totalFocusMinutes + actualMinutes,
      currentSessionBlocked: 0
    };
    await StorageManager.setFocus(newFocus);

    // Disable blocking
    await DNRManager.disableBlocking();

    // Clear alarms
    await chrome.alarms.clear(ALARMS.FOCUS_END);
    await chrome.alarms.clear(ALARMS.BADGE_UPDATE);

    // Clear badge
    await chrome.action.setBadgeText({ text: '' });

    // Stop focus sound
    await OffscreenManager.stopSound();

    // Show notification
    if (session.completed) {
      await this.showNotification(
        'Focus Session Complete!',
        `Great work! You focused for ${actualMinutes} minutes and resisted ${focus.currentSessionBlocked} distractions.`
      );
    }

    console.log(`[ZENFLOW] Focus ended: ${actualMinutes} min (${reason})`);

    return { success: true, session };
  }

  static async getRemainingTime() {
    const focus = await StorageManager.getFocus();

    if (!focus.active || !focus.endTime) {
      return { remaining: 0, active: false };
    }

    const remaining = Math.max(0, focus.endTime - Date.now());

    return {
      remaining,
      remainingMinutes: Math.ceil(remaining / 60000),
      remainingSeconds: Math.ceil(remaining / 1000),
      active: focus.active,
      locked: focus.locked,
      hardcore: focus.hardcoreMode,
      endTime: focus.endTime,
      startTime: focus.startTime,
      duration: focus.duration,
      progress: focus.duration > 0
        ? Math.round(((focus.duration * 60000) - remaining) / (focus.duration * 60000) * 100)
        : 0
    };
  }

  static async updateBadge(minutes = null) {
    if (minutes === null) {
      const { remainingMinutes, active } = await this.getRemainingTime();
      if (!active) {
        await chrome.action.setBadgeText({ text: '' });
        return;
      }
      minutes = remainingMinutes;
    }

    let badgeText;
    if (minutes >= 60) {
      badgeText = `${Math.floor(minutes / 60)}h`;
    } else {
      badgeText = `${minutes}m`;
    }

    await chrome.action.setBadgeText({ text: badgeText });
    await chrome.action.setBadgeBackgroundColor({ color: '#FF00FF' });
  }

  static async recoveryCheck() {
    const focus = await StorageManager.getFocus();

    if (focus.active && focus.locked && focus.endTime) {
      const now = Date.now();

      if (now >= focus.endTime) {
        // Time expired, end session
        console.log('[ZENFLOW] Recovery: Focus expired, ending session');
        await this.endFocus('timer');
      } else {
        // Session still active, ensure blocking is enabled
        console.log('[ZENFLOW] Recovery: Restoring active focus session');

        const blockedSites = await StorageManager.getBlockedSites();
        const allSites = [...new Set([...blockedSites.defaults, ...blockedSites.custom])];
        await DNRManager.enableBlocking(allSites);

        // Recreate alarm if missing
        const alarm = await chrome.alarms.get(ALARMS.FOCUS_END);
        if (!alarm) {
          await chrome.alarms.create(ALARMS.FOCUS_END, { when: focus.endTime });
          await chrome.alarms.create(ALARMS.BADGE_UPDATE, { periodInMinutes: 1 });
        }

        await this.updateBadge();
      }
    }
  }

  static async incrementBlockedAttempt(site) {
    const focus = await StorageManager.getFocus();
    focus.currentSessionBlocked = (focus.currentSessionBlocked || 0) + 1;
    focus.blockedAttempts = (focus.blockedAttempts || 0) + 1;
    await StorageManager.setFocus(focus);

    // Log distraction
    const { distractionLog } = await StorageManager.get(['distractionLog']);
    const log = distractionLog || [];
    log.push({
      timestamp: Date.now(),
      site,
      date: new Date().toISOString().split('T')[0],
      hour: new Date().getHours()
    });
    // Keep last 1000 entries
    if (log.length > 1000) log.shift();
    await StorageManager.set({ distractionLog: log });
  }

  static async showNotification(title, message) {
    const settings = await StorageManager.getSettings();
    if (!settings.notificationsEnabled) return;

    try {
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
        title: `SKYNET: ${title}`,
        message,
        priority: 2
      });
    } catch (e) {
      console.error('[ZENFLOW] Notification error:', e);
    }
  }

  static async awardXP(amount) {
    const netrunner = await StorageManager.getNetrunner();
    netrunner.xp += amount;

    // Check for level up
    const newLevel = GAMIFICATION.LEVELS.filter(l => netrunner.xp >= l.xpRequired).pop();
    if (newLevel && newLevel.level > netrunner.level) {
      netrunner.level = newLevel.level;
      netrunner.levelName = newLevel.name;

      // Show level up notification
      await this.showNotification(
        'LEVEL UP!',
        `You've reached Level ${newLevel.level}: ${newLevel.name}!`
      );
    }

    await StorageManager.setNetrunner(netrunner);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCTIVITY SCORE CALCULATOR
// ═══════════════════════════════════════════════════════════════════════════════

class ProductivityCalculator {
  static async calculateScore() {
    const tasks = await StorageManager.getTasks();
    const focus = await StorageManager.getFocus();
    const netrunner = await StorageManager.getNetrunner();
    const dailyStats = await StorageManager.getDailyStats();
    const settings = await StorageManager.getSettings();

    const today = new Date().toISOString().split('T')[0];
    const todayStats = dailyStats[today] || { focusMinutes: 0, sessions: 0, tasksCompleted: 0, distractionsBlocked: 0 };

    let score = 0;
    const breakdown = {};

    // Task completion (35 points max)
    const todayTasks = tasks.filter(t => {
      const created = new Date(t.createdAt).toISOString().split('T')[0];
      return created === today || !t.completed;
    });
    const completedToday = todayTasks.filter(t => t.completed).length;
    const totalToday = todayTasks.length || 1;
    breakdown.tasks = Math.round((completedToday / totalToday) * 35);
    score += breakdown.tasks;

    // Focus time (35 points max)
    const dailyGoal = settings.dailyGoalMinutes || 120;
    breakdown.focus = Math.min(35, Math.round((todayStats.focusMinutes / dailyGoal) * 35));
    score += breakdown.focus;

    // Distraction resistance (15 points max)
    // Higher score for more blocked attempts (shows you're resisting temptation)
    breakdown.resistance = Math.min(15, Math.round(todayStats.distractionsBlocked * 0.5));
    score += breakdown.resistance;

    // Streak bonus (15 points max)
    breakdown.streak = Math.min(15, netrunner.currentStreak * 3);
    score += breakdown.streak;

    // Active focus bonus
    if (focus.active) {
      score += 5;
      breakdown.activeBonus = 5;
    }

    return {
      score: Math.min(100, score),
      breakdown,
      level: netrunner.level,
      levelName: netrunner.levelName,
      xp: netrunner.xp,
      nextLevelXP: GAMIFICATION.LEVELS.find(l => l.level === netrunner.level + 1)?.xpRequired || null
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// STREAK MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

class StreakManager {
  static async checkAndUpdateStreak() {
    const netrunner = await StorageManager.getNetrunner();
    const dailyStats = await StorageManager.getDailyStats();
    const settings = await StorageManager.getSettings();
    const { streak } = await StorageManager.get(['streak']);
    const currentStreak = streak || { current: 0, longest: 0, lastActiveDate: null };

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const todayStats = dailyStats[today];
    const dailyGoal = settings.dailyGoalMinutes || 120;

    // Check if today's goal is met
    if (todayStats && todayStats.focusMinutes >= dailyGoal) {
      if (currentStreak.lastActiveDate === yesterday) {
        // Continue streak
        currentStreak.current += 1;
        netrunner.currentStreak = currentStreak.current;
      } else if (currentStreak.lastActiveDate !== today) {
        // Start new streak
        currentStreak.current = 1;
        netrunner.currentStreak = 1;
      }

      currentStreak.lastActiveDate = today;
      netrunner.lastActiveDate = today;

      // Update longest streak
      if (currentStreak.current > currentStreak.longest) {
        currentStreak.longest = currentStreak.current;
        netrunner.longestStreak = currentStreak.current;
      }

      // Award streak XP
      await FocusLockSystem.awardXP(GAMIFICATION.XP_PER_STREAK_DAY);
    } else if (currentStreak.lastActiveDate && currentStreak.lastActiveDate < yesterday) {
      // Streak broken
      currentStreak.current = 0;
      netrunner.currentStreak = 0;
    }

    // Save both streak and netrunner
    await StorageManager.set({ streak: currentStreak });
    await StorageManager.setNetrunner(netrunner);
  }

  static async getStreak() {
    const { streak } = await StorageManager.get(['streak']);
    return streak || { current: 0, longest: 0, lastActiveDate: null };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIME TRACKER - Website Usage Analytics
// ═══════════════════════════════════════════════════════════════════════════════

class TimeTracker {
  static currentSession = null;
  static lastActivityTime = Date.now();

  static getDomainFromUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      return null;
    }
  }

  static getCategoryForDomain(domain) {
    for (const [category, sites] of Object.entries(SITE_CATEGORIES)) {
      if (sites.some(site => domain.includes(site) || site.includes(domain))) {
        return category;
      }
    }
    return 'other';
  }

  static async getTimeTracking() {
    const { timeTracking } = await StorageManager.get(['timeTracking']);
    return { ...DEFAULT_STORAGE.timeTracking, ...timeTracking };
  }

  static async saveTimeTracking(data) {
    await StorageManager.set({ timeTracking: data });
  }

  static async startTracking(tabId, url) {
    if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:')) {
      return;
    }

    const domain = this.getDomainFromUrl(url);
    if (!domain) return;

    // End any existing session first
    await this.endCurrentSession();

    // Start new session
    this.currentSession = {
      domain,
      startTime: Date.now(),
      tabId,
      category: this.getCategoryForDomain(domain)
    };

    this.lastActivityTime = Date.now();
    console.log(`[ZENFLOW] Time tracking started: ${domain}`);
  }

  static async endCurrentSession() {
    if (!this.currentSession) return;

    const duration = Math.round((Date.now() - this.currentSession.startTime) / 1000);

    // Only track if more than 3 seconds (filter out quick tab switches)
    if (duration >= 3) {
      await this.recordTime(this.currentSession.domain, duration, this.currentSession.category);
    }

    console.log(`[ZENFLOW] Time tracking ended: ${this.currentSession.domain} (${duration}s)`);
    this.currentSession = null;
  }

  static async recordTime(domain, seconds, category) {
    const timeTracking = await this.getTimeTracking();
    const today = new Date().toISOString().split('T')[0];

    // Initialize today's data if needed
    if (!timeTracking.sessions[today]) {
      timeTracking.sessions[today] = {};
    }

    // Initialize domain data if needed
    if (!timeTracking.sessions[today][domain]) {
      timeTracking.sessions[today][domain] = {
        totalSeconds: 0,
        category: category || 'other',
        visits: 0,
        firstVisit: Date.now(),
        lastVisit: Date.now()
      };
    }

    // Update domain stats
    const domainData = timeTracking.sessions[today][domain];
    domainData.totalSeconds += seconds;
    domainData.visits += 1;
    domainData.lastVisit = Date.now();

    // Clean up old data (keep 90 days)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    Object.keys(timeTracking.sessions).forEach(date => {
      if (date < cutoffStr) {
        delete timeTracking.sessions[date];
      }
    });

    await this.saveTimeTracking(timeTracking);
  }

  static async getTodayStats() {
    const timeTracking = await this.getTimeTracking();
    const today = new Date().toISOString().split('T')[0];
    const todayData = timeTracking.sessions[today] || {};

    // Calculate totals by category
    const byCategory = {
      social: { totalSeconds: 0, sites: [] },
      entertainment: { totalSeconds: 0, sites: [] },
      news: { totalSeconds: 0, sites: [] },
      shopping: { totalSeconds: 0, sites: [] },
      gaming: { totalSeconds: 0, sites: [] },
      productive: { totalSeconds: 0, sites: [] },
      other: { totalSeconds: 0, sites: [] }
    };

    const topSites = [];

    for (const [domain, data] of Object.entries(todayData)) {
      const cat = data.category || 'other';
      if (byCategory[cat]) {
        byCategory[cat].totalSeconds += data.totalSeconds;
        byCategory[cat].sites.push({ domain, ...data });
      }

      topSites.push({
        domain,
        totalSeconds: data.totalSeconds,
        totalMinutes: Math.round(data.totalSeconds / 60),
        category: data.category,
        visits: data.visits
      });
    }

    // Sort top sites by time spent
    topSites.sort((a, b) => b.totalSeconds - a.totalSeconds);

    // Calculate total time
    const totalSeconds = Object.values(todayData).reduce((sum, d) => sum + d.totalSeconds, 0);

    // Calculate waste time (social + entertainment + gaming + news)
    const wasteSeconds = byCategory.social.totalSeconds +
                         byCategory.entertainment.totalSeconds +
                         byCategory.gaming.totalSeconds +
                         byCategory.news.totalSeconds;

    // Check goals
    const goals = timeTracking.goals || {};
    const warnings = [];

    for (const [category, maxMinutes] of Object.entries(goals)) {
      if (maxMinutes !== null && byCategory[category]) {
        const usedMinutes = Math.round(byCategory[category].totalSeconds / 60);
        if (usedMinutes >= maxMinutes) {
          warnings.push({
            category,
            used: usedMinutes,
            limit: maxMinutes,
            exceeded: true
          });
        } else if (usedMinutes >= maxMinutes * 0.8) {
          warnings.push({
            category,
            used: usedMinutes,
            limit: maxMinutes,
            exceeded: false,
            approaching: true
          });
        }
      }
    }

    return {
      date: today,
      totalSeconds,
      totalMinutes: Math.round(totalSeconds / 60),
      wasteSeconds,
      wasteMinutes: Math.round(wasteSeconds / 60),
      productiveSeconds: byCategory.productive.totalSeconds,
      productiveMinutes: Math.round(byCategory.productive.totalSeconds / 60),
      byCategory: Object.fromEntries(
        Object.entries(byCategory).map(([cat, data]) => [
          cat,
          {
            totalSeconds: data.totalSeconds,
            totalMinutes: Math.round(data.totalSeconds / 60),
            sites: data.sites.sort((a, b) => b.totalSeconds - a.totalSeconds).slice(0, 10)
          }
        ])
      ),
      topSites: topSites.slice(0, 20),
      warnings,
      goals
    };
  }

  static async getWeeklyStats() {
    const timeTracking = await this.getTimeTracking();
    const weekData = [];

    // Get last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

      const dayData = timeTracking.sessions[dateStr] || {};

      let totalSeconds = 0;
      let wasteSeconds = 0;
      let productiveSeconds = 0;

      for (const data of Object.values(dayData)) {
        totalSeconds += data.totalSeconds;
        if (['social', 'entertainment', 'gaming', 'news'].includes(data.category)) {
          wasteSeconds += data.totalSeconds;
        } else if (data.category === 'productive') {
          productiveSeconds += data.totalSeconds;
        }
      }

      weekData.push({
        date: dateStr,
        dayName,
        totalMinutes: Math.round(totalSeconds / 60),
        wasteMinutes: Math.round(wasteSeconds / 60),
        productiveMinutes: Math.round(productiveSeconds / 60)
      });
    }

    // Calculate week totals
    const weekTotal = weekData.reduce((sum, d) => sum + d.totalMinutes, 0);
    const weekWaste = weekData.reduce((sum, d) => sum + d.wasteMinutes, 0);
    const weekProductive = weekData.reduce((sum, d) => sum + d.productiveMinutes, 0);

    return {
      days: weekData,
      totals: {
        totalMinutes: weekTotal,
        totalHours: Math.round(weekTotal / 60 * 10) / 10,
        wasteMinutes: weekWaste,
        wasteHours: Math.round(weekWaste / 60 * 10) / 10,
        productiveMinutes: weekProductive,
        productiveHours: Math.round(weekProductive / 60 * 10) / 10,
        wastePercentage: weekTotal > 0 ? Math.round(weekWaste / weekTotal * 100) : 0
      }
    };
  }

  static async getInsights() {
    const todayStats = await this.getTodayStats();
    const weeklyStats = await this.getWeeklyStats();
    const insights = [];

    // Social media insight
    if (todayStats.byCategory.social.totalMinutes > 30) {
      insights.push({
        type: 'warning',
        icon: '📱',
        title: 'Social Media Alert',
        message: `You've spent ${todayStats.byCategory.social.totalMinutes} minutes on social media today. Consider taking a break.`,
        category: 'social'
      });
    }

    // YouTube/Entertainment insight
    if (todayStats.byCategory.entertainment.totalMinutes > 60) {
      insights.push({
        type: 'warning',
        icon: '📺',
        title: 'Entertainment Overload',
        message: `${todayStats.byCategory.entertainment.totalMinutes} minutes on entertainment sites. Time to focus!`,
        category: 'entertainment'
      });
    }

    // Productivity insight
    if (todayStats.productiveMinutes > 120) {
      insights.push({
        type: 'success',
        icon: '🚀',
        title: 'Productivity Champion',
        message: `Great work! ${todayStats.productiveMinutes} minutes on productive sites today.`,
        category: 'productive'
      });
    }

    // Weekly comparison
    const todayIdx = weeklyStats.days.length - 1;
    const yesterdayIdx = todayIdx - 1;
    if (yesterdayIdx >= 0) {
      const todayWaste = weeklyStats.days[todayIdx].wasteMinutes;
      const yesterdayWaste = weeklyStats.days[yesterdayIdx].wasteMinutes;

      if (todayWaste < yesterdayWaste && yesterdayWaste > 0) {
        const improvement = Math.round((1 - todayWaste / yesterdayWaste) * 100);
        insights.push({
          type: 'success',
          icon: '📈',
          title: 'Improvement!',
          message: `You've reduced time-wasting by ${improvement}% compared to yesterday. Keep it up!`,
          category: 'improvement'
        });
      }
    }

    // Most visited site
    if (todayStats.topSites.length > 0) {
      const topSite = todayStats.topSites[0];
      if (topSite.totalMinutes >= 30) {
        const isWaste = ['social', 'entertainment', 'gaming', 'news'].includes(topSite.category);
        insights.push({
          type: isWaste ? 'warning' : 'info',
          icon: isWaste ? '⏰' : '💻',
          title: 'Most Visited Today',
          message: `${topSite.domain}: ${topSite.totalMinutes} minutes (${topSite.visits} visits)`,
          category: topSite.category
        });
      }
    }

    // Weekly waste percentage
    if (weeklyStats.totals.wastePercentage > 40) {
      insights.push({
        type: 'alert',
        icon: '⚠️',
        title: 'Weekly Check',
        message: `${weeklyStats.totals.wastePercentage}% of your browsing time this week was on distracting sites.`,
        category: 'weekly'
      });
    }

    return {
      insights,
      todayStats,
      weeklyStats
    };
  }

  static async setGoal(category, maxMinutes) {
    const timeTracking = await this.getTimeTracking();
    if (!timeTracking.goals) timeTracking.goals = {};
    timeTracking.goals[category] = maxMinutes;
    await this.saveTimeTracking(timeTracking);
  }

  static async checkGoals() {
    const stats = await this.getTodayStats();
    const notifications = [];

    for (const warning of stats.warnings) {
      if (warning.exceeded) {
        notifications.push({
          title: `${warning.category.charAt(0).toUpperCase() + warning.category.slice(1)} Limit Exceeded`,
          message: `You've spent ${warning.used} minutes on ${warning.category} sites (limit: ${warning.limit} min)`
        });
      }
    }

    return notifications;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FREELANCER TRACKER - Billable Time & Earnings
// ═══════════════════════════════════════════════════════════════════════════════

class FreelancerTracker {
  static currentBillableSession = null;

  static async getFreelancerData() {
    const { freelancer } = await StorageManager.get(['freelancer']);
    return { ...DEFAULT_STORAGE.freelancer, ...freelancer };
  }

  static async saveFreelancerData(data) {
    await StorageManager.set({ freelancer: data });
  }

  // ─── CLIENT MANAGEMENT ─────────────────────────────────────────────
  static async addClient(client) {
    const data = await this.getFreelancerData();
    const newClient = {
      id: Date.now().toString(),
      name: client.name,
      color: client.color || '#00F3FF',
      hourlyRate: client.hourlyRate || null,
      email: client.email || '',
      notes: client.notes || '',
      archived: false,
      createdAt: Date.now()
    };
    data.clients.push(newClient);
    await this.saveFreelancerData(data);
    return newClient;
  }

  static async updateClient(clientId, updates) {
    const data = await this.getFreelancerData();
    const client = data.clients.find(c => c.id === clientId);
    if (client) {
      Object.assign(client, updates);
      await this.saveFreelancerData(data);
    }
    return data.clients;
  }

  static async archiveClient(clientId) {
    return this.updateClient(clientId, { archived: true });
  }

  static async getClients(includeArchived = false) {
    const data = await this.getFreelancerData();
    return includeArchived ? data.clients : data.clients.filter(c => !c.archived);
  }

  // ─── PROJECT MANAGEMENT ────────────────────────────────────────────
  static async addProject(project) {
    const data = await this.getFreelancerData();
    const newProject = {
      id: Date.now().toString(),
      name: project.name,
      clientId: project.clientId || 'personal',
      hourlyRate: project.hourlyRate || null,
      color: project.color || '#FF00FF',
      description: project.description || '',
      archived: false,
      createdAt: Date.now()
    };
    data.billableProjects.push(newProject);
    await this.saveFreelancerData(data);
    return newProject;
  }

  static async updateProject(projectId, updates) {
    const data = await this.getFreelancerData();
    const project = data.billableProjects.find(p => p.id === projectId);
    if (project) {
      Object.assign(project, updates);
      await this.saveFreelancerData(data);
    }
    return data.billableProjects;
  }

  static async getProjects(clientId = null, includeArchived = false) {
    const data = await this.getFreelancerData();
    let projects = includeArchived ? data.billableProjects : data.billableProjects.filter(p => !p.archived);
    if (clientId) {
      projects = projects.filter(p => p.clientId === clientId);
    }
    return projects;
  }

  // ─── BILLABLE SESSION TRACKING ─────────────────────────────────────
  static async startBillableSession(projectId, description = '') {
    const data = await this.getFreelancerData();
    const project = data.billableProjects.find(p => p.id === projectId);

    if (!project) {
      return { success: false, error: 'Project not found' };
    }

    // End any existing session first
    if (this.currentBillableSession) {
      await this.endBillableSession();
    }

    this.currentBillableSession = {
      projectId,
      clientId: project.clientId,
      startTime: Date.now(),
      description
    };

    data.currentBillableSession = this.currentBillableSession;
    await this.saveFreelancerData(data);

    console.log(`[ZENFLOW] Billable session started: ${project.name}`);
    return { success: true, session: this.currentBillableSession };
  }

  static async endBillableSession(description = null) {
    if (!this.currentBillableSession) {
      const data = await this.getFreelancerData();
      if (data.currentBillableSession) {
        this.currentBillableSession = data.currentBillableSession;
      } else {
        return { success: false, error: 'No active billable session' };
      }
    }

    const endTime = Date.now();
    const seconds = Math.round((endTime - this.currentBillableSession.startTime) / 1000);

    // Only save if more than 60 seconds
    if (seconds >= 60) {
      await this.recordBillableTime(
        this.currentBillableSession.projectId,
        this.currentBillableSession.clientId,
        this.currentBillableSession.startTime,
        endTime,
        seconds,
        description || this.currentBillableSession.description
      );
    }

    const session = { ...this.currentBillableSession, endTime, seconds };
    this.currentBillableSession = null;

    const data = await this.getFreelancerData();
    data.currentBillableSession = null;
    await this.saveFreelancerData(data);

    console.log(`[ZENFLOW] Billable session ended: ${Math.round(seconds / 60)} minutes`);
    return { success: true, session };
  }

  static async recordBillableTime(projectId, clientId, startTime, endTime, seconds, description) {
    const data = await this.getFreelancerData();
    const today = new Date().toISOString().split('T')[0];

    if (!data.billableSessions[today]) {
      data.billableSessions[today] = [];
    }

    const session = {
      id: Date.now().toString(),
      projectId,
      clientId,
      startTime,
      endTime,
      seconds,
      description: description || '',
      billable: true,
      invoiced: false,
      invoiceId: null
    };

    data.billableSessions[today].push(session);

    // Update earnings
    await this.updateEarnings(data);

    // Clean old data (keep 365 days)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 365);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    Object.keys(data.billableSessions).forEach(date => {
      if (date < cutoffStr) {
        delete data.billableSessions[date];
      }
    });

    await this.saveFreelancerData(data);
    return session;
  }

  static async updateEarnings(data = null) {
    if (!data) {
      data = await this.getFreelancerData();
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Calculate date ranges
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    let todayEarnings = 0;
    let weekEarnings = 0;
    let monthEarnings = 0;

    // Process all sessions
    for (const [date, sessions] of Object.entries(data.billableSessions)) {
      const dateObj = new Date(date);

      for (const session of sessions) {
        if (!session.billable) continue;

        const hours = session.seconds / 3600;
        const rate = this.getHourlyRate(data, session.projectId, session.clientId);
        const earnings = hours * rate;

        if (date === todayStr) {
          todayEarnings += earnings;
        }
        if (dateObj >= weekStart) {
          weekEarnings += earnings;
        }
        if (dateObj >= monthStart) {
          monthEarnings += earnings;
        }
      }
    }

    // Add current session if active
    if (this.currentBillableSession || data.currentBillableSession) {
      const activeSession = this.currentBillableSession || data.currentBillableSession;
      const currentSeconds = Math.round((Date.now() - activeSession.startTime) / 1000);
      const hours = currentSeconds / 3600;
      const rate = this.getHourlyRate(data, activeSession.projectId, activeSession.clientId);
      const currentEarnings = hours * rate;

      todayEarnings += currentEarnings;
      weekEarnings += currentEarnings;
      monthEarnings += currentEarnings;
    }

    data.todayEarnings = Math.round(todayEarnings * 100) / 100;
    data.weekEarnings = Math.round(weekEarnings * 100) / 100;
    data.monthEarnings = Math.round(monthEarnings * 100) / 100;

    return {
      today: data.todayEarnings,
      week: data.weekEarnings,
      month: data.monthEarnings,
      currency: data.currency
    };
  }

  static getHourlyRate(data, projectId, clientId) {
    // Priority: Project rate > Client rate > Default rate
    const project = data.billableProjects.find(p => p.id === projectId);
    if (project?.hourlyRate) return project.hourlyRate;

    const client = data.clients.find(c => c.id === clientId);
    if (client?.hourlyRate) return client.hourlyRate;

    return data.defaultHourlyRate || 50;
  }

  // ─── EARNINGS & STATS ──────────────────────────────────────────────
  static async getLiveEarnings() {
    const data = await this.getFreelancerData();
    return await this.updateEarnings(data);
  }

  static async getTodayBillableStats() {
    const data = await this.getFreelancerData();
    const today = new Date().toISOString().split('T')[0];
    const sessions = data.billableSessions[today] || [];

    const totalSeconds = sessions.reduce((sum, s) => sum + (s.billable ? s.seconds : 0), 0);

    // Group by project
    const byProject = {};
    for (const session of sessions) {
      if (!byProject[session.projectId]) {
        const project = data.billableProjects.find(p => p.id === session.projectId);
        byProject[session.projectId] = {
          projectId: session.projectId,
          projectName: project?.name || 'Unknown',
          clientId: session.clientId,
          totalSeconds: 0,
          sessions: [],
          earnings: 0
        };
      }
      byProject[session.projectId].totalSeconds += session.seconds;
      byProject[session.projectId].sessions.push(session);

      const rate = this.getHourlyRate(data, session.projectId, session.clientId);
      byProject[session.projectId].earnings += (session.seconds / 3600) * rate;
    }

    // Add current session if active
    let currentSessionInfo = null;
    if (this.currentBillableSession || data.currentBillableSession) {
      const activeSession = this.currentBillableSession || data.currentBillableSession;
      const currentSeconds = Math.round((Date.now() - activeSession.startTime) / 1000);
      const rate = this.getHourlyRate(data, activeSession.projectId, activeSession.clientId);
      const project = data.billableProjects.find(p => p.id === activeSession.projectId);

      currentSessionInfo = {
        ...activeSession,
        currentSeconds,
        currentEarnings: Math.round((currentSeconds / 3600) * rate * 100) / 100,
        projectName: project?.name || 'Unknown',
        hourlyRate: rate
      };
    }

    return {
      date: today,
      totalSeconds,
      totalHours: Math.round(totalSeconds / 3600 * 100) / 100,
      sessions,
      byProject: Object.values(byProject),
      currentSession: currentSessionInfo,
      earnings: await this.updateEarnings(data)
    };
  }

  static async getWeeklyBillableStats() {
    const data = await this.getFreelancerData();
    const weekData = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

      const sessions = data.billableSessions[dateStr] || [];
      let totalSeconds = 0;
      let earnings = 0;

      for (const session of sessions) {
        if (session.billable) {
          totalSeconds += session.seconds;
          const rate = this.getHourlyRate(data, session.projectId, session.clientId);
          earnings += (session.seconds / 3600) * rate;
        }
      }

      weekData.push({
        date: dateStr,
        dayName,
        totalHours: Math.round(totalSeconds / 3600 * 100) / 100,
        earnings: Math.round(earnings * 100) / 100
      });
    }

    const totals = weekData.reduce((acc, d) => ({
      hours: acc.hours + d.totalHours,
      earnings: acc.earnings + d.earnings
    }), { hours: 0, earnings: 0 });

    return {
      days: weekData,
      totals: {
        hours: Math.round(totals.hours * 100) / 100,
        earnings: Math.round(totals.earnings * 100) / 100
      },
      currency: data.currency
    };
  }

  // ─── SETTINGS ──────────────────────────────────────────────────────
  static async updateSettings(settings) {
    const data = await this.getFreelancerData();
    if (settings.defaultHourlyRate !== undefined) data.defaultHourlyRate = settings.defaultHourlyRate;
    if (settings.currency !== undefined) data.currency = settings.currency;
    if (settings.enabled !== undefined) data.enabled = settings.enabled;
    await this.saveFreelancerData(data);
    return data;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// WELLNESS MANAGER - Break & Health Reminders
// ═══════════════════════════════════════════════════════════════════════════════

class WellnessManager {
  static async getWellnessData() {
    const { wellness } = await StorageManager.get(['wellness']);
    return { ...DEFAULT_STORAGE.wellness, ...wellness };
  }

  static async saveWellnessData(data) {
    await StorageManager.set({ wellness: data });
  }

  static isWithinWorkingHours(wellness) {
    const now = new Date();
    const hour = now.getHours();
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;

    if (isWeekend && !wellness.weekendReminders) return false;
    return hour >= wellness.workingHoursStart && hour < wellness.workingHoursEnd;
  }

  static async checkReminders() {
    const wellness = await this.getWellnessData();
    if (!wellness.enabled || !this.isWithinWorkingHours(wellness)) return [];

    const notifications = [];
    const now = Date.now();

    // Break reminder
    if (wellness.breakReminders) {
      const breakInterval = wellness.breakIntervalMinutes * 60 * 1000;
      if (!wellness.lastBreakTime || (now - wellness.lastBreakTime) > breakInterval) {
        notifications.push({
          type: 'break',
          title: '⏸️ Time for a Break',
          message: 'You\'ve been working for a while. Take a 5-minute break to recharge!',
          icon: '☕'
        });
      }
    }

    // Hydration reminder
    if (wellness.hydrationReminders) {
      const hydrationInterval = wellness.hydrationIntervalMinutes * 60 * 1000;
      if (!wellness.lastHydrationTime || (now - wellness.lastHydrationTime) > hydrationInterval) {
        notifications.push({
          type: 'hydration',
          title: '💧 Stay Hydrated',
          message: 'Remember to drink some water! Hydration improves focus.',
          icon: '💧'
        });
      }
    }

    // Eye strain reminder (20-20-20 rule)
    if (wellness.eyeStrainReminders) {
      const eyeStrainInterval = wellness.eyeStrainIntervalMinutes * 60 * 1000;
      if (!wellness.lastEyeStrainTime || (now - wellness.lastEyeStrainTime) > eyeStrainInterval) {
        notifications.push({
          type: 'eyeStrain',
          title: '👁️ Rest Your Eyes',
          message: 'Look at something 20 feet away for 20 seconds to reduce eye strain.',
          icon: '👁️'
        });
      }
    }

    // Stretch reminder
    if (wellness.stretchReminders) {
      const stretchInterval = wellness.stretchIntervalMinutes * 60 * 1000;
      if (!wellness.lastStretchTime || (now - wellness.lastStretchTime) > stretchInterval) {
        notifications.push({
          type: 'stretch',
          title: '🧘 Stretch Break',
          message: 'Time to stretch! Roll your shoulders and stretch your back.',
          icon: '🧘'
        });
      }
    }

    return notifications;
  }

  static async markReminderDone(type) {
    const wellness = await this.getWellnessData();
    const now = Date.now();

    switch (type) {
      case 'break':
        wellness.lastBreakTime = now;
        wellness.dailyBreaksTaken = (wellness.dailyBreaksTaken || 0) + 1;
        break;
      case 'hydration':
        wellness.lastHydrationTime = now;
        break;
      case 'eyeStrain':
        wellness.lastEyeStrainTime = now;
        break;
      case 'stretch':
        wellness.lastStretchTime = now;
        break;
    }

    await this.saveWellnessData(wellness);
    return wellness;
  }

  static async updateSettings(settings) {
    const wellness = await this.getWellnessData();
    Object.assign(wellness, settings);
    await this.saveWellnessData(wellness);
    return wellness;
  }

  static async resetDaily() {
    const wellness = await this.getWellnessData();
    wellness.dailyBreaksTaken = 0;
    wellness.lastBreakTime = null;
    wellness.lastHydrationTime = null;
    wellness.lastEyeStrainTime = null;
    wellness.lastStretchTime = null;
    await this.saveWellnessData(wellness);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIBE MODE MANAGER - Theme & Ambient System
// ═══════════════════════════════════════════════════════════════════════════════

class VibeModeManager {
  static async getVibeMode() {
    const { vibeMode } = await StorageManager.get(['vibeMode']);
    return { ...DEFAULT_STORAGE.vibeMode, ...vibeMode };
  }

  static async saveVibeMode(data) {
    await StorageManager.set({ vibeMode: data });
  }

  static async setVibe(vibeName) {
    const vibeMode = await this.getVibeMode();
    if (vibeMode.available.includes(vibeName)) {
      vibeMode.current = vibeName;
      await this.saveVibeMode(vibeMode);
      return { success: true, vibe: vibeName };
    }
    return { success: false, error: 'Invalid vibe mode' };
  }

  static async setAmbientSound(soundName, volume = null) {
    const vibeMode = await this.getVibeMode();
    vibeMode.ambientSound = soundName;
    if (volume !== null) vibeMode.ambientVolume = volume;
    await this.saveVibeMode(vibeMode);
    return vibeMode;
  }

  static async setCustomColors(colors) {
    const vibeMode = await this.getVibeMode();
    vibeMode.customColors = { ...vibeMode.customColors, ...colors };
    await this.saveVibeMode(vibeMode);
    return vibeMode;
  }

  static getVibeTheme(vibeName) {
    const themes = {
      'cyberpunk': {
        primary: '#00F3FF',
        secondary: '#FF00FF',
        background: '#0A0A0F',
        surface: '#1A1A2E',
        text: '#E0E0E0',
        accent: '#00FF88'
      },
      'lofi': {
        primary: '#E8B4BC',
        secondary: '#957DAD',
        background: '#2D2D3A',
        surface: '#3D3D4A',
        text: '#F5E6E8',
        accent: '#D4A5A5'
      },
      'minimal-dark': {
        primary: '#FFFFFF',
        secondary: '#888888',
        background: '#0D0D0D',
        surface: '#1A1A1A',
        text: '#E5E5E5',
        accent: '#3B82F6'
      },
      'synthwave': {
        primary: '#FF6AD5',
        secondary: '#C774E8',
        background: '#1A0A2E',
        surface: '#2D1B4E',
        text: '#E0D4F7',
        accent: '#AD8CFF'
      },
      'forest': {
        primary: '#4ADE80',
        secondary: '#22C55E',
        background: '#0F1A0F',
        surface: '#1A2F1A',
        text: '#D4F4D4',
        accent: '#86EFAC'
      },
      'ocean': {
        primary: '#38BDF8',
        secondary: '#0EA5E9',
        background: '#0A1929',
        surface: '#132F4C',
        text: '#B8E3FF',
        accent: '#7DD3FC'
      }
    };
    return themes[vibeName] || themes['cyberpunk'];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI INSIGHT MANAGER - Local AI with Fallbacks
// ═══════════════════════════════════════════════════════════════════════════════

class AIInsightManager {
  static insightPool = [
    // Focus insights
    "Your focus patterns show peak productivity in the morning. Consider scheduling deep work before noon.",
    "You've been crushing it! Your focus time is up 23% this week compared to last week.",
    "Taking regular breaks actually boosts productivity. Your 52/17 rhythm is on point.",
    "Studies show the first hour after waking is prime time for creative work. Use it wisely.",
    "Your brain consolidates learning during rest. Those short breaks are making you smarter.",

    // Task insights
    "Breaking big tasks into smaller chunks reduces overwhelm and increases completion rates by 40%.",
    "You complete more high-priority tasks when you tackle them first thing. Keep that momentum!",
    "The two-minute rule: if it takes less than 2 minutes, do it now. Your task queue will thank you.",
    "Batch similar tasks together to reduce context switching. Your focus will thank you.",
    "Celebrate small wins. Each completed task releases dopamine and fuels the next one.",

    // Wellness insights
    "Hydration affects cognitive performance. A 2% drop in hydration can decrease focus by 25%.",
    "The 20-20-20 rule: Every 20 mins, look at something 20 feet away for 20 seconds. Your eyes will thank you.",
    "Micro-movements every hour boost blood flow to the brain by 15%. Stand, stretch, dominate.",
    "Blue light exposure before sleep affects melatonin. Consider winding down screen time after 9 PM.",
    "Deep breathing activates the parasympathetic nervous system. 3 deep breaths can reset your focus.",

    // Productivity insights
    "Your most productive days correlate with early morning focus sessions. The grind respects the early bird.",
    "You've blocked more distractions this week. Your discipline is leveling up.",
    "Flow state typically kicks in after 23 minutes of uninterrupted work. Protect that runway.",
    "Music between 50-80 BPM can enhance focus. Lo-fi beats aren't just vibes—they're science.",
    "Your streak is building neural pathways for discipline. Every day counts.",

    // Motivational insights
    "Neural-link status: OPTIMAL. You're operating at peak efficiency today.",
    "SKYNET analysis complete: Your productivity signature is in the top 10% of operators.",
    "System diagnostics show green across all metrics. You're dialed in.",
    "Your focus consistency is building compound gains. Trust the process.",
    "Every session is training your brain for excellence. The grind is the path."
  ];

  static async getInsight() {
    try {
      // Try window.ai (Gemini Nano) if available
      if (typeof ai !== 'undefined' && ai.languageModel) {
        return await this.getAIGeneratedInsight();
      }

      // Fallback to context-aware insights
      return await this.getContextualInsight();
    } catch (error) {
      console.log('[ZENFLOW] AI insight fallback:', error.message);
      return this.getRandomInsight();
    }
  }

  static async getAIGeneratedInsight() {
    try {
      const session = await ai.languageModel.create({
        systemPrompt: "You are SKYNET, a cyberpunk productivity AI assistant. Give brief, motivating insights about focus, productivity, and wellness. Use a tech/cyber aesthetic. Keep responses under 100 words. Be encouraging but not cheesy."
      });

      const context = await this.buildContext();
      const prompt = `Based on this user's productivity data, give a personalized insight:\n${context}\n\nProvide one actionable, encouraging insight.`;

      const response = await session.prompt(prompt);
      session.destroy();

      return { insight: response.trim(), source: 'ai' };
    } catch (error) {
      console.log('[ZENFLOW] window.ai unavailable:', error.message);
      throw error;
    }
  }

  static async getContextualInsight() {
    const storage = await StorageManager.getAll();
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    // Get today's stats
    const today = now.toISOString().split('T')[0];
    const todayStats = storage.dailyStats?.[today] || { focusMinutes: 0, sessions: 0, tasksCompleted: 0 };

    // Get netrunner data
    const netrunner = storage.netrunner || {};

    // Context-based insight selection
    let insight = '';

    // Time-based insights
    if (hour >= 5 && hour < 9) {
      insight = "Early bird mode activated. Your brain is primed for deep work. Make these morning hours count.";
    } else if (hour >= 9 && hour < 12) {
      insight = "Peak cognitive hours. This is when your prefrontal cortex is firing on all cylinders. Go deep.";
    } else if (hour >= 12 && hour < 14) {
      insight = "Post-lunch dip incoming. Combat it with a short walk or light tasks before diving back in.";
    } else if (hour >= 14 && hour < 17) {
      insight = "Afternoon focus window. Your second wind is here. Time to close out those priority tasks.";
    } else if (hour >= 17 && hour < 20) {
      insight = "Evening productivity zone. Good for creative work and planning tomorrow's missions.";
    } else if (hour >= 20 || hour < 5) {
      insight = "Night owl operations. If you're working late, keep sessions short and scheduled.";
    }

    // Override with achievement-based insights
    if (todayStats.focusMinutes >= 120) {
      insight = `2+ hours of focus today! That's elite-level discipline. Your neural pathways are strengthening.`;
    }
    if (todayStats.tasksCompleted >= 5) {
      insight = `${todayStats.tasksCompleted} tasks completed today. You're in flow state. Keep the momentum rolling.`;
    }
    if (netrunner.currentStreak >= 7) {
      insight = `${netrunner.currentStreak}-day streak! You're building unstoppable habits. The compound effect is real.`;
    }
    if (netrunner.level >= 10) {
      insight = `Level ${netrunner.level} operator detected. Your productivity signature is in elite territory.`;
    }

    // Weekend insights
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      if (todayStats.focusMinutes > 0) {
        insight = "Weekend warrior mode! Working on your days off shows serious commitment to the mission.";
      }
    }

    return { insight: insight || this.getRandomInsight().insight, source: 'contextual' };
  }

  static getRandomInsight() {
    const randomIndex = Math.floor(Math.random() * this.insightPool.length);
    return { insight: this.insightPool[randomIndex], source: 'random' };
  }

  static async buildContext() {
    const storage = await StorageManager.getAll();
    const today = new Date().toISOString().split('T')[0];
    const todayStats = storage.dailyStats?.[today] || {};
    const netrunner = storage.netrunner || {};

    return `
Focus Time Today: ${todayStats.focusMinutes || 0} minutes
Tasks Completed Today: ${todayStats.tasksCompleted || 0}
Current Level: ${netrunner.level || 1}
Current Streak: ${netrunner.currentStreak || 0} days
Current Hour: ${new Date().getHours()}
Day: ${new Date().toLocaleDateString('en-US', { weekday: 'long' })}
    `.trim();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTO-REFRESH / PAGE MONITOR MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

class AutoRefreshManager {
  static activeRefreshes = new Map(); // tabId -> { alarmName, url, seconds, options, lastContent }

  static async startRefresh(tabId, url, seconds, options = {}) {
    try {
      if (!tabId || !url) {
        return { success: false, error: 'Invalid tab or URL' };
      }

      // Stop any existing refresh for this tab
      await this.stopRefresh(tabId);

      const alarmName = `SKYNET_AUTO_REFRESH_${tabId}`;

      // Create alarm for periodic refresh
      await chrome.alarms.create(alarmName, {
        periodInMinutes: seconds / 60
      });

      // Store state
      this.activeRefreshes.set(tabId, {
        alarmName,
        url,
        seconds,
        options,
        startedAt: Date.now(),
        lastContent: null
      });

      // Save to storage for persistence
      await this.saveState();

      console.log(`[ZENFLOW] Auto-refresh started for tab ${tabId}: ${url} every ${seconds}s`);
      return { success: true };
    } catch (error) {
      console.error('[ZENFLOW] Failed to start auto-refresh:', error);
      return { success: false, error: error.message };
    }
  }

  static async stopRefresh(tabId) {
    try {
      const refreshData = this.activeRefreshes.get(tabId);
      if (refreshData) {
        await chrome.alarms.clear(refreshData.alarmName);
        this.activeRefreshes.delete(tabId);
        await this.saveState();
        console.log(`[ZENFLOW] Auto-refresh stopped for tab ${tabId}`);
      }
      return { success: true };
    } catch (error) {
      console.error('[ZENFLOW] Failed to stop auto-refresh:', error);
      return { success: false, error: error.message };
    }
  }

  static async handleAlarm(alarmName) {
    // Find the tab for this alarm
    for (const [tabId, data] of this.activeRefreshes.entries()) {
      if (data.alarmName === alarmName) {
        await this.refreshTab(tabId, data);
        break;
      }
    }
  }

  static async refreshTab(tabId, data) {
    try {
      // Check if tab still exists
      const tab = await chrome.tabs.get(tabId).catch(() => null);
      if (!tab) {
        // Tab was closed, clean up
        await this.stopRefresh(tabId);
        return;
      }

      // Get current page content for change detection if enabled
      let contentChanged = false;
      if (data.options.notifyOnChange || data.options.soundOnChange) {
        try {
          const [result] = await chrome.scripting.executeScript({
            target: { tabId },
            func: () => document.body.innerText.substring(0, 5000)
          });

          if (data.lastContent !== null && result?.result !== data.lastContent) {
            contentChanged = true;
          }
          data.lastContent = result?.result || null;
          this.activeRefreshes.set(tabId, data);
        } catch (e) {
          console.log('[ZENFLOW] Cannot check content change:', e.message);
        }
      }

      // Refresh the tab
      await chrome.tabs.reload(tabId);

      // Notify if content changed
      if (contentChanged) {
        if (data.options.notifyOnChange) {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'images/icon128.png',
            title: 'Page Changed!',
            message: `Content updated on: ${data.url.substring(0, 50)}...`,
            priority: 2
          });
        }

        if (data.options.soundOnChange) {
          await OffscreenManager.playSound('alert', 0.5);
        }
      }

      console.log(`[ZENFLOW] Tab ${tabId} refreshed${contentChanged ? ' (content changed!)' : ''}`);
    } catch (error) {
      console.error('[ZENFLOW] Failed to refresh tab:', error);
      // Tab might be closed or invalid
      if (error.message.includes('No tab') || error.message.includes('Invalid tab')) {
        await this.stopRefresh(tabId);
      }
    }
  }

  static async getStatus() {
    const active = [];
    for (const [tabId, data] of this.activeRefreshes.entries()) {
      active.push({
        tabId,
        url: data.url,
        seconds: data.seconds,
        startedAt: data.startedAt
      });
    }
    return { active };
  }

  static async saveState() {
    const active = {};
    for (const [tabId, data] of this.activeRefreshes.entries()) {
      active[tabId] = {
        url: data.url,
        seconds: data.seconds,
        options: data.options,
        startedAt: data.startedAt
      };
    }
    await StorageManager.set({ autoRefreshActive: active });
  }

  static async restoreState() {
    try {
      const { autoRefreshActive } = await StorageManager.get(['autoRefreshActive']);
      if (autoRefreshActive) {
        for (const [tabId, data] of Object.entries(autoRefreshActive)) {
          // Check if tab still exists
          const tab = await chrome.tabs.get(parseInt(tabId)).catch(() => null);
          if (tab) {
            await this.startRefresh(parseInt(tabId), data.url, data.seconds, data.options || {});
          }
        }
      }
    } catch (e) {
      console.error('[ZENFLOW] Error restoring auto-refresh state:', e);
    }
  }

  static async cleanupClosedTabs() {
    for (const [tabId, data] of this.activeRefreshes.entries()) {
      const tab = await chrome.tabs.get(tabId).catch(() => null);
      if (!tab) {
        await this.stopRefresh(tabId);
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

class TaskManager {
  static async addTask(task) {
    const tasks = await StorageManager.getTasks();
    const newTask = {
      id: Date.now().toString(),
      // Support both 'title' (popup/newtab) and 'text' (legacy) for compatibility
      title: task.title || task.text || '',
      text: task.title || task.text || '', // Keep for backward compatibility
      completed: false,
      priority: task.priority || 'medium',
      projectId: task.projectId || 'inbox',
      dueDate: task.dueDate || null,
      createdAt: Date.now(),
      completedAt: null,
      tags: task.tags || []
    };
    tasks.unshift(newTask);
    await StorageManager.setTasks(tasks);
    console.log('[ZENFLOW] Task added:', newTask.title);
    return newTask;
  }

  static async completeTask(taskId) {
    const tasks = await StorageManager.getTasks();
    const task = tasks.find(t => t.id === taskId);

    if (task && !task.completed) {
      task.completed = true;
      task.completedAt = Date.now();
      await StorageManager.setTasks(tasks);

      // Award XP
      await FocusLockSystem.awardXP(GAMIFICATION.XP_PER_TASK_COMPLETE);

      // Update netrunner stats
      const netrunner = await StorageManager.getNetrunner();
      netrunner.totalTasksCompleted += 1;
      await StorageManager.setNetrunner(netrunner);

      // Update daily stats
      const today = new Date().toISOString().split('T')[0];
      const dailyStats = await StorageManager.getDailyStats();
      const todayStats = dailyStats[today] || { focusMinutes: 0, sessions: 0, tasksCompleted: 0, distractionsBlocked: 0 };
      todayStats.tasksCompleted += 1;
      await StorageManager.updateDailyStats(today, todayStats);
    }

    return tasks;
  }

  static async deleteTask(taskId) {
    const tasks = await StorageManager.getTasks();
    const filtered = tasks.filter(t => t.id !== taskId);
    await StorageManager.setTasks(filtered);
    return filtered;
  }

  static async updateTask(taskId, updates) {
    const tasks = await StorageManager.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      Object.assign(task, updates);
      await StorageManager.setTasks(tasks);
    }
    return tasks;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BLOCKED SITES MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

class BlockedSitesManager {
  static async addSite(site) {
    const blockedSites = await StorageManager.getBlockedSites();
    const cleanSite = site.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].toLowerCase();

    if (!blockedSites.custom.includes(cleanSite) && !blockedSites.defaults.includes(cleanSite)) {
      blockedSites.custom.push(cleanSite);
      await StorageManager.set({ blockedSites });

      // If focus is active, update DNR rules
      const focus = await StorageManager.getFocus();
      if (focus.active) {
        const allSites = [...new Set([...blockedSites.defaults, ...blockedSites.custom])];
        await DNRManager.enableBlocking(allSites);
      }

      return { success: true, site: cleanSite };
    }

    return { success: false, error: 'Site already blocked' };
  }

  static async removeSite(site) {
    const focus = await StorageManager.getFocus();

    if (focus.active && focus.locked) {
      return { success: false, error: 'Cannot modify blocklist during locked focus' };
    }

    const blockedSites = await StorageManager.getBlockedSites();
    blockedSites.custom = blockedSites.custom.filter(s => s.toLowerCase() !== site.toLowerCase());
    await StorageManager.set({ blockedSites });

    return { success: true };
  }

  static async resetToDefaults() {
    const focus = await StorageManager.getFocus();

    if (focus.active && focus.locked) {
      return { success: false, error: 'Cannot reset during locked focus' };
    }

    await StorageManager.set({
      blockedSites: {
        defaults: DEFAULT_BLOCKED_SITES,
        custom: [],
        probation: []
      }
    });

    return { success: true };
  }

  static async getAllSites() {
    const blockedSites = await StorageManager.getBlockedSites();
    const allSites = [...new Set([...(blockedSites.defaults || DEFAULT_BLOCKED_SITES), ...(blockedSites.custom || [])])];
    return {
      defaultSites: blockedSites.defaults || DEFAULT_BLOCKED_SITES,
      customSites: blockedSites.custom || [],
      allSites: allSites,
      // Backward compatibility
      defaults: blockedSites.defaults || DEFAULT_BLOCKED_SITES,
      custom: blockedSites.custom || [],
      all: allSites
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ALARM HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log(`[ZENFLOW] Alarm: ${alarm.name}`);

  switch (alarm.name) {
    case ALARMS.FOCUS_END:
      await FocusLockSystem.endFocus('timer');
      break;

    case ALARMS.BADGE_UPDATE:
      await FocusLockSystem.updateBadge();
      break;

    case ALARMS.KEEP_ALIVE:
      // Keep service worker alive
      console.log('[ZENFLOW] Keep-alive ping');
      break;

    case ALARMS.RECOVERY_CHECK:
      await FocusLockSystem.recoveryCheck();
      break;

    case ALARMS.STREAK_CHECK:
      await StreakManager.checkAndUpdateStreak();
      break;

    case ALARMS.TIME_TRACKING_SAVE:
      // Periodic save of current session
      if (TimeTracker.currentSession) {
        const duration = Math.round((Date.now() - TimeTracker.currentSession.startTime) / 1000);
        if (duration >= 60) {
          // Save progress every 5 minutes
          await TimeTracker.recordTime(
            TimeTracker.currentSession.domain,
            duration,
            TimeTracker.currentSession.category
          );
          TimeTracker.currentSession.startTime = Date.now();
        }
      }
      break;

    case ALARMS.GOAL_CHECK:
      // Check if any goals have been exceeded
      const goalNotifications = await TimeTracker.checkGoals();
      for (const notif of goalNotifications) {
        await FocusLockSystem.showNotification(notif.title, notif.message);
      }
      break;

    case ALARMS.WELLNESS_CHECK:
      // Check for wellness reminders
      const wellnessNotifications = await WellnessManager.checkReminders();
      if (wellnessNotifications.length > 0) {
        // Show first notification
        const notif = wellnessNotifications[0];
        await FocusLockSystem.showNotification(notif.title, notif.message);
      }
      break;

    case ALARMS.EARNINGS_UPDATE:
      // Update live earnings calculation
      await FreelancerTracker.updateEarnings();
      break;

    default:
      // Handle auto-refresh alarms
      if (alarm.name.startsWith('SKYNET_AUTO_REFRESH_')) {
        await AutoRefreshManager.handleAlarm(alarm.name);
      }
      break;
  }
});

// Tab closed listener - clean up auto-refresh
chrome.tabs.onRemoved.addListener(async (tabId) => {
  await AutoRefreshManager.stopRefresh(tabId);
});

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGE HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle offscreen messages
  if (request.target === 'offscreen') return;

  (async () => {
    try {
      switch (request.action) {
        // ─── PING (keep-alive / wake-up) ───────────────────────────────
        case 'ping':
          sendResponse({ status: 'alive', timestamp: Date.now() });
          break;

        // ─── FOCUS ─────────────────────────────────────────────────────
        case 'startFocus':
          const focusOptions = request.options || {};
          // Support locked parameter at top level or in options
          if (request.locked !== undefined) focusOptions.locked = request.locked;
          sendResponse(await FocusLockSystem.startFocus(request.duration, focusOptions));
          break;

        case 'endFocus':
          sendResponse(await FocusLockSystem.endFocus(request.reason));
          break;

        case 'getFocusStatus':
          const focus = await StorageManager.getFocus();
          const timeInfo = await FocusLockSystem.getRemainingTime();
          sendResponse({ ...focus, ...timeInfo });
          break;

        case 'getRemainingTime':
          sendResponse(await FocusLockSystem.getRemainingTime());
          break;

        // ─── TASKS ────────────────────────────────────────────────────
        case 'getTasks':
          sendResponse(await StorageManager.getTasks());
          break;

        case 'addTask':
          sendResponse(await TaskManager.addTask(request.task));
          break;

        case 'completeTask':
          sendResponse(await TaskManager.completeTask(request.taskId));
          break;

        case 'deleteTask':
          sendResponse(await TaskManager.deleteTask(request.taskId));
          break;

        case 'updateTask':
          sendResponse(await TaskManager.updateTask(request.taskId, request.updates));
          break;

        case 'saveTasks':
          await StorageManager.setTasks(request.tasks);
          sendResponse({ success: true });
          break;

        // ─── BLOCKED SITES ────────────────────────────────────────────
        case 'getBlockedSites':
          sendResponse(await BlockedSitesManager.getAllSites());
          break;

        case 'addBlockedSite':
          sendResponse(await BlockedSitesManager.addSite(request.site));
          break;

        case 'removeBlockedSite':
          sendResponse(await BlockedSitesManager.removeSite(request.site));
          break;

        case 'resetBlockedSites':
          sendResponse(await BlockedSitesManager.resetToDefaults());
          break;

        case 'logBlockedAttempt':
          await FocusLockSystem.incrementBlockedAttempt(request.site);
          sendResponse({ success: true });
          break;

        // ─── GAMIFICATION ─────────────────────────────────────────────
        case 'getNetrunner':
          sendResponse(await StorageManager.getNetrunner());
          break;

        case 'awardXP':
          await FocusLockSystem.awardXP(request.amount || 0);
          sendResponse({ success: true });
          break;

        case 'getProductivityScore':
          sendResponse(await ProductivityCalculator.calculateScore());
          break;

        // ─── STATS ────────────────────────────────────────────────────
        case 'getDailyStats':
          sendResponse(await StorageManager.getDailyStats());
          break;

        case 'getStreak':
          sendResponse(await StreakManager.getStreak());
          break;

        case 'getSessions':
          sendResponse(await StorageManager.getSessions());
          break;

        case 'getDistractionLog':
          const { distractionLog } = await StorageManager.get(['distractionLog']);
          sendResponse(distractionLog || []);
          break;

        // ─── SETTINGS ─────────────────────────────────────────────────
        case 'getSettings':
          sendResponse(await StorageManager.getSettings());
          break;

        case 'saveSettings':
          const currentSettings = await StorageManager.getSettings();
          await StorageManager.set({ settings: { ...currentSettings, ...request.settings } });
          sendResponse({ success: true });
          break;

        // ─── AUDIO ────────────────────────────────────────────────────
        case 'playSound':
          await OffscreenManager.playSound(request.soundType, request.volume);
          sendResponse({ success: true });
          break;

        case 'stopSound':
          await OffscreenManager.stopSound();
          sendResponse({ success: true });
          break;

        case 'setVolume':
          await OffscreenManager.setVolume(request.volume);
          sendResponse({ success: true });
          break;

        // ─── PROJECTS ─────────────────────────────────────────────────
        case 'getProjects':
          const { projects } = await StorageManager.get(['projects']);
          sendResponse(projects || DEFAULT_STORAGE.projects);
          break;

        case 'saveProjects':
          await StorageManager.set({ projects: request.projects });
          sendResponse({ success: true });
          break;

        // ─── QUICK LINKS ──────────────────────────────────────────────
        case 'getQuickLinks':
          const { quickLinks } = await StorageManager.get(['quickLinks']);
          sendResponse(quickLinks || DEFAULT_STORAGE.quickLinks);
          break;

        case 'saveQuickLinks':
          await StorageManager.set({ quickLinks: request.links });
          sendResponse({ success: true });
          break;

        // ─── NOTES ────────────────────────────────────────────────────
        case 'getNotes':
          const { notes } = await StorageManager.get(['notes']);
          sendResponse(notes || []);
          break;

        case 'saveNotes':
          await StorageManager.set({ notes: request.notes });
          sendResponse({ success: true });
          break;

        // ─── INTEGRATIONS ─────────────────────────────────────────────
        case 'getIntegrations':
          const { integrations } = await StorageManager.get(['integrations']);
          sendResponse(integrations || DEFAULT_STORAGE.integrations);
          break;

        case 'saveIntegrations':
          await StorageManager.set({ integrations: request.integrations });
          sendResponse({ success: true });
          break;

        // ─── MISC ─────────────────────────────────────────────────────
        case 'getAll':
          sendResponse(await StorageManager.getAll());
          break;

        case 'exportData':
          const allData = await StorageManager.getAll();
          sendResponse({ success: true, data: allData });
          break;

        case 'importData':
          await StorageManager.set(request.data);
          sendResponse({ success: true });
          break;

        // ─── TIME TRACKING ────────────────────────────────────────────
        case 'getTimeTrackingStats':
          const timeStats = await TimeTracker.getTodayStats();
          sendResponse(timeStats);
          break;

        case 'getWeeklyTimeStats':
          const weekStats = await TimeTracker.getWeeklyStats();
          sendResponse(weekStats);
          break;

        case 'getTimeInsights':
          const insights = await TimeTracker.getInsights();
          sendResponse(insights);
          break;

        case 'setTimeGoal':
          await TimeTracker.setGoal(request.category, request.maxMinutes);
          sendResponse({ success: true });
          break;

        case 'getTimeTracking':
          const timeTrackingData = await TimeTracker.getTimeTracking();
          sendResponse(timeTrackingData);
          break;

        case 'resetTimeTracking':
          await TimeTracker.saveTimeTracking({
            ...DEFAULT_STORAGE.timeTracking,
            sessions: {},
            goals: (await TimeTracker.getTimeTracking()).goals
          });
          sendResponse({ success: true });
          break;

        // ─── FLOATING NOTES ────────────────────────────────────────────
        case 'getFloatingNotes':
          const { floatingNotes } = await StorageManager.get(['floatingNotes']);
          sendResponse(floatingNotes || []);
          break;

        case 'saveFloatingNotes':
          await StorageManager.set({ floatingNotes: request.notes });
          sendResponse({ success: true });
          break;

        case 'toggleFloatingNotesOnTab':
          try {
            const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (activeTab && activeTab.id && !activeTab.url.startsWith('chrome://')) {
              await chrome.tabs.sendMessage(activeTab.id, { action: 'toggleFloatingNotes' });
              sendResponse({ success: true });
            } else {
              sendResponse({ success: false, error: 'Cannot toggle on this page' });
            }
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;

        case 'addFloatingNoteOnTab':
          try {
            const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (currentTab && currentTab.id && !currentTab.url.startsWith('chrome://')) {
              await chrome.tabs.sendMessage(currentTab.id, { action: 'addFloatingNote' });
              sendResponse({ success: true });
            } else {
              sendResponse({ success: false, error: 'Cannot add note on this page' });
            }
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;

        // ─── FREELANCER BILLING ──────────────────────────────────────────
        case 'getFreelancerData':
          sendResponse(await FreelancerTracker.getFreelancerData());
          break;

        case 'getLiveEarnings':
          sendResponse(await FreelancerTracker.getLiveEarnings());
          break;

        case 'getTodayBillableStats':
          sendResponse(await FreelancerTracker.getTodayBillableStats());
          break;

        case 'getWeeklyBillableStats':
          sendResponse(await FreelancerTracker.getWeeklyBillableStats());
          break;

        case 'startBillableSession':
          sendResponse(await FreelancerTracker.startBillableSession(request.projectId, request.description));
          break;

        case 'endBillableSession':
          sendResponse(await FreelancerTracker.endBillableSession(request.description));
          break;

        case 'addClient':
          sendResponse(await FreelancerTracker.addClient(request.client));
          break;

        case 'updateClient':
          sendResponse(await FreelancerTracker.updateClient(request.clientId, request.updates));
          break;

        case 'getClients':
          sendResponse(await FreelancerTracker.getClients(request.includeArchived));
          break;

        case 'addBillableProject':
          sendResponse(await FreelancerTracker.addProject(request.project));
          break;

        case 'updateBillableProject':
          sendResponse(await FreelancerTracker.updateProject(request.projectId, request.updates));
          break;

        case 'getBillableProjects':
          sendResponse(await FreelancerTracker.getProjects(request.clientId, request.includeArchived));
          break;

        case 'updateFreelancerSettings':
          sendResponse(await FreelancerTracker.updateSettings(request.settings));
          break;

        // ─── WELLNESS ────────────────────────────────────────────────────
        case 'getWellnessData':
          sendResponse(await WellnessManager.getWellnessData());
          break;

        case 'checkWellnessReminders':
          sendResponse(await WellnessManager.checkReminders());
          break;

        case 'markWellnessReminderDone':
          sendResponse(await WellnessManager.markReminderDone(request.type));
          break;

        case 'updateWellnessSettings':
          sendResponse(await WellnessManager.updateSettings(request.settings));
          break;

        // ─── VIBE MODE ───────────────────────────────────────────────────
        case 'getVibeMode':
          sendResponse(await VibeModeManager.getVibeMode());
          break;

        case 'setVibe':
          sendResponse(await VibeModeManager.setVibe(request.vibe));
          break;

        case 'setAmbientSound':
          sendResponse(await VibeModeManager.setAmbientSound(request.sound, request.volume));
          break;

        case 'setCustomColors':
          sendResponse(await VibeModeManager.setCustomColors(request.colors));
          break;

        case 'getVibeTheme':
          sendResponse(VibeModeManager.getVibeTheme(request.vibe));
          break;

        // ─── AI INSIGHTS ────────────────────────────────────────────────────
        case 'getAIInsight':
          sendResponse(await AIInsightManager.getInsight());
          break;

        // ─── AUTO-REFRESH / PAGE MONITOR ────────────────────────────────────
        case 'startAutoRefresh':
          sendResponse(await AutoRefreshManager.startRefresh(request.tabId, request.url, request.seconds, {
            notifyOnChange: request.notifyOnChange,
            soundOnChange: request.soundOnChange
          }));
          break;

        case 'stopAutoRefresh':
          sendResponse(await AutoRefreshManager.stopRefresh(request.tabId));
          break;

        case 'getAutoRefreshStatus':
          sendResponse(await AutoRefreshManager.getStatus());
          break;

        default:
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      console.error('[ZENFLOW] Message handler error:', error);
      sendResponse({ error: error.message });
    }
  })();

  return true; // Keep channel open for async response
});

// ═══════════════════════════════════════════════════════════════════════════════
// LIFECYCLE EVENTS
// ═══════════════════════════════════════════════════════════════════════════════

// On Install
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log(`[ZENFLOW] Extension ${details.reason}: v3.0.0`);

  if (details.reason === 'install') {
    // Initialize storage with defaults
    await StorageManager.set(DEFAULT_STORAGE);
    console.log('[ZENFLOW] Initialized with default storage');

    // Open welcome page
    chrome.tabs.create({ url: 'newtab.html?welcome=true' });
  }

  if (details.reason === 'update') {
    // Migration logic if needed
    const storage = await StorageManager.getAll();

    // Ensure new fields exist
    if (!storage.netrunner) {
      await StorageManager.set({ netrunner: DEFAULT_STORAGE.netrunner });
    }
    if (!storage.dailyStats) {
      await StorageManager.set({ dailyStats: {} });
    }
    // v2.3: Add time tracking
    if (!storage.timeTracking) {
      await StorageManager.set({ timeTracking: DEFAULT_STORAGE.timeTracking });
    }
    // v2.4: Add freelancer, wellness, vibe mode
    if (!storage.freelancer) {
      await StorageManager.set({ freelancer: DEFAULT_STORAGE.freelancer });
    }
    if (!storage.wellness) {
      await StorageManager.set({ wellness: DEFAULT_STORAGE.wellness });
    }
    if (!storage.vibeMode) {
      await StorageManager.set({ vibeMode: DEFAULT_STORAGE.vibeMode });
    }
    // v3.0: Side panel, AI insights (uses existing storage - no new fields needed)
    console.log('[ZENFLOW] v3.0 migration complete - Side Panel & AI Insights enabled');
  }

  // Set up recurring alarms
  await chrome.alarms.create(ALARMS.KEEP_ALIVE, { periodInMinutes: 0.5 });
  await chrome.alarms.create(ALARMS.RECOVERY_CHECK, { periodInMinutes: 1 });
  await chrome.alarms.create(ALARMS.STREAK_CHECK, { periodInMinutes: 60 });
  await chrome.alarms.create(ALARMS.TIME_TRACKING_SAVE, { periodInMinutes: 5 });
  await chrome.alarms.create(ALARMS.GOAL_CHECK, { periodInMinutes: 15 });
  await chrome.alarms.create(ALARMS.WELLNESS_CHECK, { periodInMinutes: 15 });
  await chrome.alarms.create(ALARMS.EARNINGS_UPDATE, { periodInMinutes: 1 });

  // Run recovery check
  await FocusLockSystem.recoveryCheck();
});

// On Startup (Browser launch)
chrome.runtime.onStartup.addListener(async () => {
  console.log('[ZENFLOW] Browser startup - checking for active sessions');

  // Set up keep-alive alarm
  await chrome.alarms.create(ALARMS.KEEP_ALIVE, { periodInMinutes: 0.5 });
  await chrome.alarms.create(ALARMS.RECOVERY_CHECK, { periodInMinutes: 1 });

  // CRITICAL: Check for unbypassable focus session
  await FocusLockSystem.recoveryCheck();

  // Check streak
  await StreakManager.checkAndUpdateStreak();

  // Restore auto-refresh sessions (if tabs still exist)
  await AutoRefreshManager.restoreState();
});

// Idle state tracking
chrome.idle.onStateChanged.addListener(async (state) => {
  console.log(`[ZENFLOW] Idle state: ${state}`);

  if (state === 'active') {
    // User returned, run recovery check
    await FocusLockSystem.recoveryCheck();
  }
});

chrome.idle.setDetectionInterval(60);

// ═══════════════════════════════════════════════════════════════════════════════
// TAB TRACKING FOR TIME ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════════

// Track when user switches tabs
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url) {
      await TimeTracker.startTracking(activeInfo.tabId, tab.url);
    }
  } catch (error) {
    console.log('[ZENFLOW] Tab tracking error:', error.message);
  }
});

// Track when current tab URL changes
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active && tab.url) {
    await TimeTracker.startTracking(tabId, tab.url);
  }
});

// Track when window focus changes
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Browser lost focus - end current session
    await TimeTracker.endCurrentSession();
  } else {
    // Browser gained focus - start tracking active tab
    try {
      const [tab] = await chrome.tabs.query({ active: true, windowId });
      if (tab && tab.url) {
        await TimeTracker.startTracking(tab.id, tab.url);
      }
    } catch (error) {
      console.log('[ZENFLOW] Window focus tracking error:', error.message);
    }
  }
});

// Track browser idle state for time tracking
chrome.idle.onStateChanged.addListener(async (state) => {
  if (state === 'idle' || state === 'locked') {
    await TimeTracker.endCurrentSession();
  } else if (state === 'active') {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url) {
        await TimeTracker.startTracking(tab.id, tab.url);
      }
    } catch (error) {
      console.log('[ZENFLOW] Idle state tracking error:', error.message);
    }
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════════════════════════════════════════

chrome.commands.onCommand.addListener(async (command) => {
  console.log(`[ZENFLOW] Command: ${command}`);

  switch (command) {
    case 'toggle_focus':
      const focus = await StorageManager.getFocus();
      if (focus.active && focus.locked) {
        await FocusLockSystem.showNotification(
          'Focus Locked',
          `Focus session is locked. ${(await FocusLockSystem.getRemainingTime()).remainingMinutes} minutes remaining.`
        );
      } else if (!focus.active) {
        await FocusLockSystem.startFocus(25);
        await FocusLockSystem.showNotification('Focus Mode Activated', '25-minute focus session started!');
      }
      break;

    case 'quick_task':
      // Open popup for quick task entry
      chrome.action.openPopup();
      break;

    case 'toggle_floating_notes':
      // Toggle floating notes visibility on active tab
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.id && !tab.url.startsWith('chrome://')) {
          await chrome.tabs.sendMessage(tab.id, { action: 'toggleFloatingNotes' });
        }
      } catch (error) {
        console.log('[ZENFLOW] Could not toggle floating notes:', error.message);
      }
      break;

    case 'add_floating_note':
      // Add new floating note on active tab
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.id && !tab.url.startsWith('chrome://')) {
          await chrome.tabs.sendMessage(tab.id, { action: 'addFloatingNote' });
        }
      } catch (error) {
        console.log('[ZENFLOW] Could not add floating note:', error.message);
      }
      break;
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SKYNETLABS | www.skynetjoe.com
// ═══════════════════════════════════════════════════════════════════════════════
