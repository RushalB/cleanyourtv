/* ═══════════════════════════════════════════════════════════
   CleanYourTV Family Journal — Hearth & Wildflower Edition
   Application Logic & PocketBase Sync
   ═══════════════════════════════════════════════════════════ */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function createElement(tag, className, textContent) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (textContent) el.textContent = textContent;
  return el;
}

const PB_API_URL = 'http://192.168.4.32:8090/api/collections/todos/records';

const FALLBACK_TODOS = [
  { text: 'Set up home database server on Mac', done: false, tag: 'urgent' },
  { text: 'Migrate PocketBase to Raspberry Pi', done: false },
  { text: 'Test initial server prototype', done: true },
  { text: 'Review pull requests & merge updates', done: false },
  { text: 'Schedule weekly design alignment', done: false },
];

const ALL_RECIPES = [
  { name: 'Garlic Butter Tuscan Salmon', type: 'Dinner', time: '25m' },
  { name: 'Lemon Herb Roasted Chicken', type: 'Dinner', time: '35m' },
  { name: 'Cast-Iron Herb Butter Ribeye', type: 'Idea', time: '30m' },
  { name: 'Thai Coconut Red Curry', type: 'Idea', time: '30m' },
  { name: 'Spicy Sesame Peanut Noodles', type: 'Dinner', time: '20m' },
  { name: 'Mediterranean Baked Cod', type: 'Idea', time: '25m' },
  { name: 'Wild Mushroom Truffle Risotto', type: 'Idea', time: '40m' },
];

const CALENDAR_EVENTS = [
  { time: '10:00 AM', title: 'Team Sync & Standup', duration: '30m' },
  { time: '01:30 PM', title: 'Project Architecture Review', duration: '1h' },
  { time: '04:00 PM', title: 'Design Check-in', duration: '45m' },
];

function setSyncStatus(online) {
  const dot = $('#pb-status-dot');
  const label = $('#pb-status-label');
  if (dot) {
    dot.classList.toggle('offline', !online);
  }
  if (label) {
    label.textContent = online ? 'Synced' : 'Local';
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
  const isUrgent = /\[urgent\]|\(urgent\)|#urgent/i.test(item.task);
  const isWeek = /\[week\]|\(week\)|#week/i.test(item.task);
  const cleanText = item.task.replace(/\[(urgent|week)\]|\((urgent|week)\)|#(urgent|week)/gi, '').trim();

  let tag = null;
  if (isUrgent) tag = 'urgent';
  else if (isWeek) tag = 'week';
  else if (isArchived) tag = 'archived';

  return {
    id: item.id,
    text: cleanText || item.task,
    done: item.status === 'done',
    status: item.status,
    tag: tag,
  };
}

function createTodoItem(item, onToggle) {
  const li = createElement('li', `todo-row${item.done ? ' done' : ''}`);
  li.setAttribute('tabindex', '0');
  if (item.id) li.dataset.id = item.id;

  const badgeHTML = item.tag ? `<span class="todo-badge">${item.tag}</span>` : '';

  li.innerHTML = `
    <div class="todo-circle"></div>
    <span class="todo-text">${item.text}</span>
    ${badgeHTML}
  `;

  const toggle = () => {
    item.done = !item.done;
    li.classList.toggle('done', item.done);
    if (onToggle) onToggle(item);
  };

  li.addEventListener('click', toggle);
  li.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.keyCode === 13 || e.keyCode === 23) {
      e.preventDefault();
      toggle();
    }
  });

  li.addEventListener('focus', () => {
    $$('.todo-row').forEach(r => r.classList.remove('focused'));
    li.classList.add('focused');
    li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });

  li.addEventListener('blur', () => {
    li.classList.remove('focused');
  });

  return li;
}

