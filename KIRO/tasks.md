# Implementation Plan: To-Do Life Dashboard

## Overview

Build a self-contained, client-side single-page application delivered as plain HTML + CSS + JavaScript files. The implementation proceeds in layers: project scaffolding and shared utilities first, then the four widgets, then CSS layout and design tokens, and finally the test suite (Vitest + fast-check). No build step or bundler is required; the app uses native ES Modules when served, or a single-file inline version for `file://` use.

---

## Tasks

- [x] 1. Scaffold project structure and configure test tooling
  - [x] 1.1 Create project skeleton and tooling configuration
    - Create `index.html` with the four `<section>` placeholders (`#widget-clock`, `#widget-todo`, `#widget-timer`, `#widget-links`) and a `<script type="module" src="app.js" defer>` tag
    - Create directory skeleton: `utils/`, `widgets/`, `tests/`
    - Create empty stub files: `utils/storage.js`, `utils/dom.js`, `widgets/clock.js`, `widgets/todo.js`, `widgets/timer.js`, `widgets/links.js`, `app.js`, `style.css`
    - Add `package.json` with `vitest`, `@vitest/coverage-v8`, `fast-check`, and `jsdom` as dev-dependencies; add `"test": "vitest --run"` and `"test:watch": "vitest"` scripts
    - Add `vitest.config.js` that sets `environment: 'jsdom'` and `globals: true`
    - _Requirements: TC-1, TC-3_

- [x] 2. Implement `StorageManager` utility
  - [x] 2.1 Implement `StorageManager` in `utils/storage.js`
    - Write `isAvailable()` that performs a test read/write to confirm Local Storage is accessible
    - Write `get(key)` wrapping `localStorage.getItem` + `JSON.parse` in a `try/catch`; return `null` on any error
    - Write `set(key, value)` wrapping `JSON.stringify` + `localStorage.setItem` in a `try/catch`; swallow `QuotaExceededError` silently
    - Write `remove(key)` wrapping `localStorage.removeItem` in a `try/catch`
    - _Requirements: 2.8, 2.9, 2.10, 3.10, 3.11, 4.9, 4.10_

  - [ ]* 2.2 Write property test for `StorageManager` round-trip (Property 7)
    - **Property 7: Custom timer duration round-trip**
    - **Validates: Requirements 3.8, 3.10, 3.11**
    - Use `fc.integer({ min: 1, max: 60 })` to verify `set` then `get` returns the same integer value

  - [ ]* 2.3 Write unit tests for `StorageManager`
    - Test `get()` returns `null` for a missing key
    - Test `get()` returns `null` for unparseable JSON stored directly in localStorage
    - Test `set()` + `get()` round-trips a plain object
    - Test `isAvailable()` returns a boolean
    - _Requirements: 2.10, 3.11_

- [x] 3. Implement `DOMHelpers` utility
  - [x] 3.1 Implement `DOMHelpers` in `utils/dom.js`
    - Write `el(tag, attrs, ...children)` that creates, configures, and returns a DOM element
    - Write `clearChildren(node)` that removes all child nodes from the given element
    - Write `showError(containerEl, msg)` that renders/updates an `aria-live="polite"` error paragraph inside the container
    - Write `clearError(containerEl)` that removes the error paragraph if present
    - _Requirements: 2.3, 2.4, 3.9, 4.5, 4.6_

  - [ ]* 3.2 Write unit tests for `DOMHelpers`
    - Test `el()` creates an element with correct tag, attributes, and children
    - Test `clearChildren()` removes all children
    - Test `showError()` inserts an element with the given message and `aria-live="polite"`
    - Test `clearError()` removes the error element
    - _Requirements: NFR-2, NFR-3_

- [~] 4. Checkpoint — Verify shared utilities
  - Run `npm test` and ensure all utility tests pass before proceeding to widgets.

