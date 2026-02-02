// ═══════════════════════════════════════════════════════════════════════════
// ZENFLOW // NEURAL LABS v3.0 — Popup Controller
// Neural-Link Productivity | Tasks + Analytics + Site Blocking + Auto-Refresh
// www.skynetjoe.com
// ═══════════════════════════════════════════════════════════════════════════

'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

const state = {
  // Focus
  focusActive: false,
  focusEndTime: null,
  focusDuration: 25,
  timerInterval: null,

  // Tasks
  tasks: [],

  // Notes
  notes: '',
  notesSaveTimeout: null,

  // Blocked Sites
  blockedSites: [],
  customSites: [],

  // Time Tracking
  timeStats: null,
  insights: null
};

// ═══════════════════════════════════════════════════════════════════════════
// DOM ELEMENTS
// ═══════════════════════════════════════════════════════════════════════════

const els = {
  // Focus
  focusBox: document.getElementById('focusBox'),
  focusInactive: document.getElementById('focusInactive'),
  focusActive: document.getElementById('focusActive'),
  startFocusBtn: document.getElementById('startFocusBtn'),
  timerDisplay: document.getElementById('timerDisplay'),
  timerProgressFill: document.getElementById('timerProgressFill'),
  pills: document.querySelectorAll('.pill'),

  // Tabs
  tabs: document.querySelectorAll('.tab'),
  tabContents: document.querySelectorAll('.tab-content'),

  // Tasks
  tasksList: document.getElementById('tasksList'),
  tasksEmpty: document.getElementById('tasksEmpty'),
  taskCount: document.getElementById('taskCount'),
  newTaskInput: document.getElementById('newTaskInput'),
  addTaskBtn: document.getElementById('addTaskBtn'),

  // Notes
  notesTextarea: document.getElementById('notesTextarea'),
  notesStatus: document.getElementById('notesStatus'),
  notesLastSaved: document.getElementById('notesLastSaved'),
  notesCharCount: document.getElementById('notesCharCount'),

  // Blocked Sites
  sitesList: document.getElementById('sitesList'),
  sitesEmpty: document.getElementById('sitesEmpty'),
  siteCount: document.getElementById('siteCount'),
  newSiteInput: document.getElementById('newSiteInput'),
  addSiteBtn: document.getElementById('addSiteBtn'),
  quickTags: document.querySelectorAll('.quick-tag'),

  // Settings - Vibe Mode
  vibeBtns: document.querySelectorAll('.vibe-btn'),
  ambientSelect: document.getElementById('ambientSelect'),

  // Settings - Wellness
  breakReminders: document.getElementById('breakReminders'),
  hydrationReminders: document.getElementById('hydrationReminders'),
  eyeStrainReminders: document.getElementById('eyeStrainReminders'),

  // Settings - Floating Notes
  floatingNotesEnabled: document.getElementById('floatingNotesEnabled'),
  floatingNotesFAB: document.getElementById('floatingNotesFAB'),
  quickCaptureEnabled: document.getElementById('quickCaptureEnabled'),

};

// ═══════════════════════════════════════════════════════════════════════════
// STORAGE HELPERS
// ═══════════════════════════════════════════════════════════════════════════

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
      console.log('[ZENFLOW] Saved:', Object.keys(data));
      resolve();
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVICE WORKER COMMUNICATION (with retry/wake-up logic)
// ═══════════════════════════════════════════════════════════════════════════

async function sendMessageToSW(message, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve(response);
        });
      });
      return response;
    } catch (error) {
      console.warn(`[ZENFLOW] sendMessage attempt ${attempt}/${maxRetries} failed:`, error.message);

      if (attempt < maxRetries) {
        // Wait before retry - service worker may be waking up
        await new Promise(r => setTimeout(r, 100 * attempt));
      } else {
        console.error('[ZENFLOW] All sendMessage attempts failed');
        throw error;
      }
    }
  }
}

