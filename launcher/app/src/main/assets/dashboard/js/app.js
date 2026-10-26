/* ═══════════════════════════════════════════════════════════
   CleanYourTV Embedded Dashboard — Application Logic
   ═══════════════════════════════════════════════════════════ */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function createElement(tag, className, textContent) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (textContent) el.textContent = textContent;
  return el;
}

// ── PocketBase API & Dashboard To-Dos ─────────────────────

const PB_API_URL = 'http://192.168.4.32:8090/api/collections/todos/records';

const FALLBACK_TODAY = [
  { text: 'Buy groceries', done: true },
  { text: 'Morning workout', done: false, tag: 'urgent' },
  { text: 'Call dentist for appointment', done: false },
  { text: 'Review pull requests', done: true },
  { text: 'Cook dinner — try new recipe', done: false },
];

const FALLBACK_WEEK = [
  { text: 'Car oil change', done: false, tag: 'normal' },
  { text: 'Submit quarterly report', done: false, tag: 'urgent' },
  { text: 'Date night — make reservation', done: false },
  { text: 'Clean garage', done: false },
];

const ALL_RECIPES = [
  { name: 'Creamy Garlic Butter Tuscan Salmon', emoji: '🐟', bg: '#2A1810', meta: 'Pan-seared salmon with sun-dried tomatoes & spinach in garlic cream sauce', time: '25 min' },
  { name: 'Sheet Pan Lemon Herb Chicken & Veggies', emoji: '🍗', bg: '#1A2418', meta: 'Tender chicken thighs with zucchini, bell peppers, asparagus & rosemary', time: '35 min' },
  { name: 'Thai Coconut Red Curry with Tofu', emoji: '🍲', bg: '#2A1A10', meta: 'Rich coconut broth with crispy tofu, bamboo shoots & jasmine rice', time: '30 min' },
  { name: 'Mushroom Risotto with Truffle Oil', emoji: '🍄', bg: '#201A14', meta: 'Creamy Arborio rice with wild cremini, parmesan & white truffle drizzle', time: '40 min' },
  { name: 'Spicy Peanut Noodles with Crispy Veggies', emoji: '🍜', bg: '#261814', meta: 'Udon noodles in sesame peanut sauce with scallions, edamame & chili oil', time: '20 min' },
  { name: 'Mediterranean Baked Cod with Olives & Feta', emoji: '🫒', bg: '#162228', meta: 'Flaky cod with cherry tomatoes, kalamata olives, capers & fresh oregano', time: '25 min' },
  { name: 'Korean Bibimbap with Fried Egg', emoji: '🍚', bg: '#241818', meta: 'Warm rice bowl with sautéed spinach, mushrooms, carrots & gochujang sauce', time: '30 min' },
  { name: 'Cast-Iron Ribeye with Herb Compound Butter', emoji: '🥩', bg: '#2A1212', meta: 'Reverse-seared steak with garlic butter, roasted asparagus & baby potatoes', time: '35 min' },
];

const CALENDAR_EVENTS = [
  {
    day: 'TODAY',
    events: [
      { time: '10:00 AM', title: 'Team Sync & Standup', duration: '30 min', dot: 'lavender' },
      { time: '1:30 PM',  title: 'Project Architecture Review', duration: '1 hr', dot: 'rose' },
      { time: '4:00 PM',  title: 'Design Check-in', duration: '45 min', dot: 'peach' },
    ],
  },
  {
    day: 'TOMORROW',
    events: [
      { time: '9:30 AM',  title: 'Client Demo & Feedback', duration: '45 min', dot: 'sky' },
      { time: '2:00 PM',  title: 'Sprint Planning', duration: '1 hr', dot: 'mint' },
    ],
  },
];