- [ ] 5. Implement `ClockWidget`
  - [-] 5.1 Implement pure formatting functions in `widgets/clock.js`
    - Write `formatTime(date)` → `"HH:MM:SS"` using `String.prototype.padStart(2, '0')`
    - Write `formatDay(date)` → full weekday name via `date.toLocaleDateString('en-US', { weekday: 'long' })`
    - Write `formatDate(date)` → `"D Month"` using `date.getDate()` and a `monthNames` array
    - _Requirements: 1.1, 1.2_

  - [ ]* 5.2 Write property test for `formatTime` (Property 14)
    - **Property 14: Clock time formatting is total and correct**
    - **Validates: Requirements 1.1**
    - Use `fc.date()` to generate valid `Date` objects; assert the result matches `^\d{2}:\d{2}:\d{2}$` and each component equals the corresponding `date.get*()` value (zero-padded)

  - [ ]* 5.3 Write unit tests for `ClockWidget` formatting functions
    - `formatTime(new Date(2024, 0, 1, 9, 5, 3))` → `"09:05:03"`
    - `formatTime(new Date(2024, 0, 1, 0, 0, 0))` → `"00:00:00"`
    - `formatDay` returns a non-empty string for any valid date
    - `formatDate` returns a non-empty string for all 12 months
    - _Requirements: 1.1, 1.2_

  - [~] 5.4 Implement `ClockWidget.init(rootEl)` and `ClockWidget.destroy()` in `widgets/clock.js`
    - `init` renders the clock's DOM structure (`timeEl`, `dayEl`, `dateEl`) into `rootEl`
    - Calls `renderTick()` immediately, then schedules `setInterval(renderTick, 1000)`
    - `renderTick()` calls `new Date()`, updates the three text nodes; if `new Date()` returns an invalid date, clears the interval and calls `DOMHelpers.showError` with a time-unavailable message (Req 1.5)
    - `destroy()` clears the interval (used in tests)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]* 5.5 Write integration tests for `ClockWidget`
    - Verify `init` renders three non-empty text nodes in the DOM
    - Verify `destroy` stops further DOM updates
    - _Requirements: 1.3, 1.4_

- [ ] 6. Implement `TodoWidget`
  - [-] 6.1 Implement validation logic in `widgets/todo.js`
    - Write `validateTitle(title)` that returns `null` for valid input, or an error string for empty/whitespace titles or titles exceeding 200 characters after trim
    - _Requirements: 2.2, 2.3, 2.4_

  - [ ]* 6.2 Write property test for `validateTitle` — whitespace rejection (Property 2)
    - **Property 2: Whitespace-only titles are rejected**
    - **Validates: Requirements 2.3**
    - Use `fc.stringMatching(/^\s*$/)` to generate whitespace-only strings; assert `validateTitle` returns a non-null error string

  - [ ]* 6.3 Write property test for `validateTitle` — over-length rejection (Property 3)
    - **Property 3: Over-length titles are rejected**
    - **Validates: Requirements 2.4**
    - Use `fc.string({ minLength: 201 }).filter(s => s.trim().length > 200)` to generate strings whose trimmed length exceeds 200; assert `validateTitle` returns a non-null error string

  - [~] 6.4 Implement `TodoWidget` state and mutation functions
    - Write `addItem(title, state)` that validates, creates `{ id: crypto.randomUUID(), title: title.trim(), done: false }`, pushes to `state.items`, persists via `StorageManager`, re-renders
    - Write `toggleItem(id, state)` that flips `done` on the matching item, persists, re-renders
    - Write `deleteItem(id, state)` that filters out the item, persists, re-renders
    - _Requirements: 2.2, 2.5, 2.6, 2.8_

  - [ ]* 6.5 Write property test for `addItem` round-trip (Property 1)
    - **Property 1: Todo item addition round-trip**
    - **Validates: Requirements 2.2, 2.8, 2.9**
    - Use `fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0)` for valid titles; add item, serialise to JSON, parse back, assert `title` matches the trimmed input and `done === false`

  - [ ]* 6.6 Write property test for `toggleItem` involution (Property 4)
    - **Property 4: Toggle completion is an involution**
    - **Validates: Requirements 2.5**
    - Generate a random item with a known `done` value; toggle twice; assert `done` returns to its original value

  - [ ]* 6.7 Write property test for `deleteItem` (Property 5)
    - **Property 5: Delete removes exactly one item**
    - **Validates: Requirements 2.6**
    - Use `fc.array(fc.record({ id: fc.uuid(), title: fc.string({ minLength: 1 }), done: fc.boolean() }), { minLength: 1 })` for todo lists; delete a randomly chosen item; assert list length is `n − 1` and no item with that id remains

  - [~] 6.8 Implement `TodoWidget.init(rootEl, storage)` rendering and event wiring
    - Render input field, submit button, and `<ul>` list container into `rootEl`; all controls must have associated `<label>` or `aria-label`
    - Attach submit handler that calls `addItem`; clears the input field on success; calls `showError`/`clearError` based on validation result
    - `renderList()` clears the `<ul>` and recreates one `<li>` per item with a toggle checkbox and delete button; applies `done` CSS class on completed items (Req 2.7)
    - On init, read `tld_todos` from storage; fall back to empty array if null or unparseable
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.7, 2.9, 2.10_

  - [ ]* 6.9 Write integration tests for `TodoWidget`
    - Adding a valid task renders a new `<li>` in the DOM
    - Adding a whitespace-only task shows an error and list length is unchanged
    - Toggling a task applies/removes the `done` CSS class
    - Deleting a task removes its `<li>`
    - _Requirements: 2.1, 2.2, 2.5, 2.6, 2.7_

