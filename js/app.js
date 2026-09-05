// Minimal app bootstrap to make main.html renderable
// This file intentionally keeps logic small: it wires a simple clock widget
// and placeholder content for the other sections so the page is not blank.

export const DOMHelpers = {
  /**
   * Creates and returns a DOM element with the given tag, attributes, and children.
   * @param {string} tag - The HTML tag name (e.g. 'div', 'button')
   * @param {Object|null} attrs - Key/value pairs to set as attributes or properties
   * @param {...(Node|string)} children - Child nodes or text strings to append
   * @returns {HTMLElement}
   */
  el(tag, attrs = {}, ...children) {
    if (!tag || typeof tag !== 'string') {
      throw new Error('tag must be a non-empty string');
    }
    const element = document.createElement(tag);

    if (attrs) {
      for (const [key, value] of Object.entries(attrs)) {
        if (key === 'className') {
          element.className = value;
        } else if (key.startsWith('on') && typeof value === 'function') {
          // Event listeners: e.g. { onClick: handler } or { onclick: handler }
          const eventName = key.slice(2).toLowerCase();
          element.addEventListener(eventName, value);
        } else {
          element.setAttribute(key, value);
        }
      }
    }

    for (const child of children) {
      if (child instanceof Node) {
        element.appendChild(child);
      } else if (child !== null && child !== undefined) {
        element.appendChild(document.createTextNode(String(child)));
      }
    }

    return element;
  },

  /**
   * Removes all child nodes from the given element.
   * @param {Node} node - The parent node to clear
   */
  clearChildren(node) {
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  },

  /**
   * Renders or updates an error message inside a container element.
   * Uses a <p class="error-msg" aria-live="polite"> element.
   * If one already exists, updates its text; otherwise creates a new one.
   * @param {HTMLElement} containerEl - The container to show the error in
   * @param {string} msg - The error message text
   */
  showError(containerEl, msg) {
    if (!containerEl) {
      console.error('showError: containerEl is required');
      return;
    }
    let errorEl = containerEl.querySelector('.error-msg');
    if (!errorEl) {
      errorEl = document.createElement('p');
      errorEl.className = 'error-msg';
      errorEl.setAttribute('aria-live', 'polite');
      errorEl.setAttribute('role', 'status');
      containerEl.appendChild(errorEl);
    }
    errorEl.textContent = msg;
  },

  /**
   * Removes the error message element from the container if present.
   * @param {HTMLElement} containerEl - The container to clear the error from
   */
  clearError(containerEl) {
    const errorEl = containerEl.querySelector('.error-msg');
    if (errorEl) {
      errorEl.remove();
    }
  },
};

