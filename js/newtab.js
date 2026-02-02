// ═══════════════════════════════════════════════════════════════
// ZENFLOW // NEURAL LABS v3.0 — Neural Command Center
// Lock in. Execute. Dominate.
// + Website Time Tracking + Auto-Refresh Monitor
// www.skynetjoe.com
// ═══════════════════════════════════════════════════════════════

'use strict';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS & CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const QUOTES = [
  { text: "Execute with precision. Dominate your day.", author: "ZENFLOW" },
  { text: "The matrix has you. Choose to be free.", author: "ZENFLOW" },
  { text: "Deep work is the ability to focus without distraction.", author: "Cal Newport" },
  { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
  { text: "Your time is limited. Don't waste it living someone else's life.", author: "Steve Jobs" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
  { text: "Done is better than perfect.", author: "Sheryl Sandberg" },
  { text: "Small daily improvements are the key to staggering long-term results.", author: "Unknown" },
  { text: "The future depends on what you do today.", author: "Mahatma Gandhi" },
  { text: "Protect your time like your life depends on it. Because it does.", author: "ZENFLOW" },
  { text: "Amateurs sit and wait for inspiration. The rest of us just get up and go to work.", author: "Stephen King" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
  { text: "The code doesn't lie. Neither should your productivity.", author: "ZENFLOW" },
  { text: "Jack in. Execute. Disconnect. Repeat.", author: "ZENFLOW" }
];

const LEVEL_NAMES = {
  1: 'Initiate',
  2: 'Script Kiddie',
  3: 'Coder',
  4: 'Developer',
  5: 'Engineer',
  6: 'Architect',
  7: 'Netrunner',
  8: 'Cyber Ghost',
  9: 'Data Phantom',
  10: 'System Breaker',
  11: 'Neural Master',
  12: 'Legendary'
};

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000, 2000, 4000, 7000, 12000, 20000, 35000, 50000];

// Focus ring circumference for progress calculation (2 * PI * 120)
const FOCUS_RING_CIRCUMFERENCE = 754;

// Score ring circumference (2 * PI * 45)
const SCORE_RING_CIRCUMFERENCE = 283;

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

function formatTime(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatMinutes(minutes) {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${minutes}m`;
}

function getDateKey() {
  return new Date().toISOString().split('T')[0];
}

function getLevelFromXP(xp) {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      return i + 1;
    }
  }
  return 1;
}

function getXPProgress(xp) {
  const level = getLevelFromXP(xp);
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const progress = xp - currentThreshold;
  const needed = nextThreshold - currentThreshold;
  return { progress, needed, percentage: Math.min(100, (progress / needed) * 100) };
}

// ═══════════════════════════════════════════════════════════════
// MESSAGE BRIDGE - Communication with Background Service Worker
// ═══════════════════════════════════════════════════════════════

async function sendMessage(action, data = {}) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ action, ...data }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn(`[ZENFLOW] Message error (${action}):`, chrome.runtime.lastError);
          resolve(null);
          return;
        }
        resolve(response);
      });
    } catch (e) {
      console.error(`[ZENFLOW] sendMessage exception (${action}):`, e);
      resolve(null);
    }
  });
}

async function getStorage(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        console.error('[ZENFLOW] Storage get error:', chrome.runtime.lastError);
        resolve({});
        return;
      }
      resolve(result);
    });
  });
}

async function setStorage(data) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(data, () => {
      if (chrome.runtime.lastError) {
        console.error('[ZENFLOW] Storage set error:', chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
        return;
      }
      console.log('[ZENFLOW] Storage saved:', Object.keys(data));
      resolve();
    });
  });
}

// ═══════════════════════════════════════════════════════════════
// DOM REFERENCES
// ═══════════════════════════════════════════════════════════════

const DOM = {
  // Header
  levelIcon: document.getElementById('levelIcon'),
  levelName: document.getElementById('levelName'),
  levelNumber: document.getElementById('levelNumber'),
  xpBarFill: document.getElementById('xpBarFill'),
  currentXP: document.getElementById('currentXP'),
  nextLevelXP: document.getElementById('nextLevelXP'),
  streakCount: document.getElementById('streakCount'),
  timeDisplay: document.getElementById('timeDisplay'),
  dateDisplay: document.getElementById('dateDisplay'),

  // Greeting
  timeOfDay: document.getElementById('timeOfDay'),
  userName: document.getElementById('userName'),
  dailyQuote: document.getElementById('dailyQuote'),

  // Stats Row
  todayFocusTime: document.getElementById('todayFocusTime'),
  tasksCompleted: document.getElementById('tasksCompleted'),
  focusSessions: document.getElementById('focusSessions'),
  sitesBlocked: document.getElementById('sitesBlocked'),

  // Focus Ring
  focusRingProgress: document.getElementById('focusRingProgress'),
  focusTime: document.getElementById('focusTime'),
  focusStatusLabel: document.getElementById('focusStatusLabel'),
  focusStatusText: document.getElementById('focusStatusText'),
  startFocusBtn: document.getElementById('startFocusBtn'),
  resetFocusBtn: document.getElementById('resetFocusBtn'),
  lockModeToggle: document.getElementById('lockModeToggle'),

  // Missions
  missionList: document.getElementById('missionList'),
  missionEmpty: document.getElementById('missionEmpty'),
  newMissionInput: document.getElementById('newMissionInput'),
  addMissionBtn: document.getElementById('addMissionBtn'),
  pendingXP: document.getElementById('pendingXP'),

  // Productivity Score
  productivityScore: document.getElementById('productivityScore'),
  scoreRingFill: document.getElementById('scoreRingFill'),
  scoreTasksValue: document.getElementById('scoreTasksValue'),
  scoreFocusValue: document.getElementById('scoreFocusValue'),
  scoreFocusTimeValue: document.getElementById('scoreFocusTimeValue'),
  scoreStreakValue: document.getElementById('scoreStreakValue'),

  // Activity Heatmap
  activityHeatmap: document.getElementById('activityHeatmap'),

  // Quick Links
  quickLinks: document.getElementById('quickLinks'),
  addLinkBtn: document.getElementById('addLinkBtn'),

  // Blocked Sites
  blockedSitesPreview: document.getElementById('blockedSitesPreview'),
  manageSitesBtn: document.getElementById('manageSitesBtn'),

  // Sticky Notes
  stickyNotes: document.getElementById('stickyNotes'),
  stickyStatus: document.getElementById('stickyStatus'),
  stickyLastSaved: document.getElementById('stickyLastSaved'),
  stickyCharCount: document.getElementById('stickyCharCount'),

  // Daily Focus Total
  dailyFocusTotal: document.getElementById('dailyFocusTotal'),
  dailyGoalDisplay: document.getElementById('dailyGoalDisplay'),

  // Time Tracking Analytics
  ttProductiveTime: document.getElementById('ttProductiveTime'),
  ttWasteTime: document.getElementById('ttWasteTime'),
  ttCategoryBars: document.getElementById('ttCategoryBars'),
  ttTopWasteSites: document.getElementById('ttTopWasteSites'),
  ttInsightAlert: document.getElementById('ttInsightAlert'),
  ttInsightTitle: document.getElementById('ttInsightTitle'),
  ttInsightMessage: document.getElementById('ttInsightMessage'),
  timeTrackingDate: document.getElementById('timeTrackingDate'),

  // Auto-Refresh Panel
  autoRefreshStatusBadge: document.getElementById('autoRefreshStatusBadge'),
  autoRefreshPanel: document.getElementById('autoRefreshPanel'),
  autoRefreshActiveList: document.getElementById('autoRefreshActiveList'),

  // Modals
  addLinkModal: document.getElementById('addLinkModal'),
  closeAddLinkModal: document.getElementById('closeAddLinkModal'),
  linkTitle: document.getElementById('linkTitle'),
  linkUrl: document.getElementById('linkUrl'),
  saveLinkBtn: document.getElementById('saveLinkBtn'),
  blockedSitesModal: document.getElementById('blockedSitesModal'),
  closeBlockedSitesModal: document.getElementById('closeBlockedSitesModal'),
  newBlockedSite: document.getElementById('newBlockedSite'),
  addBlockedSiteBtn: document.getElementById('addBlockedSiteBtn'),
  blockedSitesList: document.getElementById('blockedSitesList'),
  resetBlockedSitesBtn: document.getElementById('resetBlockedSitesBtn')
};

// ═══════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════

let focusState = {
  active: false,
  locked: false,
  endTime: null,
  duration: 25,
  timerInterval: null
};

let selectedDuration = 25;

// ═══════════════════════════════════════════════════════════════
// DATE/TIME & GREETING
// ═══════════════════════════════════════════════════════════════

function updateDateTime() {
  const now = new Date();

  // Time display
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  if (DOM.timeDisplay) DOM.timeDisplay.textContent = timeStr;

  // Date display
  const options = { weekday: 'long', month: 'long', day: 'numeric' };
  const dateStr = now.toLocaleDateString('en-US', options);
  if (DOM.dateDisplay) DOM.dateDisplay.textContent = dateStr;

  // Time of day greeting
  let timeOfDay = 'evening';
  if (hours < 12) timeOfDay = 'morning';
  else if (hours < 17) timeOfDay = 'afternoon';
  if (DOM.timeOfDay) DOM.timeOfDay.textContent = timeOfDay;
}

function displayDailyQuote() {
  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
  const quote = QUOTES[dayOfYear % QUOTES.length];
  if (DOM.dailyQuote) DOM.dailyQuote.textContent = `"${quote.text}" — ${quote.author}`;
}

// ═══════════════════════════════════════════════════════════════
// NETRUNNER STATUS (XP & Levels)
// ═══════════════════════════════════════════════════════════════

async function updateNetrunnerStatus() {
  const { netrunner, streak } = await getStorage(['netrunner', 'streak']);
  const xp = netrunner?.xp || 0;
  const level = getLevelFromXP(xp);
  const levelName = LEVEL_NAMES[level] || 'Unknown';
  const xpProgress = getXPProgress(xp);
  const currentStreak = streak?.current || 0;

  // Update level badge
  if (DOM.levelIcon) DOM.levelIcon.textContent = level;
  if (DOM.levelName) DOM.levelName.textContent = levelName;
  if (DOM.levelNumber) DOM.levelNumber.textContent = level;

  // Update XP bar
  if (DOM.xpBarFill) DOM.xpBarFill.style.width = `${xpProgress.percentage}%`;
  if (DOM.currentXP) DOM.currentXP.textContent = xp;
  if (DOM.nextLevelXP) DOM.nextLevelXP.textContent = LEVEL_THRESHOLDS[level] || '∞';

  // Update streak
  if (DOM.streakCount) {
    DOM.streakCount.textContent = `${currentStreak} day${currentStreak !== 1 ? 's' : ''} streak`;
  }

  // Update username from settings
  const { settings } = await getStorage(['settings']);
  if (DOM.userName && settings?.userName) {
    DOM.userName.textContent = settings.userName;
  }
}

// ═══════════════════════════════════════════════════════════════
// FOCUS RING TIMER
// ═══════════════════════════════════════════════════════════════

async function loadFocusStatus() {
  const response = await sendMessage('getFocusStatus');
  return response || { active: false, locked: false };
}

function updateFocusRing(progress) {
  if (!DOM.focusRingProgress) return;
  // Progress is 0-1, offset goes from full circumference (no progress) to 0 (complete)
  const offset = FOCUS_RING_CIRCUMFERENCE * (1 - progress);
  DOM.focusRingProgress.style.strokeDashoffset = offset;
}

function updateFocusDisplay() {
  if (!focusState.active) {
    // Idle state
    if (DOM.focusTime) DOM.focusTime.textContent = `${selectedDuration}:00`;
    if (DOM.focusStatusLabel) DOM.focusStatusLabel.textContent = 'Ready';
    if (DOM.focusStatusLabel) DOM.focusStatusLabel.className = 'focus-status';
    if (DOM.focusStatusText) DOM.focusStatusText.textContent = 'STANDBY';
    if (DOM.startFocusBtn) {
      DOM.startFocusBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
          <polygon points="5,3 19,12 5,21"></polygon>
        </svg>
        Initiate
      `;
      DOM.startFocusBtn.classList.remove('active');
    }
    updateFocusRing(0);
    return;
  }

  // Active state
  const now = Date.now();
  const remaining = Math.max(0, focusState.endTime - now);
  const totalMs = focusState.duration * 60 * 1000;
  const elapsed = totalMs - remaining;
  const progress = elapsed / totalMs;

  if (DOM.focusTime) DOM.focusTime.textContent = formatTime(remaining);
  if (DOM.focusStatusLabel) {
    DOM.focusStatusLabel.textContent = focusState.locked ? 'LOCKED' : 'ACTIVE';
    DOM.focusStatusLabel.className = `focus-status ${focusState.locked ? 'locked' : 'active'}`;
  }
  if (DOM.focusStatusText) {
    DOM.focusStatusText.textContent = focusState.locked ? 'LOCKED' : 'ACTIVE';
  }
  if (DOM.startFocusBtn) {
    DOM.startFocusBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px;">
        <rect x="6" y="4" width="4" height="16"></rect>
        <rect x="14" y="4" width="4" height="16"></rect>
      </svg>
      ${focusState.locked ? 'Locked' : 'Stop'}
    `;
    DOM.startFocusBtn.classList.add('active');
  }
  updateFocusRing(progress);

  // Check if timer ended
  if (remaining <= 0) {
    stopFocusTimer();
    focusState.active = false;
    focusState.locked = false;
    updateFocusDisplay();
    updateStatsRow();
  }
}

function startFocusTimer() {
  if (focusState.timerInterval) clearInterval(focusState.timerInterval);
  updateFocusDisplay();
  focusState.timerInterval = setInterval(updateFocusDisplay, 1000);
}

function stopFocusTimer() {
  if (focusState.timerInterval) {
    clearInterval(focusState.timerInterval);
    focusState.timerInterval = null;
  }
}

async function syncFocusState() {
  const status = await loadFocusStatus();
  if (status && status.active) {
    focusState.active = true;
    focusState.locked = status.locked;
    focusState.endTime = status.endTime;
    focusState.duration = status.duration || 25;
    startFocusTimer();
  } else {
    focusState.active = false;
    focusState.locked = false;
    stopFocusTimer();
    updateFocusDisplay();
  }
}

// Focus controls
if (DOM.startFocusBtn) {
  DOM.startFocusBtn.addEventListener('click', async () => {
    if (focusState.active) {
      // Try to stop
      if (focusState.locked) {
        showNotification('Focus Mode is locked until timer expires', 'locked');
        return;
      }
      const response = await sendMessage('endFocus');
      if (response?.success) {
        focusState.active = false;
        stopFocusTimer();
        updateFocusDisplay();
        updateStatsRow();
      }
    } else {
      // Start focus
      const locked = DOM.lockModeToggle?.checked || false;
      const response = await sendMessage('startFocus', { duration: selectedDuration, locked });
      if (response?.success) {
        focusState.active = true;
        focusState.locked = locked;
        focusState.endTime = response.endTime;
        focusState.duration = selectedDuration;
        startFocusTimer();
        updateStatsRow();
      }
    }
  });
}

if (DOM.resetFocusBtn) {
  DOM.resetFocusBtn.addEventListener('click', () => {
    if (focusState.locked) {
      showNotification('Cannot reset while locked', 'locked');
      return;
    }
    if (focusState.active) {
      sendMessage('endFocus').then(() => {
        focusState.active = false;
        stopFocusTimer();
        updateFocusDisplay();
      });
    }
    selectedDuration = 25;
    document.querySelectorAll('.duration-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.minutes) === 25);
    });
    updateFocusDisplay();
  });
}

// Duration presets
document.querySelectorAll('.duration-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (focusState.active) return; // Can't change during active session
    document.querySelectorAll('.duration-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedDuration = parseInt(btn.dataset.minutes);
    updateFocusDisplay();
  });
});

// ═══════════════════════════════════════════════════════════════
// STATS ROW
// ═══════════════════════════════════════════════════════════════

async function updateStatsRow() {
  const { dailyStats, tasks, blockedSites } = await getStorage([
    'dailyStats', 'tasks', 'blockedSites'
  ]);

  const today = getDateKey();
  const todayStats = dailyStats?.[today] || { focusMinutes: 0, focusSessions: 0 };
  const allTasks = tasks || [];
  const completedTasks = allTasks.filter(t => t.completed).length;

  // blockedSites is an object with {defaults: [], custom: []}
  const defaultSites = blockedSites?.defaults || [];
  const customSites = blockedSites?.custom || [];
  const allSites = [...defaultSites, ...customSites];
  const uniqueSites = [...new Set(allSites.map(s => s.replace(/^www\./, '')))].length;

  if (DOM.todayFocusTime) DOM.todayFocusTime.textContent = formatMinutes(todayStats.focusMinutes || 0);
  if (DOM.tasksCompleted) DOM.tasksCompleted.textContent = completedTasks;
  if (DOM.focusSessions) DOM.focusSessions.textContent = todayStats.focusSessions || 0;
  if (DOM.sitesBlocked) DOM.sitesBlocked.textContent = uniqueSites;
}

// ═══════════════════════════════════════════════════════════════
// MISSIONS (TASKS)
// ═══════════════════════════════════════════════════════════════

async function loadTasks() {
  const { tasks } = await getStorage(['tasks']);
  console.log('[ZENFLOW] Loaded tasks:', tasks?.length || 0);
  return tasks || [];
}

async function saveTasks(tasks) {
  console.log('[ZENFLOW] Saving tasks:', tasks.length);
  try {
    await setStorage({ tasks });
    console.log('[ZENFLOW] Tasks saved successfully');
  } catch (e) {
    console.error('[ZENFLOW] Failed to save tasks:', e);
    showNotification('Failed to save tasks', 'error');
  }
}

function renderMissions(tasks) {
  if (!DOM.missionList) return;

  const pendingTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);
  const sortedTasks = [...pendingTasks, ...completedTasks];

  // Calculate pending XP
  const pendingXP = pendingTasks.length * 15; // 15 XP per task
  if (DOM.pendingXP) DOM.pendingXP.textContent = pendingXP;

  // Show/hide empty state
  if (DOM.missionEmpty) {
    DOM.missionEmpty.style.display = sortedTasks.length === 0 ? 'block' : 'none';
  }

  // Render missions
  const missionsHtml = sortedTasks.map(task => `
    <div class="mission-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
      <div class="mission-checkbox" data-action="toggle">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <polyline points="20,6 9,17 4,12"></polyline>
        </svg>
      </div>
      <div class="mission-content">
        <span class="mission-text">${escapeHtml(task.title)}</span>
        <span class="mission-xp">${task.completed ? '✓ Completed' : '+15 XP'}</span>
      </div>
      <button class="mission-delete" data-action="delete" title="Delete mission">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  `).join('');

  // Insert missions before the empty state element
  const existingMissions = DOM.missionList.querySelectorAll('.mission-item');
  existingMissions.forEach(el => el.remove());
  DOM.missionList.insertAdjacentHTML('afterbegin', missionsHtml);

  // Update stats
  updateStatsRow();
  updateProductivityScore();
}

// Mission list click handler - Uses service worker for proper XP/stats tracking
if (DOM.missionList) {
  DOM.missionList.addEventListener('click', async (e) => {
    const missionItem = e.target.closest('.mission-item');
    if (!missionItem) return;

    const taskId = missionItem.dataset.id;
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (!action || !taskId) return;

    const tasks = await loadTasks();
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    if (action === 'toggle') {
      const wasCompleted = tasks[taskIndex].completed;

      if (!wasCompleted) {
        // COMPLETING task - use service worker's completeTask for proper XP (25 XP)
        try {
          await sendMessage('completeTask', { taskId });
          showNotification('+25 XP earned!', 'success');
          updateNetrunnerStatus();
          // Reload tasks to get updated state from service worker
          const updatedTasks = await loadTasks();
          renderMissions(updatedTasks);
        } catch (err) {
          console.error('[ZENFLOW] Failed to complete task:', err);
          showNotification('Failed to complete task', 'error');
        }
      } else {
        // UNCOMPLETING task - use updateTask
        try {
          await sendMessage('updateTask', { taskId, updates: { completed: false, completedAt: null } });
          const updatedTasks = await loadTasks();
          renderMissions(updatedTasks);
        } catch (err) {
          console.error('[ZENFLOW] Failed to uncomplete task:', err);
        }
      }
    } else if (action === 'delete') {
      missionItem.style.opacity = '0';
      missionItem.style.transform = 'translateX(20px)';
      setTimeout(async () => {
        try {
          await sendMessage('deleteTask', { taskId });
          const updatedTasks = await loadTasks();
          renderMissions(updatedTasks);
        } catch (err) {
          console.error('[ZENFLOW] Failed to delete task:', err);
          // Reload to show actual state
          const tasks = await loadTasks();
          renderMissions(tasks);
        }
      }, 200);
    }
  });
}

// Add mission - Uses service worker for consistent task management
if (DOM.addMissionBtn && DOM.newMissionInput) {
  const addMission = async () => {
    const title = DOM.newMissionInput.value.trim();
    if (!title) return;

    // Disable button during operation
    DOM.addMissionBtn.disabled = true;

    try {
      // Use service worker to add task
      const newTask = await sendMessage('addTask', { task: { title } });

      if (newTask && newTask.id) {
        DOM.newMissionInput.value = '';
        // Reload tasks to ensure consistency
        const tasks = await loadTasks();
        renderMissions(tasks);
        showNotification('Mission added!', 'success');
      }
    } catch (err) {
      console.error('[ZENFLOW] Failed to add mission:', err);
      showNotification('Failed to add mission', 'error');
    } finally {
      DOM.addMissionBtn.disabled = false;
    }
  };

  DOM.addMissionBtn.addEventListener('click', addMission);
  DOM.newMissionInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addMission();
  });
}

// ═══════════════════════════════════════════════════════════════
// PRODUCTIVITY SCORE
// ═══════════════════════════════════════════════════════════════

async function updateProductivityScore() {
  const { tasks, dailyStats, streak, focus } = await getStorage(['tasks', 'dailyStats', 'streak', 'focus']);

  const today = getDateKey();
  const todayStats = dailyStats?.[today] || { focusMinutes: 0, focusSessions: 0 };
  const allTasks = tasks || [];
  const completedTasks = allTasks.filter(t => t.completed).length;
  const totalTasks = allTasks.length;
  const currentStreak = streak?.current || 0;
  const focusActive = focus?.active || false;

  // Calculate score (0-100)
  let score = 0;

  // Tasks: 40% weight
  if (totalTasks > 0) {
    score += (completedTasks / totalTasks) * 40;
  }

  // Focus sessions: 30% weight (max 4 sessions = 100% of this weight)
  const sessionScore = Math.min(todayStats.focusSessions || 0, 4) / 4;
  score += sessionScore * 30;

  // Focus mode active: 20% weight
  if (focusActive) {
    score += 20;
  }

  // Streak bonus: 10% weight (7+ day streak = full bonus)
  const streakScore = Math.min(currentStreak, 7) / 7;
  score += streakScore * 10;

  score = Math.round(score);

  // Update UI
  if (DOM.productivityScore) DOM.productivityScore.textContent = score;
  if (DOM.scoreRingFill) {
    const offset = SCORE_RING_CIRCUMFERENCE * (1 - score / 100);
    DOM.scoreRingFill.style.strokeDashoffset = offset;
  }

  // Update breakdown
  if (DOM.scoreTasksValue) DOM.scoreTasksValue.textContent = `${completedTasks}/${totalTasks}`;
  if (DOM.scoreFocusValue) DOM.scoreFocusValue.textContent = todayStats.focusSessions || 0;
  if (DOM.scoreFocusTimeValue) DOM.scoreFocusTimeValue.textContent = formatMinutes(todayStats.focusMinutes || 0);
  if (DOM.scoreStreakValue) DOM.scoreStreakValue.textContent = `${currentStreak} days`;
}

// ═══════════════════════════════════════════════════════════════
// ACTIVITY HEATMAP
// ═══════════════════════════════════════════════════════════════

async function renderActivityHeatmap() {
  if (!DOM.activityHeatmap) return;

  const { dailyStats } = await getStorage(['dailyStats']);
  const stats = dailyStats || {};

  // Generate last 28 days (4 weeks)
  const days = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }

  // Find max activity for scaling
  let maxActivity = 0;
  days.forEach(day => {
    const activity = (stats[day]?.focusMinutes || 0) + (stats[day]?.tasksCompleted || 0) * 5;
    if (activity > maxActivity) maxActivity = activity;
  });
  maxActivity = Math.max(maxActivity, 30); // Minimum scale

  // Keep the day labels (first 7 children)
  const labels = DOM.activityHeatmap.innerHTML;

  // Generate cells
  const cellsHtml = days.map(day => {
    const dayStats = stats[day] || {};
    const activity = (dayStats.focusMinutes || 0) + (dayStats.tasksCompleted || 0) * 5;
    let level = 0;
    if (activity > 0) {
      level = Math.ceil((activity / maxActivity) * 4);
      level = Math.max(1, Math.min(4, level));
    }
    return `<div class="heatmap-cell" data-level="${level}" title="${day}: ${activity} activity"></div>`;
  }).join('');

  // Render (preserve day labels)
  DOM.activityHeatmap.innerHTML = labels + cellsHtml;
}

// ═══════════════════════════════════════════════════════════════
// QUICK LINKS
// ═══════════════════════════════════════════════════════════════

async function loadQuickLinks() {
  const { quickLinks } = await getStorage(['quickLinks']);
  return quickLinks || [];
}

async function saveQuickLinks(links) {
  await setStorage({ quickLinks: links });
}

async function renderQuickLinks() {
  if (!DOM.quickLinks) return;

  const links = await loadQuickLinks();

  DOM.quickLinks.innerHTML = links.map(link => `
    <a href="${escapeHtml(link.url)}" class="quick-link" data-id="${link.id}" title="${escapeHtml(link.title)}">
      <div class="quick-link-icon"></div>
      <span>${escapeHtml(link.title)}</span>
    </a>
  `).join('');
}

// Quick links modal
if (DOM.addLinkBtn) {
  DOM.addLinkBtn.addEventListener('click', () => {
    if (DOM.linkTitle) DOM.linkTitle.value = '';
    if (DOM.linkUrl) DOM.linkUrl.value = '';
    if (DOM.addLinkModal) DOM.addLinkModal.classList.add('active');
    setTimeout(() => DOM.linkTitle?.focus(), 100);
  });
}

if (DOM.closeAddLinkModal) {
  DOM.closeAddLinkModal.addEventListener('click', () => {
    DOM.addLinkModal?.classList.remove('active');
  });
}

if (DOM.addLinkModal) {
  DOM.addLinkModal.addEventListener('click', (e) => {
    if (e.target === DOM.addLinkModal) DOM.addLinkModal.classList.remove('active');
  });
}

if (DOM.saveLinkBtn) {
  DOM.saveLinkBtn.addEventListener('click', async () => {
    const title = DOM.linkTitle?.value.trim();
    let url = DOM.linkUrl?.value.trim();
    if (!title || !url) return;

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    const links = await loadQuickLinks();
    links.push({ id: Date.now().toString(), title, url });
    await saveQuickLinks(links);
    renderQuickLinks();
    DOM.addLinkModal?.classList.remove('active');
  });
}

// ═══════════════════════════════════════════════════════════════
// BLOCKED SITES
// ═══════════════════════════════════════════════════════════════

async function renderBlockedSitesPreview() {
  if (!DOM.blockedSitesPreview) return;

  const response = await sendMessage('getBlockedSites');
  const allSites = response?.allSites || [];
  const uniqueSites = [...new Set(allSites.map(s => s.replace(/^www\./, '')))];
  const preview = uniqueSites.slice(0, 6);

  DOM.blockedSitesPreview.innerHTML = preview.map(site => `
    <span class="blocked-site-tag">${escapeHtml(site)}</span>
  `).join('');

  if (uniqueSites.length > 6) {
    DOM.blockedSitesPreview.innerHTML += `<span class="blocked-site-tag">+${uniqueSites.length - 6} more</span>`;
  }
}

async function renderBlockedSitesList() {
  if (!DOM.blockedSitesList) return;

  const response = await sendMessage('getBlockedSites');
  const defaultSites = response?.defaultSites || [];
  const customSites = response?.customSites || [];

  const allSites = [
    ...customSites.map(s => ({ name: s, isCustom: true })),
    ...defaultSites.map(s => ({ name: s, isCustom: false }))
  ];

  DOM.blockedSitesList.innerHTML = allSites.map(site => `
    <div class="blocked-site-item ${site.isCustom ? 'custom' : ''}" data-site="${escapeHtml(site.name)}">
      <span class="blocked-site-name">${escapeHtml(site.name)}</span>
      <button class="blocked-site-remove" title="Remove">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  `).join('');
}

// Manage sites modal
if (DOM.manageSitesBtn) {
  DOM.manageSitesBtn.addEventListener('click', () => {
    renderBlockedSitesList();
    DOM.blockedSitesModal?.classList.add('active');
  });
}

if (DOM.closeBlockedSitesModal) {
  DOM.closeBlockedSitesModal.addEventListener('click', () => {
    DOM.blockedSitesModal?.classList.remove('active');
  });
}

if (DOM.blockedSitesModal) {
  DOM.blockedSitesModal.addEventListener('click', (e) => {
    if (e.target === DOM.blockedSitesModal) DOM.blockedSitesModal.classList.remove('active');
  });
}

// Add blocked site
if (DOM.addBlockedSiteBtn) {
  const addSite = async () => {
    const site = DOM.newBlockedSite?.value.trim();
    if (!site) return;

    const response = await sendMessage('addBlockedSite', { site });
    if (response?.success) {
      DOM.newBlockedSite.value = '';
      renderBlockedSitesList();
      renderBlockedSitesPreview();
      updateStatsRow();
    } else if (response?.message) {
      showNotification(response.message, 'error');
    }
  };

  DOM.addBlockedSiteBtn.addEventListener('click', addSite);
  DOM.newBlockedSite?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addSite();
  });
}

// Remove blocked site
if (DOM.blockedSitesList) {
  DOM.blockedSitesList.addEventListener('click', async (e) => {
    const removeBtn = e.target.closest('.blocked-site-remove');
    if (!removeBtn) return;

    const siteItem = removeBtn.closest('.blocked-site-item');
    const site = siteItem.dataset.site;

    const response = await sendMessage('removeBlockedSite', { site });
    if (response?.success) {
      siteItem.style.opacity = '0';
      setTimeout(() => {
        renderBlockedSitesList();
        renderBlockedSitesPreview();
        updateStatsRow();
      }, 200);
    }
  });
}

// Reset blocked sites
if (DOM.resetBlockedSitesBtn) {
  DOM.resetBlockedSitesBtn.addEventListener('click', async () => {
    if (focusState.locked) {
      showNotification('Cannot reset while focus is locked', 'locked');
      return;
    }
    if (confirm('Reset blocked sites to default list?')) {
      const response = await sendMessage('resetBlockedSites');
      if (response?.success) {
        renderBlockedSitesList();
        renderBlockedSitesPreview();
        updateStatsRow();
      }
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// STICKY NOTES
// ═══════════════════════════════════════════════════════════════

let stickyNoteSaveTimeout = null;

async function loadStickyNotes() {
  const { stickyNotes } = await getStorage(['stickyNotes']);
  return stickyNotes || '';
}

async function saveStickyNotes(content) {
  await setStorage({ stickyNotes: content });
  console.log('[ZENFLOW] Sticky notes saved');
}

function updateStickyStatus(status, isSuccess = true) {
  if (DOM.stickyStatus) {
    DOM.stickyStatus.textContent = status;
    DOM.stickyStatus.classList.toggle('saved', isSuccess);
  }
  if (DOM.stickyLastSaved && isSuccess) {
    const now = new Date();
    DOM.stickyLastSaved.textContent = `Saved ${now.toLocaleTimeString()}`;
  }
}

function updateStickyCharCount(count) {
  if (DOM.stickyCharCount) {
    DOM.stickyCharCount.textContent = count;
  }
}

async function initStickyNotes() {
  if (!DOM.stickyNotes) return;

  // Load saved notes
  const savedNotes = await loadStickyNotes();
  DOM.stickyNotes.value = savedNotes;
  updateStickyCharCount(savedNotes.length);
  updateStickyStatus('Ready');

  // Auto-save on input with debounce
  DOM.stickyNotes.addEventListener('input', () => {
    const content = DOM.stickyNotes.value;
    updateStickyCharCount(content.length);
    updateStickyStatus('Typing...', false);

    // Clear previous timeout
    if (stickyNoteSaveTimeout) {
      clearTimeout(stickyNoteSaveTimeout);
    }

    // Save after 500ms of no typing
    stickyNoteSaveTimeout = setTimeout(async () => {
      await saveStickyNotes(content);
      updateStickyStatus('Saved', true);
    }, 500);
  });

  // Save on blur (when leaving textarea)
  DOM.stickyNotes.addEventListener('blur', async () => {
    if (stickyNoteSaveTimeout) {
      clearTimeout(stickyNoteSaveTimeout);
    }
    await saveStickyNotes(DOM.stickyNotes.value);
    updateStickyStatus('Saved', true);
  });
}

// ═══════════════════════════════════════════════════════════════
// DAILY FOCUS TOTAL
// ═══════════════════════════════════════════════════════════════

async function updateDailyFocusTotal() {
  const { dailyStats, settings } = await getStorage(['dailyStats', 'settings']);
  const today = getDateKey();
  const todayStats = dailyStats?.[today] || { focusMinutes: 0 };
  const minutes = todayStats.focusMinutes || 0;
  const dailyGoal = settings?.dailyGoalMinutes || 120;

  // Format as Xh Ym
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const formatted = `${hours}h ${mins}m`;

  if (DOM.dailyFocusTotal) {
    DOM.dailyFocusTotal.textContent = formatted;
  }
  if (DOM.dailyGoalDisplay) {
    const goalHours = Math.floor(dailyGoal / 60);
    const goalMins = dailyGoal % 60;
    DOM.dailyGoalDisplay.textContent = goalMins > 0 ? `${goalHours}h ${goalMins}m` : `${goalHours}h`;
  }
}

// ═══════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════

function showNotification(message, type = 'info') {
  let notification = document.querySelector('.skynet-notification');
  if (!notification) {
    notification = document.createElement('div');
    notification.className = 'skynet-notification';
    notification.innerHTML = `
      <svg class="notification-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0110 0v4"></path>
      </svg>
      <span class="notification-text"></span>
    `;
    document.body.appendChild(notification);

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .skynet-notification {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%) translateY(100px);
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 24px;
        background: var(--glass-bg);
        backdrop-filter: blur(20px);
        border: 1px solid var(--magenta);
        border-radius: 12px;
        box-shadow: 0 0 30px rgba(255, 0, 255, 0.3);
        z-index: 9999;
        opacity: 0;
        transition: all 0.3s ease;
      }
      .skynet-notification.show {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
      }
      .skynet-notification .notification-icon {
        color: var(--magenta);
      }
      .skynet-notification .notification-text {
        font-family: var(--font-mono);
        font-size: 13px;
        color: var(--text-primary);
      }
    `;
    document.head.appendChild(style);
  }

  notification.querySelector('.notification-text').textContent = message;
  notification.classList.add('show');
  setTimeout(() => notification.classList.remove('show'), 3000);
}

// ═══════════════════════════════════════════════════════════════
// STORAGE CHANGE LISTENER
// ═══════════════════════════════════════════════════════════════

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return;

  if (changes.tasks) {
    renderMissions(changes.tasks.newValue || []);
  }
  if (changes.netrunner || changes.streak) {
    updateNetrunnerStatus();
  }
  if (changes.dailyStats) {
    updateStatsRow();
    updateProductivityScore();
    renderActivityHeatmap();
  }
  if (changes.focus) {
    const focus = changes.focus.newValue;
    if (focus?.active) {
      focusState.active = true;
      focusState.locked = focus.locked;
      focusState.endTime = focus.endTime;
      focusState.duration = focus.duration;
      startFocusTimer();
    } else {
      focusState.active = false;
      focusState.locked = false;
      stopFocusTimer();
      updateFocusDisplay();
    }
    updateStatsRow();
    updateProductivityScore();
  }
  if (changes.quickLinks) {
    renderQuickLinks();
  }
  if (changes.blockedSites) {
    renderBlockedSitesPreview();
    updateStatsRow();
  }
  if (changes.stickyNotes) {
    // Only update if the change came from another tab (not our own input)
    if (DOM.stickyNotes && document.activeElement !== DOM.stickyNotes) {
      DOM.stickyNotes.value = changes.stickyNotes.newValue || '';
      updateStickyCharCount((changes.stickyNotes.newValue || '').length);
    }
  }
  if (changes.timeTracking) {
    // Update time tracking widget when data changes
    updateTimeTrackingWidget();
  }
  // Auto-refresh status can be updated via storage changes
  if (changes.autoRefreshSessions) {
    updateAutoRefreshPanel();
  }
});