- [~] 7. Checkpoint — Verify ClockWidget and TodoWidget
  - Run `npm test` and confirm all clock and todo tests pass before proceeding.

- [ ] 8. Implement `TimerWidget`
  - [-] 8.1 Implement `validateTimerDuration` and `formatCountdown` in `widgets/timer.js`
    - Write `validateTimerDuration(value)` that returns `null` for integers in [1, 60] and an error string for non-integers or out-of-range values
    - Write `formatCountdown(seconds)` → `"MM:SS"` for any integer in [0, 3600] using zero-padded `Math.floor(s / 60)` and `s % 60`
    - _Requirements: 3.1, 3.8, 3.9_

  - [ ]* 8.2 Write property test for `formatCountdown` (Property 15)
    - **Property 15: Countdown formatting is total and correct**
    - **Validates: Requirements 3.1**
    - Use `fc.integer({ min: 0, max: 3600 })`; assert result matches `^\d{2}:\d{2}$` with minutes component equal to `Math.floor(s / 60)` and seconds component equal to `s % 60` (both zero-padded)

  - [ ]* 8.3 Write property test for `validateTimerDuration` — out-of-range rejection (Property 8)
    - **Property 8: Out-of-range timer durations are rejected**
    - **Validates: Requirements 3.9**
    - Use `fc.oneof(fc.integer({ max: 0 }), fc.integer({ min: 61 }), fc.float().filter(n => !Number.isInteger(n)))` to generate invalid inputs; assert `validateTimerDuration` returns a non-null string

  - [~] 8.4 Implement timer state machine and tick logic
    - Define state object `{ configuredDuration, remaining, status, intervalId, storage }`
    - Implement `startTimer(state)`, `pauseTimer(state)`, `resumeTimer(state)`, `resetTimer(state)` as pure state-transition functions (no DOM side-effects)
    - Implement `tick(state)` that decrements `remaining`; transitions to `'completed'` at 0 and calls `playAlert()`
    - Implement `playAlert()` using `OscillatorNode` + `GainNode` (Web Audio API) for an audible beep of at least 1 second duration; no external audio file (TC-1)
    - Status transitions: `idle → running → paused → running`, `running → completed`, `completed/any → idle` (via reset)
    - _Requirements: 3.3, 3.4, 3.5, 3.6, 3.7_

  - [ ]* 8.5 Write property test for pause/resume time preservation (Property 6)
    - **Property 6: Timer countdown preserves remaining time through pause/resume**
    - **Validates: Requirements 3.4, 3.5**
    - Generate `fc.integer({ min: 1, max: 60 })` for duration and `fc.integer({ min: 0 })` for elapsed tick count (capped to `duration * 60 - 1`); build state, apply ticks, pause, resume; assert `remaining` is unchanged across the pause/resume boundary

  - [~] 8.6 Implement `TimerWidget.init(rootEl, storage)` rendering and event wiring
    - Render countdown display, start/pause/resume/reset buttons, custom-duration input, and alert banner into `rootEl`; all controls must have accessible labels
    - Attach event listeners that call the state-machine functions and call `renderTimer()` after each transition
    - `renderTimer()` updates the countdown text, button labels/visibility (hide pause when idle, show resume when paused, etc.), and shows/hides the completion banner (Req 3.7)
    - On init, read `tld_timer_duration` from storage; validate; fall back to 25 if invalid; initialise `remaining = configuredDuration * 60`
    - _Requirements: 3.1, 3.2, 3.3, 3.6, 3.7, 3.8, 3.10, 3.11_

  - [ ]* 8.7 Write unit tests for `TimerWidget` state transitions and formatting
    - `validateTimerDuration(0)`, `(61)`, `(1.5)` → non-null error string
    - `validateTimerDuration(1)`, `(60)`, `(25)` → `null`
    - `formatCountdown(0)` → `"00:00"`, `formatCountdown(1500)` → `"25:00"`, `formatCountdown(3600)` → `"60:00"`
    - `startTimer` transitions `status` from `'idle'` to `'running'`
    - `pauseTimer` transitions `status` from `'running'` to `'paused'`
    - `resetTimer` restores `remaining` to `configuredDuration` and sets `status` to `'idle'`
    - _Requirements: 3.1, 3.3, 3.4, 3.6, 3.8, 3.9_

  - [ ]* 8.8 Write property test for custom duration round-trip via storage (Property 7)
    - **Property 7: Custom timer duration round-trip**
    - **Validates: Requirements 3.8, 3.10, 3.11**
    - Use `fc.integer({ min: 1, max: 60 })`; set duration, persist to storage mock, read back and validate; assert retrieved value equals the input integer