async function renderTodos() {
  const list = $('#todo-list');
  const countBadge = $('#todo-display-badge');
  const focusedId = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.id : null;
  const items = await fetchPocketBaseTodos();

  const updateCounts = () => {
    const allRows = $$('.todo-row');
    const doneRows = $$('.todo-row.done');
    const openCount = allRows.length - doneRows.length;
    if (countBadge) {
      countBadge.textContent = `${openCount} Open · ${doneRows.length} Done`;
    }
  };

  const handleToggle = (item) => {
    updateCounts();
    if (!item.id) return;
    const nextStatus = item.done ? 'done' : 'pending';
    updatePocketBaseStatus(item.id, nextStatus);
  };

  if (!list) return;
  list.innerHTML = '';

  if (items && items.length > 0) {
    const sorted = [...items].sort((a, b) => {
      const order = { 'pending': 1, 'done': 2, 'archived': 3 };
      return (order[a.status] || 9) - (order[b.status] || 9);
    });

    sorted.forEach(raw => {
      const parsed = categorizeTodo(raw);
      list.appendChild(createTodoItem(parsed, handleToggle));
    });
  } else {
    FALLBACK_TODOS.forEach(item => {
      list.appendChild(createTodoItem(item, handleToggle));
    });
  }

  updateCounts();

  // Restore focus after refresh
  const rows = $$('.todo-row');
  if (focusedId) {
    const match = rows.find(r => r.dataset.id === focusedId);
    if (match) match.focus();
  } else if (rows.length > 0 && document.activeElement !== $('#dashboard-back-btn')) {
    rows[0].focus();
  }
}

function renderRecipes() {
  const container = $('#recipe-list');
  if (!container) return;
  container.innerHTML = '';

  const picks = ALL_RECIPES.slice(0, 3);
  picks.forEach(recipe => {
    const row = createElement('div', 'meal-row');
    row.innerHTML = `
      <span class="meal-tag">${recipe.type}</span>
      <span class="meal-name">${recipe.name}</span>
      <span class="meal-time">${recipe.time}</span>
    `;
    container.appendChild(row);
  });
}

function renderCalendar() {
  const container = $('#calendar-events');
  if (!container) return;
  container.innerHTML = '';

  CALENDAR_EVENTS.slice(0, 3).forEach(event => {
    const row = createElement('div', 'timeline-row');
    row.innerHTML = `
      <span class="time-stamp">${event.time}</span>
      <span class="event-title">${event.title}</span>
      <span class="event-dur">${event.duration}</span>
    `;
    container.appendChild(row);
  });
}

function updateDashboardDate() {
  const dateEl = $('#dashboard-date');
  const dayEl = $('#dashboard-day');
  const clockEl = $('#dashboard-clock');
  const ampmEl = $('#dashboard-clock-ampm');
  const now = new Date();

  if (dateEl) {
    dateEl.textContent = now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  }

  if (dayEl) {
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const pastDaysOfYear = (now - startOfYear) / 86400000;
    const weekNum = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
    dayEl.textContent = `Week ${weekNum}`;
  }

  if (clockEl) {
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    clockEl.textContent = `${hours}:${minutes}`;
    if (ampmEl) ampmEl.textContent = ampm;
  }
}

function getWeatherCondition(code, isDay) {
  switch (code) {
    case 0:
      return { label: isDay ? 'Sunny' : 'Clear', icon: isDay ? '☀️' : '🌙' };
    case 1:
      return { label: isDay ? 'Mostly Sunny' : 'Mostly Clear', icon: isDay ? '🌤️' : '🌙' };
    case 2:
      return { label: 'Partly Cloudy', icon: isDay ? '⛅' : '☁️' };
    case 3:
      return { label: 'Overcast', icon: '☁️' };
    case 45: case 48:
      return { label: 'Foggy', icon: '🌫️' };
    case 51: case 53: case 55:
      return { label: 'Drizzle', icon: '🌦️' };
    case 61: case 63: case 65:
      return { label: 'Rain', icon: '🌧️' };
    case 66: case 67:
      return { label: 'Freezing Rain', icon: '🌧️' };
    case 71: case 73: case 75:
      return { label: 'Snow', icon: '🌨️' };
    case 77:
      return { label: 'Snow Grains', icon: '🌨️' };
    case 80: case 81: case 82:
      return { label: 'Showers', icon: '🌧️' };
    case 85: case 86:
      return { label: 'Snow Showers', icon: '🌨️' };
    case 95: case 96: case 99:
      return { label: 'Thunderstorm', icon: '⛈️' };
    default:
      return { label: isDay ? 'Fair' : 'Clear', icon: isDay ? '🌤️' : '🌙' };
  }
}

