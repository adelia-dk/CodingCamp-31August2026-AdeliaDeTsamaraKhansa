import { DOMHelpers, formatTime, formatDay, formatDate } from './js';

// Minimal app bootstrap to make main.html renderable
// This file intentionally keeps logic small: it wires a simple clock widget
// and placeholder content for the other sections so the page is not blank.

document.addEventListener('DOMContentLoaded', () => {
  const clockRoot = document.getElementById('widget-clock');
  const todoRoot = document.getElementById('widget-todo');
  const timerRoot = document.getElementById('widget-timer');
  const linksRoot = document.getElementById('widget-links');

  // Clock: render nodes and update every second
  function renderClockOnce() {
    DOMHelpers.clearChildren(clockRoot);
    const title = DOMHelpers.el('h2', null, 'Clock');
    const timeEl = DOMHelpers.el('div', { className: 'clock-time' }, '');
    const dayEl = DOMHelpers.el('div', { className: 'clock-day' }, '');
    const dateEl = DOMHelpers.el('div', { className: 'clock-date' }, '');
    clockRoot.appendChild(title);
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

  // Run renders
  const clockInterval = renderClockOnce();
  renderTodoPlaceholder();
  renderTimerPlaceholder();
  renderLinksPlaceholder();

  // Keep interval id on the root for easy cleanup in tests / dev
  clockRoot.dataset.intervalId = String(clockInterval);
});