// Ensure service worker is awake before popup operations
async function ensureServiceWorkerReady() {
  try {
    // Simple ping to wake up service worker
    await sendMessageToSW({ action: 'ping' });
    return true;
  } catch (e) {
    console.error('[ZENFLOW] Service worker not responding:', e);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TABS
// ═══════════════════════════════════════════════════════════════════════════

function initTabs() {
  els.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;

      // Update tab buttons
      els.tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Update tab content
      els.tabContents.forEach(content => {
        content.classList.toggle('active', content.id === `tab-${targetTab}`);
      });
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// FOCUS MODE
// ═══════════════════════════════════════════════════════════════════════════

async function loadFocusStatus() {
  try {
    const response = await sendMessageToSW({ action: 'getFocusStatus' });
    return response;
  } catch (e) {
    console.error('[ZENFLOW] getFocusStatus error:', e);
    return null;
  }
}

async function checkFocusState() {
  const status = await loadFocusStatus();

  if (status && status.active) {
    state.focusActive = true;
    state.focusEndTime = status.endTime;
    state.focusDuration = status.duration || 25;
    showFocusActive();
    startTimerUpdate();
  } else {
    state.focusActive = false;
    state.focusEndTime = null;
    showFocusInactive();
  }
}

function showFocusActive() {
  if (els.focusInactive) els.focusInactive.style.display = 'none';
  if (els.focusActive) els.focusActive.style.display = 'block';
  if (els.focusBox) els.focusBox.classList.add('active');
  updateTimerDisplay();
}

function showFocusInactive() {
  if (els.focusInactive) els.focusInactive.style.display = 'block';
  if (els.focusActive) els.focusActive.style.display = 'none';
  if (els.focusBox) els.focusBox.classList.remove('active');
  stopTimerUpdate();
}

function updateTimerDisplay() {
  if (!state.focusEndTime) return;

  const now = Date.now();
  const remaining = Math.max(0, state.focusEndTime - now);

  if (remaining <= 0) {
    showFocusInactive();
    return;
  }

  // Format time
  const totalSeconds = Math.ceil(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  if (els.timerDisplay) els.timerDisplay.textContent = timeStr;

  // Progress bar
  const totalDuration = state.focusDuration * 60 * 1000;
  const elapsed = totalDuration - remaining;
  const progress = Math.round((elapsed / totalDuration) * 100);

  if (els.timerProgressFill) {
    els.timerProgressFill.style.width = `${progress}%`;
  }
}

function startTimerUpdate() {
  stopTimerUpdate();
  updateTimerDisplay();
  state.timerInterval = setInterval(updateTimerDisplay, 1000);
}

function stopTimerUpdate() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

function selectDuration(minutes) {
  state.focusDuration = minutes;
  els.pills.forEach(pill => {
    pill.classList.toggle('active', parseInt(pill.dataset.duration) === minutes);
  });
}

async function startFocus() {
  if (state.focusActive) return;

  // Disable button
  if (els.startFocusBtn) {
    els.startFocusBtn.disabled = true;
    els.startFocusBtn.textContent = 'Starting...';
  }

  chrome.runtime.sendMessage({
    action: 'startFocus',
    duration: state.focusDuration,
    locked: true
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('[ZENFLOW] startFocus error:', chrome.runtime.lastError);
      resetStartButton();
      return;
    }

    if (response && response.success) {
      state.focusActive = true;
      state.focusEndTime = response.endTime;
      showFocusActive();
      startTimerUpdate();
    } else {
      showNotification(response?.error || 'Failed to start', 'error');
      resetStartButton();
    }
  });
}

function resetStartButton() {
  if (els.startFocusBtn) {
    els.startFocusBtn.disabled = false;
    els.startFocusBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="11" width="18" height="11" rx="2"></rect>
        <path d="M7 11V7a5 5 0 0110 0v4"></path>
      </svg>
      START FOCUS
    `;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TASKS - All operations go through service worker for proper XP/stats tracking
// ═══════════════════════════════════════════════════════════════════════════

async function loadTasks() {
  try {
    // Use service worker as single source of truth (with retry logic)
    const tasks = await sendMessageToSW({ action: 'getTasks' });
    state.tasks = Array.isArray(tasks) ? tasks : [];
    console.log('[ZENFLOW] Loaded tasks from service worker:', state.tasks.length);
    renderTasks();
  } catch (e) {
    console.error('[ZENFLOW] Failed to load tasks:', e);
    // Fallback to direct storage read if service worker is completely dead
    try {
      const result = await getStorage(['tasks']);
      state.tasks = Array.isArray(result.tasks) ? result.tasks : [];
      console.log('[ZENFLOW] Loaded tasks from storage fallback:', state.tasks.length);
    } catch (e2) {
      state.tasks = [];
    }
    renderTasks();
  }
}

// No longer saving directly - all operations go through service worker
async function saveTasks() {
  // This function is deprecated - tasks are saved via service worker
  // Keeping for backward compatibility but it now syncs via message
  try {
    await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: 'saveTasks', tasks: state.tasks }, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        resolve(response);
      });
    });
    console.log('[ZENFLOW] Tasks synced to service worker:', state.tasks.length);
  } catch (e) {
    console.error('[ZENFLOW] Failed to sync tasks:', e);
    showNotification('Failed to save tasks', 'error');
  }
}

function renderTasks() {
  if (!els.tasksList) return;

  const activeTasks = state.tasks.filter(t => !t.completed);
  const completedTasks = state.tasks.filter(t => t.completed);

  // Update count
  if (els.taskCount) {
    els.taskCount.textContent = `${activeTasks.length} active`;
  }

  // Show empty state or tasks
  if (state.tasks.length === 0) {
    els.tasksList.innerHTML = '<div class="empty-state">No tasks yet. Add one below.</div>';
    return;
  }

  // Render tasks (active first, then completed)
  const allTasks = [...activeTasks, ...completedTasks];
  els.tasksList.innerHTML = allTasks.map(task => `
    <div class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
      <div class="task-checkbox" data-action="toggle">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <span class="task-text">${escapeHtml(task.title || task.text || '')}</span>
      <button class="task-delete" data-action="delete" title="Delete">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  `).join('');
}

async function addTask(text) {
  const trimmed = text.trim();
  if (!trimmed) return;

  // Disable button during operation
  if (els.addTaskBtn) els.addTaskBtn.disabled = true;

  try {
    // Use service worker to add task (ensures proper ID generation and storage)
    const newTask = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'addTask',
        task: { title: trimmed }
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        resolve(response);
      });
    });

    // Update local state with the returned task
    if (newTask && newTask.id) {
      state.tasks.unshift(newTask);
      renderTasks();
      showNotification('Task added', 'success');
    }

    // Clear input
    if (els.newTaskInput) els.newTaskInput.value = '';
  } catch (e) {
    console.error('[ZENFLOW] Failed to add task:', e);
    showNotification('Failed to add task', 'error');
  } finally {
    if (els.addTaskBtn) els.addTaskBtn.disabled = false;
  }
}

async function toggleTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;

  const wasCompleted = task.completed;

  // Optimistic UI update
  task.completed = !wasCompleted;
  task.completedAt = task.completed ? Date.now() : null;
  renderTasks();

  try {
    if (!wasCompleted) {
      // Completing task - use completeTask for XP awards
      await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: 'completeTask', taskId: id }, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
            return;
          }
          resolve(response);
        });
      });
      showNotification('+25 XP earned!', 'success');
    } else {
      // Uncompleting task - use updateTask
      await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'updateTask',
          taskId: id,
          updates: { completed: false, completedAt: null }
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
            return;
          }
          resolve(response);
        });
      });
    }
  } catch (e) {
    console.error('[ZENFLOW] Failed to toggle task:', e);
    // Rollback optimistic update
    task.completed = wasCompleted;
    task.completedAt = wasCompleted ? task.completedAt : null;
    renderTasks();
    showNotification('Failed to update task', 'error');
  }
}

async function deleteTask(id) {
  // Find and remove from local state (optimistic)
  const taskIndex = state.tasks.findIndex(t => t.id === id);
  if (taskIndex === -1) return;

  const removedTask = state.tasks.splice(taskIndex, 1)[0];
  renderTasks();

  try {
    await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: 'deleteTask', taskId: id }, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        resolve(response);
      });
    });
  } catch (e) {
    console.error('[ZENFLOW] Failed to delete task:', e);
    // Rollback
    state.tasks.splice(taskIndex, 0, removedTask);
    renderTasks();
    showNotification('Failed to delete task', 'error');
  }
}

function initTasksListeners() {
  // Add task button
  if (els.addTaskBtn) {
    els.addTaskBtn.addEventListener('click', () => {
      if (els.newTaskInput && els.newTaskInput.value.trim()) {
        addTask(els.newTaskInput.value);
      }
    });
  }

  // Add task on Enter
  if (els.newTaskInput) {
    els.newTaskInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && els.newTaskInput.value.trim()) {
        addTask(els.newTaskInput.value);
      }
    });
  }

  // Task item actions (delegated)
  if (els.tasksList) {
    els.tasksList.addEventListener('click', (e) => {
      const taskItem = e.target.closest('.task-item');
      if (!taskItem) return;

      const taskId = taskItem.dataset.id;
      const action = e.target.closest('[data-action]')?.dataset.action;

      if (action === 'toggle') {
        toggleTask(taskId);
      } else if (action === 'delete') {
        deleteTask(taskId);
      }
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// NOTES
// ═══════════════════════════════════════════════════════════════════════════

async function loadNotes() {
  const { stickyNotes } = await getStorage(['stickyNotes']);
  state.notes = stickyNotes || '';
  console.log('[ZENFLOW] Loaded notes:', state.notes.length, 'chars');

  if (els.notesTextarea) {
    els.notesTextarea.value = state.notes;
  }
  updateNotesCharCount();
}

async function saveNotes() {
  try {
    await setStorage({ stickyNotes: state.notes });
    console.log('[ZENFLOW] Notes saved');
    updateNotesStatus('Saved');
  } catch (e) {
    console.error('[ZENFLOW] Failed to save notes:', e);
    updateNotesStatus('Error saving');
  }
}

function updateNotesStatus(status) {
  if (els.notesStatus) {
    els.notesStatus.textContent = status;
    els.notesStatus.classList.toggle('saved', status === 'Saved');
  }

  if (status === 'Saved' && els.notesLastSaved) {
    const now = new Date();
    els.notesLastSaved.textContent = `Saved ${now.toLocaleTimeString()}`;
  }
}

function updateNotesCharCount() {
  if (els.notesCharCount) {
    els.notesCharCount.textContent = state.notes.length;
  }
}

function initNotesListeners() {
  if (!els.notesTextarea) return;

  els.notesTextarea.addEventListener('input', () => {
    state.notes = els.notesTextarea.value;
    updateNotesCharCount();
    updateNotesStatus('Saving...');

    // Debounce save
    if (state.notesSaveTimeout) {
      clearTimeout(state.notesSaveTimeout);
    }
    state.notesSaveTimeout = setTimeout(() => {
      saveNotes();
    }, 500);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TIME TRACKING ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════

const CATEGORY_ICONS = {
  social: '📱',
  entertainment: '🎬',
  news: '📰',
  shopping: '🛒',
  gaming: '🎮',
  productive: '💻',
  other: '🌐'
};

const CATEGORY_COLORS = {
  social: '#FF6B6B',
  entertainment: '#FFE66D',
  news: '#4ECDC4',
  shopping: '#FF9F43',
  gaming: '#BF00FF',
  productive: '#00FF88',
  other: '#6B7280'
};

async function loadTimeStats() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'getTimeInsights' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[ZENFLOW] getTimeInsights error:', chrome.runtime.lastError);
        resolve(null);
        return;
      }
      resolve(response);
    });
  });
}

async function refreshTimeAnalytics() {
  const data = await loadTimeStats();
  if (!data) return;

  state.timeStats = data.todayStats;
  state.insights = data.insights;

  renderTimeAnalytics();
}

function formatTime(minutes) {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function renderTimeAnalytics() {
  if (!state.timeStats) return;

  const stats = state.timeStats;

  // Update total time
  if (els.totalTimeToday) {
    els.totalTimeToday.textContent = formatTime(stats.totalMinutes);
  }

  // Update productive/waste time
  if (els.productiveTime) {
    els.productiveTime.textContent = formatTime(stats.productiveMinutes);
  }

  if (els.wasteTime) {
    els.wasteTime.textContent = formatTime(stats.wasteMinutes);
  }

  // Render category breakdown
  if (els.categoryBreakdown) {
    const maxMinutes = Math.max(
      ...Object.values(stats.byCategory).map(c => c.totalMinutes),
      1
    );

    const categories = ['social', 'entertainment', 'productive', 'gaming', 'news', 'shopping'];

    els.categoryBreakdown.innerHTML = categories
      .filter(cat => stats.byCategory[cat]?.totalMinutes > 0)
      .map(cat => {
        const catData = stats.byCategory[cat];
        const percent = Math.round((catData.totalMinutes / maxMinutes) * 100);
        return `
          <div class="category-bar">
            <span class="category-label">${CATEGORY_ICONS[cat]} ${cat}</span>
            <div class="category-progress">
              <div class="category-fill ${cat}" style="width: ${percent}%"></div>
            </div>
            <span class="category-time">${formatTime(catData.totalMinutes)}</span>
          </div>
        `;
      }).join('');
  }

  // Render top sites
  if (els.topSitesList) {
    const topSites = stats.topSites.slice(0, 5);

    if (topSites.length === 0) {
      els.topSitesList.innerHTML = '<div class="empty-state">No data yet. Keep browsing!</div>';
    } else {
      els.topSitesList.innerHTML = topSites.map(site => `
        <div class="top-site-item">
          <span class="top-site-domain">
            <span class="top-site-category">${CATEGORY_ICONS[site.category] || '🌐'}</span>
            ${truncateDomain(site.domain)}
          </span>
          <span class="top-site-time">${formatTime(site.totalMinutes)}</span>
        </div>
      `).join('');
    }
  }

  // Render insights
  if (els.insightsList && state.insights) {
    const insights = state.insights.slice(0, 3);

    if (insights.length > 0) {
      els.insightsList.innerHTML = insights.map(insight => `
        <div class="insight-card ${insight.type}">
          <span class="insight-icon">${insight.icon}</span>
          <div class="insight-content">
            <div class="insight-title">${insight.title}</div>
            <div class="insight-message">${insight.message}</div>
          </div>
        </div>
      `).join('');
    } else {
      els.insightsList.innerHTML = '';
    }
  }
}

function truncateDomain(domain) {
  if (domain.length > 20) {
    return domain.substring(0, 18) + '...';
  }
  return domain;
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOCKED SITES
// ═══════════════════════════════════════════════════════════════════════════

async function loadBlockedSites() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'getBlockedSites' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[ZENFLOW] getBlockedSites error:', chrome.runtime.lastError);
        resolve({ defaultSites: [], customSites: [], allSites: [] });
        return;
      }
      resolve(response || { defaultSites: [], customSites: [], allSites: [] });
    });
  });
}

async function refreshBlockedSites() {
  const data = await loadBlockedSites();
  state.blockedSites = data.allSites || [];
  state.customSites = data.customSites || [];
  renderBlockedSites();
}

function renderBlockedSites() {
  if (!els.sitesList) return;

  const allSites = [...new Set([...state.customSites, ...state.blockedSites])];

  if (els.siteCount) {
    els.siteCount.textContent = `${allSites.length} sites`;
  }

  if (allSites.length === 0) {
    els.sitesList.innerHTML = '<div class="empty-state">No sites blocked yet.</div>';
    return;
  }

  els.sitesList.innerHTML = allSites.slice(0, 20).map(site => {
    const isCustom = state.customSites.includes(site);
    return `
      <div class="site-item" data-site="${site}">
        <span class="site-name">${site}</span>
        ${isCustom ? `
          <button class="remove-btn" data-action="remove" title="Remove">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        ` : '<span class="default-badge">default</span>'}
      </div>
    `;
  }).join('');
}

async function addSite(site) {
  let cleanSite = site.trim().toLowerCase();
  cleanSite = cleanSite.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];

  if (!cleanSite || cleanSite.length < 3) {
    showNotification('Please enter a valid website', 'error');
    return;
  }

  if (state.blockedSites.includes(cleanSite) || state.customSites.includes(cleanSite)) {
    showNotification('Site is already blocked', 'error');
    return;
  }

  chrome.runtime.sendMessage({
    action: 'addBlockedSite',
    site: cleanSite
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('[ZENFLOW] addBlockedSite error:', chrome.runtime.lastError);
      showNotification('Failed to add site', 'error');
      return;
    }

    if (response && response.success) {
      showNotification(`Blocked ${cleanSite}`, 'success');
      refreshBlockedSites();
      if (els.newSiteInput) els.newSiteInput.value = '';
    } else {
      showNotification(response?.error || 'Failed to add site', 'error');
    }
  });
}

async function removeSite(site) {
  chrome.runtime.sendMessage({
    action: 'removeBlockedSite',
    site: site
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('[ZENFLOW] removeBlockedSite error:', chrome.runtime.lastError);
      showNotification('Failed to remove site', 'error');
      return;
    }

    if (response && response.success) {
      showNotification(`Unblocked ${site}`, 'success');
      refreshBlockedSites();
    } else {
      showNotification(response?.error || 'Cannot remove during focus', 'error');
    }
  });
}

function initSitesListeners() {
  // Add site button
  if (els.addSiteBtn) {
    els.addSiteBtn.addEventListener('click', () => {
      if (els.newSiteInput && els.newSiteInput.value.trim()) {
        addSite(els.newSiteInput.value);
      }
    });
  }

  // Add site on Enter
  if (els.newSiteInput) {
    els.newSiteInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && els.newSiteInput.value.trim()) {
        addSite(els.newSiteInput.value);
      }
    });
  }

  // Quick add tags
  els.quickTags.forEach(tag => {
    tag.addEventListener('click', () => {
      addSite(tag.dataset.site);
    });
  });

  // Remove site (delegated)
  if (els.sitesList) {
    els.sitesList.addEventListener('click', (e) => {
      const removeBtn = e.target.closest('[data-action="remove"]');
      if (removeBtn) {
        const siteItem = removeBtn.closest('.site-item');
        if (siteItem) {
          removeSite(siteItem.dataset.site);
        }
      }
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FOCUS DURATION LISTENERS
// ═══════════════════════════════════════════════════════════════════════════

function initFocusListeners() {
  // Duration pills
  els.pills.forEach(pill => {
    pill.addEventListener('click', () => {
      selectDuration(parseInt(pill.dataset.duration));
    });
  });

  // Start focus
  if (els.startFocusBtn) {
    els.startFocusBtn.addEventListener('click', startFocus);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showNotification(message, type = 'success') {
  let notification = document.querySelector('.notification');
  if (!notification) {
    notification = document.createElement('div');
    notification.className = 'notification';
    document.body.appendChild(notification);
  }

  notification.className = `notification ${type}`;
  notification.textContent = message;
  notification.classList.add('show');

  setTimeout(() => notification.classList.remove('show'), 2500);
}

// ═══════════════════════════════════════════════════════════════════════════
// SETTINGS - VIBE MODE
// ═══════════════════════════════════════════════════════════════════════════

async function loadVibeSettings() {
  const { vibeMode } = await getStorage(['vibeMode']);
  if (vibeMode) {
    // Set active vibe button
    els.vibeBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.vibe === vibeMode.current);
    });

    // Set ambient sound
    if (els.ambientSelect && vibeMode.ambientSound) {
      els.ambientSelect.value = vibeMode.ambientSound;
    }
  }
}

async function setVibe(vibeName) {
  chrome.runtime.sendMessage({
    action: 'setVibe',
    vibe: vibeName
  }, (response) => {
    if (response && response.success) {
      els.vibeBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.vibe === vibeName);
      });
      showNotification(`Vibe set to ${vibeName}`, 'success');
    }
  });
}

async function setAmbientSound(sound) {
  chrome.runtime.sendMessage({
    action: 'setAmbientSound',
    sound: sound
  }, (response) => {
    if (response && response.success) {
      showNotification(`Ambient: ${sound}`, 'success');
    }
  });
}

function initVibeListeners() {
  // Vibe buttons
  els.vibeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      setVibe(btn.dataset.vibe);
    });
  });

  // Ambient sound select
  if (els.ambientSelect) {
    els.ambientSelect.addEventListener('change', () => {
      setAmbientSound(els.ambientSelect.value);
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SETTINGS - WELLNESS
// ═══════════════════════════════════════════════════════════════════════════

async function loadWellnessSettings() {
  const { wellness } = await getStorage(['wellness']);
  if (wellness) {
    if (els.breakReminders) els.breakReminders.checked = wellness.breakReminders !== false;
    if (els.hydrationReminders) els.hydrationReminders.checked = wellness.hydrationReminders !== false;
    if (els.eyeStrainReminders) els.eyeStrainReminders.checked = wellness.eyeStrainReminders !== false;
  }
}

async function updateWellnessSetting(setting, value) {
  chrome.runtime.sendMessage({
    action: 'updateWellnessSettings',
    settings: { [setting]: value }
  }, (response) => {
    if (response && response.success) {
      const settingName = setting.replace(/([A-Z])/g, ' $1').toLowerCase();
      showNotification(`${settingName} ${value ? 'enabled' : 'disabled'}`, 'success');
    }
  });
}

function initWellnessListeners() {
  if (els.breakReminders) {
    els.breakReminders.addEventListener('change', () => {
      updateWellnessSetting('breakReminders', els.breakReminders.checked);
    });
  }

  if (els.hydrationReminders) {
    els.hydrationReminders.addEventListener('change', () => {
      updateWellnessSetting('hydrationReminders', els.hydrationReminders.checked);
    });
  }

  if (els.eyeStrainReminders) {
    els.eyeStrainReminders.addEventListener('change', () => {
      updateWellnessSetting('eyeStrainReminders', els.eyeStrainReminders.checked);
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SETTINGS - FLOATING NOTES
// ═══════════════════════════════════════════════════════════════════════════

async function loadFloatingNotesSettings() {
  const { floatingNotesSettings } = await getStorage(['floatingNotesSettings']);
  const settings = floatingNotesSettings || { enabled: true, showFAB: true, quickCaptureEnabled: true };

  if (els.floatingNotesEnabled) els.floatingNotesEnabled.checked = settings.enabled !== false;
  if (els.floatingNotesFAB) els.floatingNotesFAB.checked = settings.showFAB !== false;
  if (els.quickCaptureEnabled) els.quickCaptureEnabled.checked = settings.quickCaptureEnabled !== false;
}

async function updateFloatingNotesSetting(setting, value) {
  const { floatingNotesSettings } = await getStorage(['floatingNotesSettings']);
  const updated = {
    enabled: true,
    showFAB: true,
    quickCaptureEnabled: true,
    ...floatingNotesSettings,
    [setting]: value
  };
  await setStorage({ floatingNotesSettings: updated });

  // Notify all tabs to update floating notes
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        action: 'updateFloatingNotesSettings',
        settings: updated
      }).catch(() => {}); // Ignore errors for tabs without content script
    });
  });

  const settingName = setting.replace(/([A-Z])/g, ' $1').toLowerCase();
  showNotification(`${settingName} ${value ? 'enabled' : 'disabled'}`, 'success');
}

function initFloatingNotesListeners() {
  if (els.floatingNotesEnabled) {
    els.floatingNotesEnabled.addEventListener('change', () => {
      updateFloatingNotesSetting('enabled', els.floatingNotesEnabled.checked);
    });
  }

  if (els.floatingNotesFAB) {
    els.floatingNotesFAB.addEventListener('change', () => {
      updateFloatingNotesSetting('showFAB', els.floatingNotesFAB.checked);
    });
  }

  if (els.quickCaptureEnabled) {
    els.quickCaptureEnabled.addEventListener('change', () => {
      updateFloatingNotesSetting('quickCaptureEnabled', els.quickCaptureEnabled.checked);
    });
  }

  // Reset button
  const resetBtn = document.getElementById('resetFloatingNotesBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      // Reset settings to defaults
      const defaultSettings = {
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

      await setStorage({ floatingNotesSettings: defaultSettings });

      // Update UI
      if (els.floatingNotesEnabled) els.floatingNotesEnabled.checked = true;
      if (els.floatingNotesFAB) els.floatingNotesFAB.checked = true;
      if (els.quickCaptureEnabled) els.quickCaptureEnabled.checked = true;

      // Notify all tabs
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        try {
          await chrome.tabs.sendMessage(tab.id, { action: 'resetFloatingNotesSettings' });
        } catch (e) {
          // Tab might not have content script
        }
      }

      showNotification('Floating Notes settings reset!', 'success');
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// REAL-TIME SYNC
// ═══════════════════════════════════════════════════════════════════════════

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;

  // Focus state changed
  if (changes.focus) {
    const focus = changes.focus.newValue;
    if (focus && focus.active) {
      state.focusActive = true;
      state.focusEndTime = focus.endTime;
      state.focusDuration = focus.duration || 25;
      showFocusActive();
      startTimerUpdate();
    } else {
      state.focusActive = false;
      state.focusEndTime = null;
      showFocusInactive();
    }
  }

  // Tasks changed (sync from newtab)
  if (changes.tasks) {
    const newTasks = changes.tasks.newValue;
    if (Array.isArray(newTasks)) {
      state.tasks = newTasks;
      console.log('[ZENFLOW] Tasks synced:', state.tasks.length);
      renderTasks();
    }
  }

  // Notes changed (sync from newtab)
  if (changes.stickyNotes) {
    const newNotes = changes.stickyNotes.newValue || '';
    // Only update if different (prevent loops)
    if (newNotes !== state.notes) {
      state.notes = newNotes;
      if (els.notesTextarea && document.activeElement !== els.notesTextarea) {
        els.notesTextarea.value = state.notes;
      }
      updateNotesCharCount();
      console.log('[ZENFLOW] Notes synced');
    }
  }

  // Time tracking changed
  if (changes.timeTracking) {
    refreshTimeAnalytics();
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// AUTO-REFRESH / PAGE MONITOR
// ═══════════════════════════════════════════════════════════════════════════

const autoRefreshState = {
  activeRefreshes: new Map(), // tabId -> { interval, url, seconds }
  settings: {
    notifyOnChange: true,
    soundOnChange: false
  },
  currentTabId: null,
  countdownInterval: null,
  refreshCounts: new Map(), // tabId -> count
  lastRefreshTime: new Map() // tabId -> timestamp
};

async function loadAutoRefreshState() {
  try {
    const { autoRefresh } = await getStorage(['autoRefresh']);
    if (autoRefresh) {
      autoRefreshState.settings = { ...autoRefreshState.settings, ...autoRefresh.settings };
      // Restore active refreshes from storage
      if (autoRefresh.active) {
        for (const [tabId, data] of Object.entries(autoRefresh.active)) {
          autoRefreshState.activeRefreshes.set(parseInt(tabId), data);
        }
      }
    }

    // Update UI elements
    const notifyToggle = document.getElementById('notifyOnChange');
    const soundToggle = document.getElementById('soundOnChange');
    if (notifyToggle) notifyToggle.checked = autoRefreshState.settings.notifyOnChange;
    if (soundToggle) soundToggle.checked = autoRefreshState.settings.soundOnChange;

    renderActiveRefreshList();
    updateCurrentTabInfo();
  } catch (e) {
    console.error('[ZENFLOW] Error loading auto-refresh state:', e);
  }
}

async function saveAutoRefreshState() {
  const active = {};
  for (const [tabId, data] of autoRefreshState.activeRefreshes) {
    active[tabId] = data;
  }
  await setStorage({
    autoRefresh: {
      settings: autoRefreshState.settings,
      active
    }
  });
}

// Timer display functions
function showActiveTimerSection(tabId, url, seconds) {
  const timerSection = document.getElementById('activeTimerSection');
  const startControls = document.getElementById('refreshStartControls');
  const tabTitle = document.getElementById('refreshTabTitle');
  const countdown = document.getElementById('refreshCountdown');
  const totalCount = document.getElementById('refreshTotalCount');

  if (timerSection) timerSection.style.display = 'block';
  if (startControls) startControls.style.display = 'none';

  try {
    const hostname = new URL(url).hostname;
    if (tabTitle) tabTitle.textContent = hostname;
  } catch {
    if (tabTitle) tabTitle.textContent = 'Current Tab';
  }

  // Initialize refresh count if not exists
  if (!autoRefreshState.refreshCounts.has(tabId)) {
    autoRefreshState.refreshCounts.set(tabId, 0);
  }
  if (totalCount) {
    totalCount.textContent = autoRefreshState.refreshCounts.get(tabId) || 0;
  }

  // Set initial countdown
  autoRefreshState.lastRefreshTime.set(tabId, Date.now());

  // Start countdown interval
  startCountdownTimer(tabId, seconds);
}

function hideActiveTimerSection() {
  const timerSection = document.getElementById('activeTimerSection');
  const startControls = document.getElementById('refreshStartControls');

  if (timerSection) timerSection.style.display = 'none';
  if (startControls) startControls.style.display = 'block';

  stopCountdownTimer();
}

function startCountdownTimer(tabId, intervalSeconds) {
  stopCountdownTimer();

  const update = () => {
    const lastRefresh = autoRefreshState.lastRefreshTime.get(tabId) || Date.now();
    const elapsed = Math.floor((Date.now() - lastRefresh) / 1000);
    const remaining = Math.max(0, intervalSeconds - (elapsed % intervalSeconds));

    // Update countdown number
    const countdown = document.getElementById('refreshCountdown');
    if (countdown) countdown.textContent = remaining;

    // Update progress ring (283 = 2 * PI * 45)
    const progressRing = document.getElementById('refreshProgressRing');
    if (progressRing) {
      const progress = (remaining / intervalSeconds);
      const offset = 283 * (1 - progress);
      progressRing.style.strokeDashoffset = offset;
    }

    // Update refresh count
    const totalCount = document.getElementById('refreshTotalCount');
    if (totalCount) {
      totalCount.textContent = autoRefreshState.refreshCounts.get(tabId) || 0;
    }

    // Check if refresh just happened
    if (remaining === intervalSeconds && elapsed > 0) {
      const currentCount = autoRefreshState.refreshCounts.get(tabId) || 0;
      autoRefreshState.refreshCounts.set(tabId, currentCount + 1);
      autoRefreshState.lastRefreshTime.set(tabId, Date.now());
    }
  };

  update();
  autoRefreshState.countdownInterval = setInterval(update, 100);
}

function stopCountdownTimer() {
  if (autoRefreshState.countdownInterval) {
    clearInterval(autoRefreshState.countdownInterval);
    autoRefreshState.countdownInterval = null;
  }
}

async function updateCurrentTabInfo() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      const urlDisplay = document.getElementById('currentTabUrl');
      const startBtn = document.getElementById('startAutoRefreshBtn');
      const stopBtn = document.getElementById('stopAutoRefreshBtn');

      if (urlDisplay) {
        try {
          const url = new URL(tab.url);
          urlDisplay.textContent = url.hostname + url.pathname.substring(0, 30);
        } catch {
          urlDisplay.textContent = tab.title || 'Current Tab';
        }
      }

      // Check if this tab is already being refreshed
      const isActive = autoRefreshState.activeRefreshes.has(tab.id);
      if (isActive) {
        const data = autoRefreshState.activeRefreshes.get(tab.id);
        autoRefreshState.currentTabId = tab.id;
        showActiveTimerSection(tab.id, tab.url, data.seconds);
      } else {
        hideActiveTimerSection();
      }
      if (startBtn) startBtn.style.display = isActive ? 'none' : 'block';
      if (stopBtn) stopBtn.style.display = isActive ? 'block' : 'none';
    }
  } catch (e) {
    console.error('[ZENFLOW] Error updating tab info:', e);
  }
}

async function startAutoRefresh() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      showNotification('Cannot refresh this tab', 'error');
      return;
    }

    // Don't allow refreshing extension pages
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      showNotification('Cannot auto-refresh browser pages', 'error');
      return;
    }

    const intervalSelect = document.getElementById('refreshInterval');
    const seconds = parseInt(intervalSelect?.value || '30');

    // Send message to background to start refresh
    chrome.runtime.sendMessage({
      action: 'startAutoRefresh',
      tabId: tab.id,
      url: tab.url,
      seconds,
      notifyOnChange: autoRefreshState.settings.notifyOnChange,
      soundOnChange: autoRefreshState.settings.soundOnChange
    }, (response) => {
      if (response && response.success) {
        autoRefreshState.activeRefreshes.set(tab.id, {
          url: tab.url,
          seconds,
          startedAt: Date.now()
        });
        autoRefreshState.currentTabId = tab.id;
        autoRefreshState.lastRefreshTime.set(tab.id, Date.now());
        autoRefreshState.refreshCounts.set(tab.id, 0);
        saveAutoRefreshState();
        renderActiveRefreshList();
        showActiveTimerSection(tab.id, tab.url, seconds);
        showNotification(`Auto-refresh started (every ${seconds}s)`, 'success');
      } else {
        showNotification(response?.error || 'Failed to start auto-refresh', 'error');
      }
    });
  } catch (e) {
    console.error('[ZENFLOW] Error starting auto-refresh:', e);
    showNotification('Failed to start auto-refresh', 'error');
  }
}

async function stopAutoRefresh(tabId) {
  try {
    if (!tabId) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      tabId = tab?.id;
    }

    if (!tabId) return;

    chrome.runtime.sendMessage({
      action: 'stopAutoRefresh',
      tabId
    }, (response) => {
      if (response && response.success) {
        autoRefreshState.activeRefreshes.delete(tabId);
        autoRefreshState.refreshCounts.delete(tabId);
        autoRefreshState.lastRefreshTime.delete(tabId);
        if (autoRefreshState.currentTabId === tabId) {
          autoRefreshState.currentTabId = null;
          hideActiveTimerSection();
        }
        saveAutoRefreshState();
        renderActiveRefreshList();
        updateCurrentTabInfo();
        showNotification('Auto-refresh stopped', 'success');
      }
    });
  } catch (e) {
    console.error('[ZENFLOW] Error stopping auto-refresh:', e);
  }
}

function renderActiveRefreshList() {
  const list = document.getElementById('activeRefreshList');
  const count = document.getElementById('refreshCount');

  if (!list) return;

  const refreshes = Array.from(autoRefreshState.activeRefreshes.entries());

  if (count) {
    count.textContent = `${refreshes.length} active`;
  }

  if (refreshes.length === 0) {
    list.innerHTML = '<div class="empty-state">No active auto-refresh monitors</div>';
    return;
  }

  list.innerHTML = refreshes.map(([tabId, data]) => {
    let displayUrl = data.url;
    try {
      const url = new URL(data.url);
      displayUrl = url.hostname;
    } catch {}

    return `
      <div class="site-item" data-tab-id="${tabId}">
        <span class="site-name">
          <span style="color: var(--green);">●</span>
          ${displayUrl} (${data.seconds}s)
        </span>
        <button class="remove-btn" data-action="stop-refresh" style="opacity: 1;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    `;
  }).join('');
}

function initAutoRefreshListeners() {
  // Start button
  const startBtn = document.getElementById('startAutoRefreshBtn');
  if (startBtn) {
    startBtn.addEventListener('click', startAutoRefresh);
  }

  // Stop button (in controls)
  const stopBtn = document.getElementById('stopAutoRefreshBtn');
  if (stopBtn) {
    stopBtn.addEventListener('click', () => stopAutoRefresh());
  }

  // Stop button (in active timer section)
  const stopActiveBtn = document.getElementById('stopActiveRefreshBtn');
  if (stopActiveBtn) {
    stopActiveBtn.addEventListener('click', () => {
      if (autoRefreshState.currentTabId) {
        stopAutoRefresh(autoRefreshState.currentTabId);
      }
    });
  }

  // List stop buttons (delegated)
  const list = document.getElementById('activeRefreshList');
  if (list) {
    list.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action="stop-refresh"]');
      if (btn) {
        const item = btn.closest('.site-item');
        const tabId = parseInt(item?.dataset.tabId);
        if (tabId) stopAutoRefresh(tabId);
      }
    });
  }

  // Settings toggles
  const notifyToggle = document.getElementById('notifyOnChange');
  if (notifyToggle) {
    notifyToggle.addEventListener('change', () => {
      autoRefreshState.settings.notifyOnChange = notifyToggle.checked;
      saveAutoRefreshState();
    });
  }

  const soundToggle = document.getElementById('soundOnChange');
  if (soundToggle) {
    soundToggle.addEventListener('change', () => {
      autoRefreshState.settings.soundOnChange = soundToggle.checked;
      saveAutoRefreshState();
    });
  }
}

