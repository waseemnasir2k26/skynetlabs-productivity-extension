// ═══════════════════════════════════════════════════════════════════════════
// HYPERFOCUS // SKYNETLABS v3.0 — Side Panel Controller
// Quick Actions Panel for Neural-Link Productivity
// www.skynetjoe.com
// ═══════════════════════════════════════════════════════════════════════════

'use strict';

// State
const state = {
  focusActive: false,
  focusEndTime: null,
  focusDuration: 25,
  billingActive: false,
  billingStartTime: null,
  billingProjectName: '',
  billingRate: 50,
  todayEarnings: 0,
  tasks: [],
  focusTimerInterval: null,
  billingTimerInterval: null,
  wellnessReminder: null
};

// DOM Elements
const els = {
  todayEarnings: document.getElementById('todayEarnings'),
  focusStatus: document.getElementById('focusStatus'),
  focusTimer: document.getElementById('focusTimer'),
  billingStatus: document.getElementById('billingStatus'),
  billingProject: document.getElementById('billingProject'),
  billingTimer: document.getElementById('billingTimer'),
  billingEarning: document.getElementById('billingEarning'),
  stopBillingBtn: document.getElementById('stopBillingBtn'),
  toggleFocusBtn: document.getElementById('toggleFocusBtn'),
  focusBtnText: document.getElementById('focusBtnText'),
  toggleBillingBtn: document.getElementById('toggleBillingBtn'),
  billingBtnText: document.getElementById('billingBtnText'),
  addMissionBtn: document.getElementById('addMissionBtn'),
  aiInsight: document.getElementById('aiInsight'),
  aiMessage: document.getElementById('aiMessage'),
  wellnessReminder: document.getElementById('wellnessReminder'),
  wellnessIcon: document.getElementById('wellnessIcon'),
  wellnessTitle: document.getElementById('wellnessTitle'),
  wellnessSubtitle: document.getElementById('wellnessSubtitle'),
  dismissWellness: document.getElementById('dismissWellness'),
  focusMinutes: document.getElementById('focusMinutes'),
  tasksCompleted: document.getElementById('tasksCompleted'),
  missionsList: document.getElementById('missionsList')
};

// ═══════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

async function init() {
  console.log('[HYPERFOCUS] Side Panel initializing...');

  // Load initial data
  await Promise.all([
    loadFocusStatus(),
    loadBillingStatus(),
    loadTodayStats(),
    loadTasks(),
    loadAIInsight()
  ]);

  // Initialize event listeners
  initEventListeners();

  // Listen for storage changes
  chrome.storage.onChanged.addListener(handleStorageChange);

  console.log('[HYPERFOCUS] Side Panel ready');
}

function initEventListeners() {
  // Toggle Focus
  els.toggleFocusBtn?.addEventListener('click', toggleFocus);

  // Toggle Billing
  els.toggleBillingBtn?.addEventListener('click', toggleBilling);

  // Stop Billing
  els.stopBillingBtn?.addEventListener('click', stopBilling);

  // Add Mission
  els.addMissionBtn?.addEventListener('click', showAddMissionPrompt);

  // Dismiss Wellness
  els.dismissWellness?.addEventListener('click', dismissWellnessReminder);

  // Mission clicks
  els.missionsList?.addEventListener('click', handleMissionClick);
}

// ═══════════════════════════════════════════════════════════════════════════
// FOCUS MODE
// ═══════════════════════════════════════════════════════════════════════════

async function loadFocusStatus() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'getFocusStatus' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[HYPERFOCUS] getFocusStatus error:', chrome.runtime.lastError);
        resolve(null);
        return;
      }

      if (response && response.active) {
        state.focusActive = true;
        state.focusEndTime = response.endTime;
        state.focusDuration = response.duration || 25;
        showFocusActive();
      } else {
        state.focusActive = false;
        hideFocusActive();
      }
      resolve(response);
    });
  });
}

function showFocusActive() {
  els.focusStatus?.classList.remove('hidden');
  els.focusBtnText.textContent = 'Focus Active';
  startFocusTimer();
}

function hideFocusActive() {
  els.focusStatus?.classList.add('hidden');
  els.focusBtnText.textContent = 'Start Focus (25m)';
  stopFocusTimer();
}

function startFocusTimer() {
  stopFocusTimer();
  updateFocusTimer();
  state.focusTimerInterval = setInterval(updateFocusTimer, 1000);
}

function stopFocusTimer() {
  if (state.focusTimerInterval) {
    clearInterval(state.focusTimerInterval);
    state.focusTimerInterval = null;
  }
}