- [ ] 9. Implement `LinksWidget`
  - [-] 9.1 Implement `validateLink` in `widgets/links.js`
    - Write `validateLink(label, url, currentCount)` that returns `null` for valid input or an error string for: empty/whitespace-only label, empty/whitespace-only URL, or `currentCount >= 50`
    - _Requirements: 4.4, 4.5, 4.6_

  - [ ]* 9.2 Write property test for whitespace label/URL rejection (Property 12)
    - **Property 12: Whitespace-only labels or URLs are rejected**
    - **Validates: Requirements 4.5**
    - Use `fc.stringMatching(/^\s*$/)` for label and URL separately; assert `validateLink` returns a non-null error string in both cases

  - [-] 9.3 Implement URL scheme normalisation in `widgets/links.js`
    - Write `normaliseUrl(url)` that prepends `"https://"` if the URL does not already start with `"http://"` or `"https://"`; leaves existing-scheme URLs unchanged
    - _Requirements: 4.7_

  - [ ]* 9.4 Write property test for URL scheme normalisation (Property 10)
    - **Property 10: URL scheme normalisation**
    - **Validates: Requirements 4.7**
    - Use `fc.webUrl()` to generate URLs that already have a scheme; assert `normaliseUrl` returns them unchanged
    - Use `fc.string().filter(s => !s.startsWith('http://') && !s.startsWith('https://'))` for scheme-less strings; assert the result starts with `"https://"`

  - [~] 9.5 Implement `addLink`, `deleteLink`, and `openLink` functions
    - `addLink(label, url, state)`: validates (calls `validateLink`), normalises URL (calls `normaliseUrl`), creates `{ id: crypto.randomUUID(), label: label.trim(), url }`, appends to `state.links`, persists, re-renders
    - `deleteLink(id, state)`: filters out the matching item, persists, re-renders
    - `openLink(url)`: calls `window.open(url, '_blank', 'noopener,noreferrer')`
    - _Requirements: 4.1, 4.2, 4.4, 4.7, 4.8, 4.9_

  - [ ]* 9.6 Write property test for `addLink` round-trip (Property 9)
    - **Property 9: Quick Link addition round-trip**
    - **Validates: Requirements 4.4, 4.9, 4.10**
    - Use `fc.string({ minLength: 1 }).filter(s => s.trim().length > 0)` for both label and URL; add link, serialise/deserialise; assert `label` matches `input.trim()` and `url` starts with `"http://"` or `"https://"`

  - [ ]* 9.7 Write property test for cap enforcement (Property 11)
    - **Property 11: Quick Link cap enforcement**
    - **Validates: Requirements 4.6**
    - Build a state with exactly 50 links; attempt `addLink` with a valid new entry; assert `state.links.length` remains 50

  - [ ]* 9.8 Write property test for `deleteLink` (Property 13)
    - **Property 13: Quick Link delete removes exactly one entry**
    - **Validates: Requirements 4.8**
    - Use `fc.array(fc.record({ id: fc.uuid(), label: fc.string({ minLength: 1 }), url: fc.webUrl() }), { minLength: 1 })` for link lists; delete a randomly chosen entry; assert length is `n − 1` and no entry with that id remains

  - [~] 9.9 Implement `LinksWidget.init(rootEl, storage)` rendering and event wiring
    - Render label input, URL input, add button, and `<ul>` link list into `rootEl`; all inputs must have associated `<label>` or `aria-label`
    - Attach submit handler: validates (calls `validateLink`), calls `addLink`; shows/clears error via `DOMHelpers`
    - `renderLinks()` rebuilds the `<ul>` from `state.links`; each `<li>` has a clickable `<a>` (calls `openLink`) and a delete `<button>` with accessible label
    - On init, read `tld_links` from storage; fall back to empty array if null or unparseable
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.10_

  - [ ]* 9.10 Write integration tests for `LinksWidget`
    - Adding a valid link renders a new `<a>` in the DOM
    - Adding a whitespace label shows an error and list length is unchanged
    - Deleting a link removes its `<li>`
    - `openLink` calls `window.open` with the correct URL and `noopener,noreferrer`
    - _Requirements: 4.1, 4.2, 4.5, 4.8_