function renderWeather(data) {
  const tempEl = $('#weather-temp');
  const condEl = $('#weather-cond');
  const feelsEl = $('#weather-feels');
  const locEl = $('#dashboard-location');

  if (tempEl) tempEl.textContent = `${data.temp}°`;
  if (condEl) {
    const cond = getWeatherCondition(data.code, data.isDay);
    condEl.textContent = `${cond.icon} ${cond.label}`;
  }
  if (feelsEl) feelsEl.textContent = `Feels ${data.feelsLike}°`;
  if (locEl && data.city) locEl.textContent = data.city;
}

async function fetchWeather() {
  const cached = localStorage.getItem('journal_weather');
  if (cached) {
    try {
      renderWeather(JSON.parse(cached));
    } catch (e) {}
  }

  try {
    const lat = 41.892;
    const lon = -87.6416;
    const city = 'Chicago';

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,is_day,weather_code&temperature_unit=fahrenheit&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const cur = data.current;

    const weatherData = {
      temp: Math.round(cur.temperature_2m),
      feelsLike: Math.round(cur.apparent_temperature),
      isDay: cur.is_day === 1,
      code: cur.weather_code,
      city: city
    };

    localStorage.setItem('journal_weather', JSON.stringify(weatherData));
    renderWeather(weatherData);
  } catch (err) {
    console.warn('Weather fetch failed:', err);
    if (!cached) {
      renderWeather({
        temp: 51,
        feelsLike: 46,
        isDay: false,
        code: 0,
        city: 'Chicago'
      });
    }
  }
}

function closeDashboard() {
  if (window.AndroidBridge && typeof window.AndroidBridge.closeDashboard === 'function') {
    window.AndroidBridge.closeDashboard();
  }
}

function initDpadNavigation() {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'Backspace' || e.keyCode === 4) {
      e.preventDefault();
      closeDashboard();
      return;
    }

    const items = $$('.todo-row');
    const backBtn = $('#dashboard-back-btn');
    const focused = document.activeElement;

    if (e.key === 'ArrowDown') {
      if (focused === backBtn) {
        if (items.length > 0) {
          items[0].focus();
          e.preventDefault();
        }
      } else {
        const idx = items.indexOf(focused);
        if (idx >= 0 && idx + 1 < items.length) {
          items[idx + 1].focus();
          e.preventDefault();
        }
      }
    } else if (e.key === 'ArrowUp') {
      const idx = items.indexOf(focused);
      if (idx === 0) {
        if (backBtn) backBtn.focus();
        e.preventDefault();
      } else if (idx > 0) {
        items[idx - 1].focus();
        e.preventDefault();
      }
    } else if (e.key === 'ArrowRight') {
      if (backBtn && focused !== backBtn) {
        backBtn.focus();
        e.preventDefault();
      }
    } else if (e.key === 'ArrowLeft') {
      if (focused === backBtn && items.length > 0) {
        items[0].focus();
        e.preventDefault();
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const backBtn = $('#dashboard-back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', closeDashboard);
    backBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.keyCode === 13 || e.keyCode === 23) {
        e.preventDefault();
        closeDashboard();
      }
    });
  }

  renderTodos();
  renderRecipes();
  renderCalendar();
  updateDashboardDate();
  fetchWeather();
  initDpadNavigation();

  setTimeout(() => {
    const firstItem = $('.todo-row');
    if (firstItem) firstItem.focus();
    else if (backBtn) backBtn.focus();
  }, 200);

  setInterval(updateDashboardDate, 10000);
  setInterval(renderTodos, 15000);
  setInterval(fetchWeather, 15 * 60 * 1000);
});