function updateFocusTimer() {
  if (!state.focusEndTime) return;

  const now = Date.now();
  const remaining = Math.max(0, state.focusEndTime - now);

  if (remaining <= 0) {
    hideFocusActive();
    return;
  }

  const totalSeconds = Math.ceil(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (els.focusTimer) {
    els.focusTimer.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
}

async function toggleFocus() {
  if (state.focusActive) {
    // Can't end focus early in this view - show message
    showNotification('Focus session is locked. Wait for completion.');
    return;
  }

  // Start focus
  chrome.runtime.sendMessage({
    action: 'startFocus',
    duration: 25,
    locked: true
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('[HYPERFOCUS] startFocus error:', chrome.runtime.lastError);
      return;
    }

    if (response && response.success) {
      state.focusActive = true;
      state.focusEndTime = response.endTime;
      showFocusActive();
      showNotification('Focus mode engaged!');
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// BILLING
// ═══════════════════════════════════════════════════════════════════════════

async function loadBillingStatus() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'getTodayBillableStats' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[HYPERFOCUS] getTodayBillableStats error:', chrome.runtime.lastError);
        resolve(null);
        return;
      }

      if (response) {
        state.todayEarnings = response.earnings?.today || 0;

        if (response.currentSession) {
          state.billingActive = true;
          state.billingStartTime = response.currentSession.startTime;
          state.billingProjectName = response.currentSession.projectName || 'Project';
          state.billingRate = response.currentSession.hourlyRate || 50;
          showBillingActive();
        } else {
          state.billingActive = false;
          hideBillingActive();
        }

        updateEarningsDisplay();
      }
      resolve(response);
    });
  });
}

function showBillingActive() {
  els.billingStatus?.classList.remove('hidden');
  els.billingBtnText.textContent = 'Billing Active';

  if (els.billingProject) {
    els.billingProject.textContent = state.billingProjectName;
  }

  startBillingTimer();
}

function hideBillingActive() {
  els.billingStatus?.classList.add('hidden');
  els.billingBtnText.textContent = 'Start Billing';
  stopBillingTimer();
}

function startBillingTimer() {
  stopBillingTimer();
  updateBillingTimer();
  state.billingTimerInterval = setInterval(updateBillingTimer, 1000);
}

function stopBillingTimer() {
  if (state.billingTimerInterval) {
    clearInterval(state.billingTimerInterval);
    state.billingTimerInterval = null;
  }
}

function updateBillingTimer() {
  if (!state.billingStartTime) return;

  const elapsed = Math.floor((Date.now() - state.billingStartTime) / 1000);
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

  if (els.billingTimer) {
    els.billingTimer.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  // Calculate earnings
  const hoursWorked = elapsed / 3600;
  const currentEarning = hoursWorked * state.billingRate;

  if (els.billingEarning) {
    els.billingEarning.textContent = `$${currentEarning.toFixed(2)}`;
  }

  // Update total today
  updateEarningsDisplay(currentEarning);
}

function updateEarningsDisplay(sessionEarnings = 0) {
  const total = state.todayEarnings + sessionEarnings;
  if (els.todayEarnings) {
    els.todayEarnings.textContent = total.toFixed(2);
  }
}

async function toggleBilling() {
  if (state.billingActive) {
    // Already active, do nothing (use stop button)
    return;
  }

  // Start billing with default project
  chrome.runtime.sendMessage({
    action: 'startBillableSession',
    projectId: 'general'
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('[HYPERFOCUS] startBillableSession error:', chrome.runtime.lastError);
      return;
    }

    if (response && response.success) {
      loadBillingStatus();
      showNotification('Billing started!');
    }
  });
}

async function stopBilling() {
  chrome.runtime.sendMessage({ action: 'endBillableSession' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('[HYPERFOCUS] endBillableSession error:', chrome.runtime.lastError);
      return;
    }

    if (response && response.success) {
      state.billingActive = false;
      hideBillingActive();
      loadBillingStatus(); // Refresh stats
      showNotification('Billing stopped!');
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TASKS / MISSIONS
// ═══════════════════════════════════════════════════════════════════════════

async function loadTasks() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['tasks'], (result) => {
      if (chrome.runtime.lastError) {
        console.error('[HYPERFOCUS] loadTasks error:', chrome.runtime.lastError);
        resolve([]);
        return;
      }

      state.tasks = result.tasks || [];
      renderMissions();
      resolve(state.tasks);
    });
  });
}

function renderMissions() {
  if (!els.missionsList) return;

  const activeTasks = state.tasks.filter(t => !t.completed).slice(0, 5);

  if (activeTasks.length === 0) {
    els.missionsList.innerHTML = `
      <div class="mission-item" style="justify-content: center; color: var(--text-muted);">
        No active missions
      </div>
    `;
    return;
  }

  els.missionsList.innerHTML = activeTasks.map(task => `
    <div class="mission-item" data-id="${task.id}">
      <div class="mission-checkbox">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <span class="mission-text">${escapeHtml(task.title || task.text || '')}</span>
    </div>
  `).join('');
}

function handleMissionClick(e) {
  const missionItem = e.target.closest('.mission-item');
  if (!missionItem || !missionItem.dataset.id) return;

  const taskId = missionItem.dataset.id;
  toggleTask(taskId);
}

async function toggleTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;

  task.completed = !task.completed;
  task.completedAt = task.completed ? Date.now() : null;

  await chrome.storage.local.set({ tasks: state.tasks });
  renderMissions();
  loadTodayStats(); // Update completed count
}