function setSyncStatus(online) {
  const dot = $('#pb-status-dot');
  if (!dot) return;
  if (online) {
    dot.classList.remove('offline');
    dot.title = 'PocketBase Online & Synced';
  } else {
    dot.classList.add('offline');
    dot.title = 'PocketBase Offline (showing fallback)';
  }
}

async function fetchPocketBaseTodos() {
  try {
    const res = await fetch(PB_API_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    setSyncStatus(true);
    return data.items || [];
  } catch (err) {
    console.warn('PocketBase fetch failed:', err);
    setSyncStatus(false);
    return null;
  }
}

async function updatePocketBaseStatus(id, newStatus) {
  try {
    const res = await fetch(`${PB_API_URL}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    setSyncStatus(true);
    return await res.json();
  } catch (err) {
    console.error('Failed to update todo status:', err);
    setSyncStatus(false);
  }
}

function categorizeTodo(item) {
  const isArchived = item.status === 'archived';
  const isWeekTagged = /\[week\]|\(week\)|#week/i.test(item.task);
  const cleanText = item.task.replace(/\[week\]|\(week\)|#week/gi, '').trim();

  let tag = null;
  if (isArchived) tag = 'archived';
  else if (isWeekTagged) tag = 'week';

  return {
    id: item.id,
    text: cleanText || item.task,
    rawText: item.task,
    done: item.status === 'done',
    status: item.status,
    tag: tag,
    isWeek: isArchived || isWeekTagged,
  };
}

function createTodoItem(item, onToggle) {
  const li = createElement('li', `todo-item${item.done ? ' done' : ''}`);
  li.setAttribute('tabindex', '0');
  if (item.id) li.dataset.id = item.id;

  let tagHTML = '';
  if (item.tag) {
    tagHTML = `<span class="todo-item__tag todo-item__tag--${item.tag}">${item.tag}</span>`;
  }

  const metaText = item.status === 'done'
    ? 'Completed'
    : (item.status === 'archived' ? 'Archived' : 'PocketBase · Open');

  li.innerHTML = `
    <div class="todo-item__check">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12"/></svg>
    </div>
    <div class="todo-item__content">
      <span class="todo-item__text">${item.text}</span>
      <span class="todo-item__meta">${metaText}</span>
    </div>
    ${tagHTML}
  `;

  const toggle = () => {
    item.done = !item.done;
    li.classList.toggle('done', item.done);
    const meta = li.querySelector('.todo-item__meta');
    if (meta) meta.textContent = item.done ? 'Completed' : 'PocketBase · Open';
    if (onToggle) onToggle(item);
  };

  li.addEventListener('click', toggle);
  li.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.keyCode === 13 || e.keyCode === 23) {
      e.preventDefault();
      toggle();
    }
  });

  return li;
}

async function renderTodos() {
  const unifiedList = $('#todo-list');
  const countBadge = $('#todo-display-badge');
  const items = await fetchPocketBaseTodos();

  const handleToggle = (item) => {
    if (!item.id) return;
    const nextStatus = item.done ? 'done' : 'pending';
    updatePocketBaseStatus(item.id, nextStatus);
  };

  if (unifiedList) {
    unifiedList.innerHTML = '';

    if (items && items.length > 0) {
      const sorted = [...items].sort((a, b) => {
        const order = { 'pending': 1, 'done': 2, 'archived': 3 };
        return (order[a.status] || 9) - (order[b.status] || 9);
      });

      const pendingCount = items.filter(i => i.status === 'pending').length;
      const doneCount = items.filter(i => i.status === 'done').length;
      if (countBadge) {
        countBadge.textContent = `${pendingCount} open · ${doneCount} done`;
      }

      sorted.slice(0, 14).forEach(raw => {
        const parsed = categorizeTodo(raw);
        unifiedList.appendChild(createTodoItem(parsed, handleToggle));
      });
    } else {
      const fallback = [...FALLBACK_TODAY, ...FALLBACK_WEEK];
      if (countBadge) countBadge.textContent = `${fallback.length} tasks`;
      fallback.slice(0, 14).forEach(item => {
        unifiedList.appendChild(createTodoItem(item, handleToggle));
      });
    }
  }
}

function getRandomRecipes(count = 4) {
  const shuffled = [...ALL_RECIPES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function renderRecipes() {
  const container = $('#recipe-list');
  if (!container) return;
  container.innerHTML = '';

  const recipes = getRandomRecipes(4);
  recipes.forEach(recipe => {
    const card = createElement('div', 'recipe-card');
    card.innerHTML = `
      <div class="recipe-card__emoji" style="background: ${recipe.bg};">
        ${recipe.emoji}
      </div>
      <div class="recipe-card__info">
        <div class="recipe-card__name">${recipe.name}</div>
        <div class="recipe-card__meta">${recipe.meta}</div>
      </div>
      <div class="recipe-card__time">${recipe.time}</div>
    `;
    container.appendChild(card);
  });
}

function renderCalendar() {
  const container = $('#calendar-events');
  if (!container) return;
  container.innerHTML = '';

  CALENDAR_EVENTS.forEach(dayGroup => {
    const label = createElement('div', 'calendar-day-label', dayGroup.day);
    container.appendChild(label);

    dayGroup.events.forEach(event => {
      const el = createElement('div', 'calendar-event');
      el.innerHTML = `
        <span class="calendar-event__time">${event.time}</span>
        <span class="calendar-event__dot calendar-event__dot--${event.dot}"></span>
        <span class="calendar-event__title">${event.title}</span>
        <span class="calendar-event__duration">${event.duration}</span>
      `;
      container.appendChild(el);
    });
  });
}

function updateDashboardDate() {
  const el = $('#dashboard-date');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

// ── Close / Back Action ───────────────────────────────────

function closeDashboard() {
  if (window.AndroidBridge && typeof window.AndroidBridge.closeDashboard === 'function') {
    window.AndroidBridge.closeDashboard();
  }
}

// ── Remote D-Pad Grid Navigation ─────────────────────────

function initDpadNavigation() {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'Backspace' || e.keyCode === 4) {
      e.preventDefault();
      closeDashboard();
      return;
    }

    const items = $$('.todo-item');
    const backBtn = $('#dashboard-back-btn');
    const focused = document.activeElement;

    if (!items.length) return;

    if (e.key === 'ArrowDown') {
      if (focused === backBtn) {
        items[0].focus();
        e.preventDefault();
      } else {
        const idx = items.indexOf(focused);
        if (idx >= 0 && idx + 2 < items.length) {
          items[idx + 2].focus();
          e.preventDefault();
        }
      }
    } else if (e.key === 'ArrowUp') {
      const idx = items.indexOf(focused);
      if (idx <= 1) {
        backBtn.focus();
        e.preventDefault();
      } else if (idx > 1) {
        items[idx - 2].focus();
        e.preventDefault();
      }
    } else if (e.key === 'ArrowRight') {
      const idx = items.indexOf(focused);
      if (idx >= 0 && idx % 2 === 0 && idx + 1 < items.length) {
        items[idx + 1].focus();
        e.preventDefault();
      }
    } else if (e.key === 'ArrowLeft') {
      const idx = items.indexOf(focused);
      if (idx >= 0 && idx % 2 === 1) {
        items[idx - 1].focus();
        e.preventDefault();
      }
    }
  });
}

// ── Initialization ────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const backBtn = $('#dashboard-back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', closeDashboard);
  }

  renderTodos();
  renderRecipes();
  renderCalendar();
  updateDashboardDate();
  initDpadNavigation();

  // Focus the first item or back button by default
  setTimeout(() => {
    const firstItem = $('.todo-item');
    if (firstItem) firstItem.focus();
    else if (backBtn) backBtn.focus();
  }, 200);

  // Auto-refresh todos every 15s
  setInterval(renderTodos, 15000);
});