// ═══════════════════════════════════════════════════════════════
// KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════════════════════════

document.addEventListener('keydown', (e) => {
  // Escape closes modals
  if (e.key === 'Escape') {
    DOM.addLinkModal?.classList.remove('active');
    DOM.blockedSitesModal?.classList.remove('active');
  }

  // Space to toggle focus (when not in input)
  if (e.key === ' ' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
    const modalOpen = DOM.addLinkModal?.classList.contains('active') ||
                      DOM.blockedSitesModal?.classList.contains('active');
    if (!modalOpen) {
      e.preventDefault();
      DOM.startFocusBtn?.click();
    }
  }
});

// ═══════════════════════════════════════════════════════════════
// TIME TRACKING ANALYTICS
// ═══════════════════════════════════════════════════════════════

const TT_CATEGORY_ICONS = {
  social: '📱',
  entertainment: '🎬',
  news: '📰',
  shopping: '🛒',
  gaming: '🎮',
  productive: '💻',
  other: '🌐'
};

async function loadTimeTrackingStats() {
  const response = await sendMessage('getTimeInsights');
  return response;
}

function formatTTMinutes(minutes) {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${minutes}m`;
}

async function updateTimeTrackingWidget() {
  const data = await loadTimeTrackingStats();
  if (!data || !data.todayStats) {
    console.log('[ZENFLOW] No time tracking data available');
    return;
  }

  const stats = data.todayStats;
  const insights = data.insights || [];

  // Update productive/waste time
  if (DOM.ttProductiveTime) {
    DOM.ttProductiveTime.textContent = formatTTMinutes(stats.productiveMinutes || 0);
  }
  if (DOM.ttWasteTime) {
    DOM.ttWasteTime.textContent = formatTTMinutes(stats.wasteMinutes || 0);
  }

  // Render category bars
  if (DOM.ttCategoryBars) {
    const categories = ['social', 'entertainment', 'productive', 'gaming', 'news'];
    const maxMinutes = Math.max(
      ...Object.values(stats.byCategory || {}).map(c => c.totalMinutes || 0),
      1
    );

    const barsHtml = categories
      .filter(cat => stats.byCategory?.[cat]?.totalMinutes > 0)
      .map(cat => {
        const catData = stats.byCategory[cat];
        const percent = Math.round((catData.totalMinutes / maxMinutes) * 100);
        return `
          <div class="tt-category-bar">
            <span class="tt-category-label">${TT_CATEGORY_ICONS[cat]} ${cat}</span>
            <div class="tt-category-progress">
              <div class="tt-category-fill ${cat}" style="width: ${percent}%"></div>
            </div>
            <span class="tt-category-time">${formatTTMinutes(catData.totalMinutes)}</span>
          </div>
        `;
      }).join('');

    DOM.ttCategoryBars.innerHTML = barsHtml || '<div style="color: var(--text-muted); font-size: 11px; text-align: center;">No category data yet</div>';
  }

  // Render top waste sites
  if (DOM.ttTopWasteSites) {
    const wasteSites = (stats.topSites || [])
      .filter(site => ['social', 'entertainment', 'gaming', 'news'].includes(site.category))
      .slice(0, 4);

    if (wasteSites.length > 0) {
      DOM.ttTopWasteSites.innerHTML = wasteSites.map(site => `
        <div class="tt-waste-site">
          <span class="tt-waste-site-name">
            <span>${TT_CATEGORY_ICONS[site.category] || '🌐'}</span>
            ${truncateDomain(site.domain)}
          </span>
          <span class="tt-waste-site-time">${formatTTMinutes(site.totalMinutes)}</span>
        </div>
      `).join('');
    } else {
      DOM.ttTopWasteSites.innerHTML = '<div style="color: var(--text-muted); font-size: 11px; text-align: center; padding: 10px;">No distractions yet - keep it up!</div>';
    }
  }

  // Show insight alert if any warnings
  if (DOM.ttInsightAlert) {
    const warningInsight = insights.find(i => i.type === 'warning' || i.type === 'alert');
    if (warningInsight) {
      DOM.ttInsightAlert.style.display = 'block';
      if (DOM.ttInsightTitle) DOM.ttInsightTitle.textContent = warningInsight.title;
      if (DOM.ttInsightMessage) DOM.ttInsightMessage.textContent = warningInsight.message;
    } else {
      DOM.ttInsightAlert.style.display = 'none';
    }
  }
}

function truncateDomain(domain) {
  if (domain && domain.length > 18) {
    return domain.substring(0, 16) + '...';
  }
  return domain || '';
}

// ═══════════════════════════════════════════════════════════════
// FREELANCER BILLING
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// AUTO-REFRESH PANEL
// ═══════════════════════════════════════════════════════════════

let autoRefreshState = {
  activeRefreshes: new Map(),
  updateInterval: null
};

async function updateAutoRefreshPanel() {
  try {
    const response = await sendMessage('getAutoRefreshStatus');

    if (response && response.activeRefreshes) {
      autoRefreshState.activeRefreshes = new Map(Object.entries(response.activeRefreshes));
    } else {
      autoRefreshState.activeRefreshes = new Map();
    }

    renderAutoRefreshUI();
  } catch (error) {
    console.error('[ZENFLOW] Error loading auto-refresh data:', error);
  }
}

function renderAutoRefreshUI() {
  const activeCount = autoRefreshState.activeRefreshes.size;

  // Update badge
  if (DOM.autoRefreshStatusBadge) {
    DOM.autoRefreshStatusBadge.textContent = activeCount > 0 ? `${activeCount} ACTIVE` : 'INACTIVE';
    DOM.autoRefreshStatusBadge.style.color = activeCount > 0 ? 'var(--green)' : 'var(--text-muted)';
  }

  // Update panel content
  if (DOM.autoRefreshActiveList) {
    if (activeCount === 0) {
      DOM.autoRefreshActiveList.style.display = 'none';
      if (DOM.autoRefreshPanel) {
        DOM.autoRefreshPanel.querySelector('div[style*="text-align: center"]').style.display = 'block';
      }
    } else {
      DOM.autoRefreshActiveList.style.display = 'block';
      if (DOM.autoRefreshPanel) {
        const emptyState = DOM.autoRefreshPanel.querySelector('div[style*="text-align: center"]');
        if (emptyState) emptyState.style.display = 'none';
      }

      let html = '';
      autoRefreshState.activeRefreshes.forEach((data, tabId) => {
        const hostname = data.url ? new URL(data.url).hostname : 'Unknown';
        html += `
          <div class="auto-refresh-item active">
            <span class="auto-refresh-url" title="${escapeHtml(data.url)}">${escapeHtml(hostname)}</span>
            <span class="auto-refresh-timer">${data.seconds}s</span>
          </div>
        `;
      });
      DOM.autoRefreshActiveList.innerHTML = html;
    }
  }
}

function initAutoRefreshListeners() {
  // Initial load
  updateAutoRefreshPanel();

  // Periodic update
  if (autoRefreshState.updateInterval) {
    clearInterval(autoRefreshState.updateInterval);
  }
  autoRefreshState.updateInterval = setInterval(updateAutoRefreshPanel, 5000);
}

// Simple toast notification
function showToast(message, type = 'info') {
  let toast = document.getElementById('toast-notification');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: var(--font-mono);
      font-size: 13px;
      z-index: 10000;
      transform: translateY(100px);
      opacity: 0;
      transition: all 0.3s ease;
    `;
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.style.background = type === 'success' ? 'rgba(0, 255, 136, 0.9)' :
                          type === 'error' ? 'rgba(255, 51, 102, 0.9)' :
                          'rgba(0, 243, 255, 0.9)';
  toast.style.color = '#0A0A0F';

  // Show
  setTimeout(() => {
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';
  }, 10);

  // Hide after 3 seconds
  setTimeout(() => {
    toast.style.transform = 'translateY(100px)';
    toast.style.opacity = '0';
  }, 3000);
}