function showAddMissionPrompt() {
  const title = prompt('Enter mission objective:');
  if (!title || !title.trim()) return;

  const newTask = {
    id: Date.now().toString(),
    title: title.trim(),
    completed: false,
    createdAt: Date.now()
  };

  state.tasks.unshift(newTask);
  chrome.storage.local.set({ tasks: state.tasks });
  renderMissions();
  showNotification('Mission added!');
}

// ═══════════════════════════════════════════════════════════════════════════
// TODAY'S STATS
// ═══════════════════════════════════════════════════════════════════════════

async function loadTodayStats() {
  // Get focus minutes
  const { focus, tasks } = await chrome.storage.local.get(['focus', 'tasks']);

  // Today's focus minutes
  if (els.focusMinutes) {
    els.focusMinutes.textContent = focus?.totalFocusMinutes || 0;
  }

  // Today's completed tasks
  if (els.tasksCompleted) {
    const today = new Date().toDateString();
    const completedToday = (tasks || []).filter(t =>
      t.completed && t.completedAt && new Date(t.completedAt).toDateString() === today
    ).length;
    els.tasksCompleted.textContent = completedToday;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// AI INSIGHTS
// ═══════════════════════════════════════════════════════════════════════════

async function loadAIInsight() {
  // Request AI insight from background
  chrome.runtime.sendMessage({ action: 'getAIInsight' }, (response) => {
    if (chrome.runtime.lastError || !response) {
      // Use fallback insight
      setAIInsight(getFallbackInsight());
      return;
    }

    if (response.insight) {
      setAIInsight(response.insight);
    } else {
      setAIInsight(getFallbackInsight());
    }
  });
}

function setAIInsight(message) {
  if (els.aiMessage) {
    els.aiMessage.textContent = message;
  }
}

function getFallbackInsight() {
  const insights = [
    'Start your day with a 25-minute focus session to build momentum.',
    'Consider tackling your most challenging task during peak energy hours.',
    'Short breaks between focus sessions can boost overall productivity.',
    'Tracking billable hours helps identify your most profitable work patterns.',
    'Blocking distractions is proven to increase deep work by 40%.',
    'Your consistency is building powerful productivity habits.',
    'Remember: Progress over perfection. Keep the momentum going.'
  ];
  return insights[Math.floor(Math.random() * insights.length)];
}

// ═══════════════════════════════════════════════════════════════════════════
// WELLNESS
// ═══════════════════════════════════════════════════════════════════════════

function showWellnessReminder(type) {
  const reminders = {
    break: { icon: '☕', title: 'Break Time', subtitle: 'Take a 5-minute rest' },
    hydration: { icon: '💧', title: 'Hydration Check', subtitle: 'Time to drink some water!' },
    eyestrain: { icon: '👁️', title: 'Eye Break', subtitle: 'Look 20ft away for 20 seconds' },
    stretch: { icon: '🧘', title: 'Stretch Break', subtitle: 'Stand up and stretch' }
  };

  const reminder = reminders[type] || reminders.break;

  if (els.wellnessIcon) els.wellnessIcon.textContent = reminder.icon;
  if (els.wellnessTitle) els.wellnessTitle.textContent = reminder.title;
  if (els.wellnessSubtitle) els.wellnessSubtitle.textContent = reminder.subtitle;

  els.wellnessReminder?.classList.remove('hidden');
  state.wellnessReminder = type;
}

function dismissWellnessReminder() {
  els.wellnessReminder?.classList.add('hidden');

  // Notify background that reminder was acknowledged
  if (state.wellnessReminder) {
    chrome.runtime.sendMessage({
      action: 'wellnessReminderDone',
      type: state.wellnessReminder
    });
    state.wellnessReminder = null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// STORAGE CHANGE HANDLER
// ═══════════════════════════════════════════════════════════════════════════

function handleStorageChange(changes, area) {
  if (area !== 'local') return;

  // Focus changed
  if (changes.focus) {
    const focus = changes.focus.newValue;
    if (focus && focus.active) {
      state.focusActive = true;
      state.focusEndTime = focus.endTime;
      showFocusActive();
    } else {
      state.focusActive = false;
      hideFocusActive();
    }
  }

  // Tasks changed
  if (changes.tasks) {
    state.tasks = changes.tasks.newValue || [];
    renderMissions();
    loadTodayStats();
  }

  // Freelancer changed
  if (changes.freelancer) {
    loadBillingStatus();
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

function showNotification(message) {
  // Simple console log for now - could add toast UI
  console.log('[HYPERFOCUS]', message);
}

// ═══════════════════════════════════════════════════════════════════════════
// LISTEN FOR MESSAGES FROM BACKGROUND
// ═══════════════════════════════════════════════════════════════════════════

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target === 'sidepanel') {
    switch (message.action) {
      case 'showWellnessReminder':
        showWellnessReminder(message.type);
        break;
      case 'updateAIInsight':
        setAIInsight(message.insight);
        break;
    }
  }
});

// Initialize
document.addEventListener('DOMContentLoaded', init);