// Floating Notes Quick Access Button
function initFloatingNotesQuickAccess() {
  const btn = document.getElementById('openFloatingNoteBtn');
  if (btn) {
    btn.addEventListener('click', async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.id) {
          chrome.tabs.sendMessage(tab.id, { action: 'openFloatingNote' });
          showNotification('Opening note on page...', 'success');
        }
      } catch (e) {
        showNotification('Cannot open note on this page', 'error');
      }
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// THEME TOGGLE (Dark/Light)
// ═══════════════════════════════════════════════════════════════════════════

async function loadTheme() {
  try {
    const { appTheme } = await getStorage(['appTheme']);
    const theme = appTheme || 'dark';
    applyTheme(theme);
  } catch (e) {
    console.error('[ZENFLOW] Error loading theme:', e);
  }
}

function applyTheme(theme) {
  const html = document.documentElement;
  const iconDark = document.getElementById('themeIconDark');
  const iconLight = document.getElementById('themeIconLight');

  if (theme === 'light') {
    html.setAttribute('data-theme', 'light');
    if (iconDark) iconDark.style.display = 'none';
    if (iconLight) iconLight.style.display = 'block';
  } else {
    html.removeAttribute('data-theme');
    if (iconDark) iconDark.style.display = 'block';
    if (iconLight) iconLight.style.display = 'none';
  }
}

function initThemeToggle() {
  const btn = document.getElementById('themeToggleBtn');
  if (btn) {
    btn.addEventListener('click', async () => {
      const html = document.documentElement;
      const currentTheme = html.getAttribute('data-theme');
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';

      applyTheme(newTheme);
      await setStorage({ appTheme: newTheme });
      showNotification(`${newTheme === 'light' ? '☀️ Light' : '🌙 Dark'} theme activated`, 'success');
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

function showLoadingState(show = true) {
  const loadingOverlay = document.getElementById('loadingOverlay');
  if (loadingOverlay) {
    loadingOverlay.style.display = show ? 'flex' : 'none';
  }
  // Also toggle main content opacity
  const mainContent = document.querySelector('.popup-container');
  if (mainContent) {
    mainContent.style.opacity = show ? '0.5' : '1';
  }
}

async function init() {
  const startTime = Date.now();

  try {
    console.log('[ZENFLOW] Initializing v3.0...');

    // Initialize tabs first (sync operation)
    initTabs();

    // Initialize all listeners (sync operations)
    initFocusListeners();
    initTasksListeners();
    initSitesListeners();
    initVibeListeners();
    initWellnessListeners();
    initFloatingNotesListeners();
    initAutoRefreshListeners();
    initFloatingNotesQuickAccess();
    initThemeToggle();

    // CRITICAL: Ensure service worker is awake before loading data
    const swReady = await ensureServiceWorkerReady();
    if (!swReady) {
      console.warn('[ZENFLOW] Service worker not ready, some features may not work');
    }

    // Load all data in parallel with error isolation
    const loadResults = await Promise.allSettled([
      checkFocusState(),
      loadTasks(),
      refreshBlockedSites(),
      loadVibeSettings(),
      loadWellnessSettings(),
      loadFloatingNotesSettings(),
      loadAutoRefreshState(),
      loadTheme()
    ]);

    // Log any failures but don't crash
    loadResults.forEach((result, index) => {
      if (result.status === 'rejected') {
        const names = ['focus', 'tasks', 'sites', 'vibe', 'wellness', 'floatingNotes', 'autoRefresh', 'theme'];
        console.error(`[ZENFLOW] Failed to load ${names[index]}:`, result.reason);
      }
    });

    const loadTime = Date.now() - startTime;
    console.log(`[ZENFLOW] Initialized successfully in ${loadTime}ms`);

    // Hide loading state
    showLoadingState(false);

  } catch (e) {
    console.error('[ZENFLOW] Init error:', e);
    showLoadingState(false);
    showNotification('Some features may not work correctly', 'error');
  }
}

// Cleanup on popup close
window.addEventListener('beforeunload', () => {
  // Clear any intervals
  stopTimerUpdate();
  if (autoRefreshState.countdownInterval) {
    clearInterval(autoRefreshState.countdownInterval);
  }
  console.log('[ZENFLOW] Popup closing, cleaned up intervals');
});

document.addEventListener('DOMContentLoaded', init);