- [~] 10. Checkpoint — Verify TimerWidget and LinksWidget
  - Run `npm test` and confirm all timer and links tests pass before proceeding.

- [ ] 11. Implement CSS layout and design tokens in `style.css`
  - [~] 11.1 Write CSS custom properties (design tokens) on `:root`
    - Define all colour, typography, and spacing tokens: `--color-bg`, `--color-surface`, `--color-primary`, `--color-danger`, `--color-text-primary`, `--color-text-muted`, `--color-border`, `--font-family`, `--font-size-sm`, `--font-size-md`, `--font-size-lg`, `--font-size-xl`, `--space-xs`, `--space-sm`, `--space-md`, `--space-lg`, `--space-xl`
    - _Requirements: 5.2_

  - [~] 11.2 Write base and reset styles
    - Apply `box-sizing: border-box`, margin reset, and `background: var(--color-bg)` on `body`
    - Set `font-family: var(--font-family)` and `color: var(--color-text-primary)` globally
    - _Requirements: NFR-3_

  - [~] 11.3 Write desktop grid layout for `#dashboard`
    - `display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; height: 100vh; gap: var(--space-md)`
    - Each `<section>` styled as a card: `background: var(--color-surface)`, padding, `border-radius`, `overflow: auto`
    - _Requirements: 5.1_

  - [~] 11.4 Write responsive mobile stack layout
    - `@media (max-width: 767px)` block: `grid-template-columns: 1fr; grid-template-rows: auto; height: auto; overflow-y: auto`
    - _Requirements: 5.3_

  - [~] 11.5 Write widget-specific component styles
    - Clock: `font-size: var(--font-size-xl)` on the time display; `color: var(--color-text-muted)` on the day/date line
    - Todo: `text-decoration: line-through` on `.done` items; input, button, and error styles using token values
    - Timer: `font-size: var(--font-size-xl)` on the countdown display; completion banner uses `--color-danger`
    - Links: `<a>` styled with `--color-primary`; delete button styled with `--color-danger`
    - Error messages: `.error-msg { color: var(--color-danger); font-size: var(--font-size-sm); }` with `aria-live="polite"`
    - _Requirements: 2.7, 3.7, 5.2, NFR-3_