export const StorageManager = {
  /**
   * Returns true if localStorage is readable and writable.
   * Performs a test write/read/remove cycle to confirm availability.
   */
  isAvailable() {
    const testKey = '__tld_storage_test__';
    try {
      localStorage.setItem(testKey, '1');
      localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Returns the parsed value for the given key, or null on missing key or any error.
   * @param {string} key
   * @returns {any|null}
   */
  get(key) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  /**
   * Serialises value to JSON and writes it under key.
   * Silently swallows QuotaExceededError and other errors.
   * @param {string} key
   * @param {any} value
   */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Swallow QuotaExceededError and any other storage errors silently
    }
  },

  /**
   * Removes the entry for the given key.
   * Silently swallows any errors.
   * @param {string} key
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Swallow any errors silently
    }
  },
};

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Formats a Date into "HH:MM:SS" (zero-padded).
 * Requirements: 1.1
 * @param {Date} date
 * @returns {string}
 */
export function formatTime(date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/**
 * Returns the full weekday name for a given date (e.g. "Monday").
 * Requirements: 1.2
 * @param {Date} date
 * @returns {string}
 */
export function formatDay(date) {
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

/**
 * Returns the date formatted as "D Month" (e.g. "1 January").
 * Requirements: 1.2
 * @param {Date} date
 * @returns {string}
 */
export function formatDate(date) {
  return `${date.getDate()} ${monthNames[date.getMonth()]}`;
}

/**
 * Validates a new link entry before adding it.
 * @param {string} label - The display label for the link
 * @param {string} url - The URL to link to
 * @param {number} currentCount - The current number of stored links
 * @returns {string|null} An error message string, or null if valid
 */
export function validateLink(label, url, currentCount) {
  if (label.trim().length === 0) return 'Please enter a label.';
  if (url.trim().length === 0) return 'Please enter a URL.';
  if (currentCount >= 50) return 'Maximum of 50 links reached.';
  return null;
}

/**
 * Normalises a URL by prepending 'https://' if it lacks an http/https scheme.
 * @param {string} url - The URL to normalise
 * @returns {string} The URL with a guaranteed http/https scheme
 */
export function normaliseUrl(url) {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return 'https://' + url;
}

/**
 * Validates a custom timer duration value.
 * @param {*} value - The value to validate.
 * @returns {null} if valid (integer in [1, 60]), or an error string otherwise.
 */
export function validateTimerDuration(value) {
  if (!Number.isInteger(value) || value < 1 || value > 60) {
    return 'Enter a whole number between 1 and 60';
  }
  return null;
}

/**
 * Formats a countdown duration in seconds to "MM:SS".
 * @param {number} seconds - Integer in [0, 3600].
 * @returns {string} Zero-padded "MM:SS" string.
 */
export function formatCountdown(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Validates a todo item title.
 * @param {string} title - The raw title input from the user.
 * @returns {string|null} An error message string, or null if the title is valid.
 */
export function validateTitle(title) {
  const trimmed = title.trim();
  if (trimmed.length === 0) {
    return 'Please enter a task title.';
  }
  if (trimmed.length > 200) {
    return 'Title must be 200 characters or fewer.';
  }
  return null;
}

let initialized = false;

document.addEventListener('DOMContentLoaded', () => {
  if (initialized) return;
  initialized = true;

  const clockRoot = document.getElementById('widget-clock');
  const todoRoot = document.getElementById('widget-todo');
  const timerRoot = document.getElementById('widget-timer');
  const linksRoot = document.getElementById('widget-links');

  // Clock render
  function renderClockOnce() {
    DOMHelpers.clearChildren(clockRoot);
    const timeEl = DOMHelpers.el('div', { className: 'clock-time' }, '');
    const dayEl = DOMHelpers.el('div', { className: 'clock-day' }, '');
    const dateEl = DOMHelpers.el('div', { className: 'clock-date' }, '');
    clockRoot.appendChild(timeEl);
    clockRoot.appendChild(dayEl);
    clockRoot.appendChild(dateEl);

    function tick() {
      const now = new Date();
      timeEl.textContent = formatTime(now);
      dayEl.textContent = formatDay(now);
      dateEl.textContent = formatDate(now);
    }

    tick();
    return setInterval(tick, 1000);
  }

  // Todo placeholder
  function renderTodoPlaceholder() {
    DOMHelpers.clearChildren(todoRoot);
    const title = DOMHelpers.el('h2', null, 'To‑Do List');
    const p = DOMHelpers.el('p', null, 'Todo widget not yet wired.');
    todoRoot.appendChild(title);
    todoRoot.appendChild(p);
  }

  // Timer placeholder
  function renderTimerPlaceholder() {
    DOMHelpers.clearChildren(timerRoot);
    const title = DOMHelpers.el('h2', null, 'Focus Timer');
    const p = DOMHelpers.el('p', null, 'Timer widget not yet wired.');
    timerRoot.appendChild(title);
    timerRoot.appendChild(p);
  }

  // Links placeholder
  function renderLinksPlaceholder() {
    DOMHelpers.clearChildren(linksRoot);
    const title = DOMHelpers.el('h2', null, 'Quick Links');
    const p = DOMHelpers.el('p', null, 'Links widget not yet wired.');
    linksRoot.appendChild(title);
    linksRoot.appendChild(p);
  }

  // Run all renders
  const clockInterval = renderClockOnce();
  renderTodoPlaceholder();
  renderTimerPlaceholder();
  renderLinksPlaceholder();

  // Keep interval id on the root for easy cleanup in tests / dev
  clockRoot.dataset.intervalId = String(clockInterval);
});