// ═══════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════

async function init() {
  console.log('[ZENFLOW] Initializing Neural Dashboard...');

  // Update time/date/quote
  updateDateTime();
  displayDailyQuote();
  setInterval(updateDateTime, 60000);

  // Load Netrunner status
  await updateNetrunnerStatus();

  // Sync focus state
  await syncFocusState();

  // Load stats
  await updateStatsRow();

  // Load tasks/missions
  const tasks = await loadTasks();
  console.log('[ZENFLOW] Tasks on init:', tasks);
  renderMissions(tasks);

  // Load productivity score
  await updateProductivityScore();

  // Load heatmap
  await renderActivityHeatmap();

  // Load quick links
  await renderQuickLinks();

  // Initialize sticky notes
  await initStickyNotes();

  // Update daily focus total
  await updateDailyFocusTotal();

  // Load blocked sites preview
  await renderBlockedSitesPreview();

  // Load time tracking analytics
  await updateTimeTrackingWidget();

  // Load auto-refresh panel
  initAutoRefreshListeners();

  console.log('[ZENFLOW] Neural Dashboard initialized');
}

init();

// ═══════════════════════════════════════════════════════════════
// ZENFLOW | www.skynetjoe.com
// Premium AI Automation & Systems Studio
// ═══════════════════════════════════════════════════════════════