- [ ] 12. Implement `app.js` entry point
  - [~] 12.1 Write `app.js` entry-point wiring
    - Import `StorageManager` and all four widget modules
    - On `DOMContentLoaded`, query the four `<section>` root elements by their ids and call each widget's `init(rootEl, storage)` in order: Clock → Todo → Timer → Links
    - Export an `init()` function for testability (used in integration smoke test)
    - _Requirements: TC-1, TC-3, NFR-2_

  - [ ]* 12.2 Write integration smoke test for `app.js`
    - After calling `app.init()`, assert all four widget root sections contain at least one child element (i.e., each widget rendered its DOM)
    - _Requirements: NFR-2_

- [ ] 13. Accessibility wiring and ARIA attributes
  - [~] 13.1 Add ARIA labels and roles to all interactive controls
    - Verify all `<input>` elements have associated `<label>` or `aria-label`
    - Verify all `<button>` elements have descriptive accessible names (text content or `aria-label`)
    - Verify error message containers use `aria-live="polite"` and `role="status"` where appropriate
    - If any widget `init` from tasks 5–9 is missing accessibility attributes, patch those files here
    - _Requirements: NFR-3_

  - [ ]* 13.2 Write accessibility smoke tests
    - Assert all interactive controls in each widget have a non-empty accessible name (via `aria-label` or associated `<label>` text)
    - Assert all error containers have `aria-live="polite"`
    - _Requirements: NFR-3_

- [~] 14. Final checkpoint — Full test suite and integration verification
  - Run `npm test` and confirm every test passes (unit, property, and integration)
  - Verify `index.html` opens correctly from the file system (inline script/style variant if ES Module CORS restrictions apply under `file://`)
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; the core implementation will still be fully functional.
- Each task references specific requirements for traceability.
- Checkpoints (tasks 4, 7, 10, 14) ensure incremental validation — run `npm test` at each one before proceeding.
- Property-based tests operate on the pure-logic layer (validation, formatting, in-memory state transitions) and do not touch the DOM or Local Storage, keeping them fast and deterministic.
- Unit and integration tests use jsdom (via Vitest's `environment: 'jsdom'`).
- The `file://` use-case (TC-3) may require inlining all JS and CSS into `index.html` to avoid ES Module CORS restrictions — address this in task 14 if needed.

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.2", "5.1", "6.1", "8.1", "9.1", "9.3", "11.1"] },
    { "id": 3, "tasks": ["5.2", "5.3", "6.2", "6.3", "8.2", "8.3", "9.2", "9.4", "11.2"] },
    { "id": 4, "tasks": ["5.4", "6.4", "8.4", "9.5", "11.3", "11.4"] },
    { "id": 5, "tasks": ["5.5", "6.5", "6.6", "6.7", "8.5", "8.8", "9.6", "9.7", "9.8", "11.5"] },
    { "id": 6, "tasks": ["6.8", "8.6", "9.9"] },
    { "id": 7, "tasks": ["6.9", "8.7", "9.10", "13.1"] },
    { "id": 8, "tasks": ["12.1"] },
    { "id": 9, "tasks": ["12.2", "13.2"] }
  ]
}
```
