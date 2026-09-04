# Design Document — To-Do Life Dashboard

## Overview

The To-Do Life Dashboard is a self-contained, client-side single-page application (SPA) built with plain HTML, CSS, and Vanilla JavaScript. It runs entirely in the browser with no build step, no external dependencies, and no back-end communication. All user data is persisted to the Browser Local Storage API.

The application is delivered as a single `index.html` file (with optional companion `style.css` and `app.js` files, or inlined) so it can be opened directly from the file system or installed as a browser extension.

The dashboard hosts four independent widgets that occupy the viewport simultaneously:

| Widget | Primary Concern |
|---|---|
| Clock_Widget | Live local time and date display |
| Todo_Widget | Task creation, completion, and deletion |
| Focus_Timer | Pomodoro-style countdown |
| Links_Widget | Quick-access URL bookmarks |

Each widget is a self-contained module that owns its own DOM subtree, its own Local Storage key(s), and its own internal state. Widgets do not communicate with each other directly; they all share a single `StorageManager` utility for read/write access to Local Storage.

---

## Architecture

### High-Level Structure

```
index.html
├── <link rel="stylesheet" href="style.css">
├── <div id="dashboard">
│   ├── <section id="widget-clock">
│   ├── <section id="widget-todo">
│   ├── <section id="widget-timer">
│   └── <section id="widget-links">
└── <script src="app.js" defer>
```

`app.js` is the single entry point. It imports (or contains, if inlined) the four widget modules and the shared utilities, then calls `init()` on each widget once the DOM is ready.

```
app.js
├── utils/storage.js        – StorageManager (get/set/remove with JSON parse/stringify)
├── utils/dom.js            – Small DOM helpers (createElement, clearChildren, …)
├── widgets/clock.js        – ClockWidget module
├── widgets/todo.js         – TodoWidget module
├── widgets/timer.js        – TimerWidget module
└── widgets/links.js        – LinksWidget module
```

> **Design decision — no module bundler**: Because TC-1 forbids frameworks and TC-3 requires the file to work as a standalone HTML, the project uses native ES Modules (`<script type="module">`) when served from a local server or browser extension context. For the pure file-system (`file://`) case, everything is inlined in a single HTML file to avoid CORS restrictions on ES Module imports.

### Initialisation Flow

```
DOMContentLoaded
  └── app.init()
        ├── ClockWidget.init(rootEl)
        ├── TodoWidget.init(rootEl, StorageManager)
        ├── TimerWidget.init(rootEl, StorageManager)
        └── LinksWidget.init(rootEl, StorageManager)
```

Each `init()` call:
1. Queries its root `<section>` element.
2. Renders its initial HTML into that element.
3. Attaches event listeners.
4. Reads persisted state from Local Storage (where applicable).
5. Starts any recurring timers.

### State Management

State is ephemeral (held in module-level variables) and persisted to Local Storage on every mutation. There is no global state object or reactive framework. Each widget is the sole owner of its own state and its own Local Storage keys.

```
Widget state flow:
  User action → event handler → mutate in-memory state → re-render DOM → persist to Local Storage
```

---

## Components and Interfaces

### Shared Utilities

#### `StorageManager`

```js
StorageManager = {
  get(key)          // Returns parsed object or null on missing/parse error
  set(key, value)   // JSON.stringify and writes; swallows QuotaExceededError
  remove(key)       // Removes key
  isAvailable()     // Returns true if localStorage is readable and writable
}
```

`get()` wraps the parse in a `try/catch` and returns `null` on any error, so callers never need to handle JSON parse failures themselves. `isAvailable()` is called once at startup by each widget to decide whether to enable persistence features.

#### `DOMHelpers`

```js
DOMHelpers = {
  el(tag, attrs, ...children)  // Creates and returns a DOM element
  clearChildren(node)          // Removes all child nodes
  showError(containerEl, msg)  // Renders/updates an error message inside a container
  clearError(containerEl)      // Removes the error message
}
```

---

### ClockWidget

**Responsibility**: Display and continuously update local time and date.

**Public API**:
```js
ClockWidget.init(rootEl)   // Renders and starts the 1-second interval
ClockWidget.destroy()      // Clears the interval (used in tests)
```

**Internal state**:
```js
{ intervalId: number | null }
```

**Key behaviours**:
- On `init`, calls `renderTick()` immediately, then schedules `setInterval(renderTick, 1000)`.
- `renderTick()` reads `new Date()`, formats fields, and updates three DOM text nodes (`timeEl`, `dayEl`, `dateEl`).
- If `new Date()` throws or returns `Invalid Date`, the widget displays a static error message and clears the interval (Req 1.5).
- No Local Storage interaction.

**Time formatting** (pure functions, no library):
```
formatTime(date) → "HH:MM:SS"   // zero-padded with String.padStart(2, '0')
formatDay(date)  → "Monday"     // date.toLocaleDateString('en-US', { weekday: 'long' })
formatDate(date) → "1 January"  // date.getDate() + ' ' + monthNames[date.getMonth()]
```

---

### TodoWidget

**Responsibility**: Manage a list of `Todo_Item` objects.

**Public API**:
```js
TodoWidget.init(rootEl, storage)
```

**Internal state**:
```js
{
  items: Array<{ id: string, title: string, done: boolean }>,
  storage: StorageManager
}
```

**Key behaviours**:
- `addItem(title)`: validates title (non-empty after trim, ≤ 200 chars), creates an item with a `crypto.randomUUID()` id, pushes to `items`, persists, re-renders.
- `toggleItem(id)`: flips `done` on the matching item, persists, re-renders.
- `deleteItem(id)`: filters out the matching item, persists, re-renders.
- `renderList()`: clears the list container and recreates one `<li>` per item. Completed items receive a `done` CSS class that applies `text-decoration: line-through`.
- Persistence is synchronous within the event handler, completing well within the 500 ms requirement (Req 2.8).

**Validation rules** (centralised in `validateTitle(title)`):
```
trim(title).length === 0  → error "Please enter a task title."
trim(title).length > 200  → error "Title must be 200 characters or fewer."
otherwise                 → valid
```

---

### TimerWidget

**Responsibility**: Pomodoro-style countdown with start, pause, resume, reset, and custom duration.

**Public API**:
```js
TimerWidget.init(rootEl, storage)
```

**Internal state**:
```js
{
  configuredDuration: number,   // in seconds, e.g. 25 * 60 = 1500
  remaining: number,            // seconds left
  status: 'idle' | 'running' | 'paused' | 'completed',
  intervalId: number | null,
  storage: StorageManager
}
```

**Status transitions**:

```
idle ──[start]──► running ──[pause]──► paused ──[resume]──► running
 ▲                  │                     │
 │                  └──[reset]────────────┘
 │                  └──[reach 0]──► completed ──[reset / dismiss]──► idle
 └──────────────────────────────────────────────────────────────────────┘
```

**Key behaviours**:
- Timer tick: `setInterval` at 1000 ms decrements `remaining`; if `remaining` reaches 0, transitions to `completed`, plays the audible alert via `AudioContext` (a short beep synthesised via the Web Audio API — no external audio file needed), and shows a visible alert banner (Req 3.7).
- Custom duration: parsed as an integer; rejected if `< 1`, `> 60`, or `NaN`. Valid values are stored in seconds (`value * 60`) and persisted (Req 3.10).
- On load: reads `configuredDuration` from Local Storage; falls back to `1500` (25 min) if missing or out of range (Req 3.11).
- `formatCountdown(seconds)` → `"MM:SS"` (pure function).

> **Design decision — Web Audio API for alert**: TC-1 prohibits external resources. A short beep is synthesised at runtime using `OscillatorNode` + `GainNode` (standard Web Audio API), avoiding the need for any audio file. Duration ≥ 1 second satisfies Req 3.7.

---

### LinksWidget

**Responsibility**: Store, display, and open user-defined quick-access URLs.

**Public API**:
```js
LinksWidget.init(rootEl, storage)
```

**Internal state**:
```js
{
  links: Array<{ id: string, label: string, url: string }>,
  storage: StorageManager
}
```

**Key behaviours**:
- `addLink(label, url)`: validates label and URL, enforces ≤ 50 item cap, prepends `https://` if the URL lacks an `http://` or `https://` scheme (Req 4.7), creates item with `crypto.randomUUID()` id, appends to `links`, persists, re-renders.
- `deleteLink(id)`: filters out item, persists, re-renders.
- `openLink(url)`: calls `window.open(url, '_blank', 'noopener,noreferrer')` (Req 4.2).
- `renderLinks()`: rebuilds the `<ul>` from `links`; each `<li>` contains an `<a>` (label) and a delete `<button>`.
- Insertion order is preserved because `links` is an append-only array; serialisation preserves array order (Req 4.10).

**Validation rules** (centralised in `validateLink(label, url)`):
```
trim(label).length === 0  → error "Please enter a label."
trim(url).length === 0    → error "Please enter a URL."
links.length >= 50        → error "Maximum of 50 links reached."
otherwise                 → valid
```

---

## Data Models

### Local Storage Keys

| Key | Owner | Type | Description |
|---|---|---|---|
| `tld_todos` | TodoWidget | `TodoItem[]` | Ordered array of to-do items |
| `tld_timer_duration` | TimerWidget | `number` | Configured duration in **minutes** (1–60) |
| `tld_links` | LinksWidget | `QuickLink[]` | Ordered array of quick links |

The `tld_` prefix namespaces all keys so the app does not conflict with other applications sharing the same origin.

### `TodoItem` Schema

```json
{
  "id": "string (UUID v4)",
  "title": "string (1–200 chars after trim)",
  "done": "boolean"
}
```

Example:
```json
[
  { "id": "a1b2c3d4-...", "title": "Buy groceries", "done": false },
  { "id": "e5f6g7h8-...", "title": "Read chapter 3", "done": true }
]
```

### `QuickLink` Schema

```json
{
  "id": "string (UUID v4)",
  "label": "string (1–100 chars after trim)",
  "url": "string (1–2000 chars; always begins with http:// or https://)"
}
```

Example:
```json
[
  { "id": "f1a2b3c4-...", "label": "Hacker News", "url": "https://news.ycombinator.com" },
  { "id": "g5h6i7j8-...", "label": "MDN Docs",    "url": "https://developer.mozilla.org" }
]
```

### `tld_timer_duration` Value

A single integer between 1 and 60 (inclusive), stored as a JSON number:
```json
25
```

On read, any value outside `[1, 60]` or any non-integer is treated as absent and the default of 25 is used.

### Local Storage Failure Handling

`StorageManager.get()` wraps reads in `try/catch`. If Local Storage is unavailable (e.g., private browsing with storage disabled, quota exceeded, or parse error):
- TodoWidget starts with an empty list (Req 2.10).
- TimerWidget falls back to 25 minutes (Req 3.11).
- LinksWidget starts with an empty list (implicit from Req 4.10 read path).

No error is surfaced to the user for storage unavailability at load time; mutations silently no-op if `StorageManager.set()` fails.

---

## Layout and Responsiveness

### Desktop Grid (≥ 1024 px wide, ≥ 600 px tall)

The four widgets are laid out using CSS Grid in a 2 × 2 arrangement:

```
┌─────────────────┬─────────────────┐
│   Clock_Widget  │   Todo_Widget   │
├─────────────────┼─────────────────┤
│   Focus_Timer   │   Links_Widget  │
└─────────────────┴─────────────────┘
```

```css
#dashboard {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  height: 100vh;
  gap: var(--space-md);
}
```

The `height: 100vh` plus equal row fractions ensures all four widgets fit in a single viewport without vertical scrolling (Req 5.1).

### Mobile Stack (< 768 px wide)

```css
@media (max-width: 767px) {
  #dashboard {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
    height: auto;
    overflow-y: auto;
  }
}
```

All widgets stack in source order — Clock → Todo → Timer → Links — and vertical scrolling is permitted (Req 5.3).

### Design Tokens

All widgets share a single CSS custom-property token set defined on `:root`, satisfying the requirement that no widget uses a colour, font, or spacing value not shared with at least one other (Req 5.2):

```css
:root {
  /* Colour palette */
  --color-bg:           #f8f9fa;
  --color-surface:      #ffffff;
  --color-primary:      #4a6cf7;
  --color-danger:       #e74c3c;
  --color-text-primary: #2c3e50;
  --color-text-muted:   #7f8c8d;
  --color-border:       #e0e0e0;

  /* Typography */
  --font-family:  'Segoe UI', system-ui, sans-serif;
  --font-size-sm: 0.85rem;
  --font-size-md: 1rem;
  --font-size-lg: 1.25rem;
  --font-size-xl: 2rem;

  /* Spacing */
  --space-xs:  4px;
  --space-sm:  8px;
  --space-md:  16px;
  --space-lg:  24px;
  --space-xl:  32px;
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Todo item addition round-trip

*For any* valid (non-whitespace, ≤ 200 character) title string, after adding it as a `Todo_Item`, serialising the list to Local Storage, then deserialising it back, the resulting list SHALL contain an item whose `title` exactly matches the input and whose `done` field is `false`.

**Validates: Requirements 2.2, 2.8, 2.9**

---

### Property 2: Whitespace-only titles are rejected

*For any* string composed entirely of whitespace characters (including the empty string), attempting to add it as a `Todo_Item` title SHALL leave the list length unchanged.

**Validates: Requirements 2.3**

---

### Property 3: Over-length titles are rejected

*For any* string whose trimmed length exceeds 200 characters, attempting to add it as a `Todo_Item` title SHALL leave the list length unchanged.

**Validates: Requirements 2.4**

---

### Property 4: Toggle completion is an involution

*For any* `Todo_Item` in any list state, toggling its `Completion_State` twice SHALL return the item to its original `done` value (i.e., `toggle(toggle(item)).done === item.done`).

**Validates: Requirements 2.5**

---

### Property 5: Delete removes exactly one item

*For any* list of `Todo_Item`s and any item `x` in that list, deleting `x` by id SHALL produce a list of length `n − 1` that contains no item with the same id as `x`.

**Validates: Requirements 2.6**

---

### Property 6: Timer countdown preserves remaining time through pause/resume

*For any* configured duration `d` (1–60 minutes) and any elapsed tick count `t < d * 60`, pausing the timer and immediately resuming it SHALL leave the remaining seconds equal to `d * 60 − t` (i.e., no time is lost or gained across a pause/resume cycle).

**Validates: Requirements 3.4, 3.5**

---

### Property 7: Custom timer duration round-trip

*For any* integer value `v` in the range [1, 60], setting it as the `Timer_Session` duration, persisting to Local Storage, then reading it back SHALL yield the same integer `v`.

**Validates: Requirements 3.8, 3.10, 3.11**

---

### Property 8: Out-of-range timer durations are rejected

*For any* value that is not an integer or whose integer value lies outside [1, 60], attempting to set it as the custom duration SHALL leave `configuredDuration` unchanged and SHALL not write a new value to Local Storage.

**Validates: Requirements 3.9**

---

### Property 9: Quick Link addition round-trip

*For any* valid (non-whitespace) label and URL pair, after adding it as a `Quick_Link`, serialising the list to Local Storage, then deserialising it back, the resulting list SHALL contain an item whose `label` and `url` exactly match the inputs (with `https://` prepended if the original URL lacked a scheme).

**Validates: Requirements 4.4, 4.9, 4.10**

---

### Property 10: URL scheme normalisation

*For any* URL string that does not begin with `"http://"` or `"https://"`, the stored `url` field SHALL equal `"https://" + original_url`.

*For any* URL string that already begins with `"http://"` or `"https://"`, the stored `url` field SHALL equal the original string unchanged.

**Validates: Requirements 4.7**

---

### Property 11: Quick Link cap enforcement

*For any* list already containing 50 `Quick_Link`s, attempting to add another SHALL leave the list length at 50 and SHALL not write a new entry to Local Storage.

**Validates: Requirements 4.6**

---

### Property 12: Whitespace-only labels or URLs are rejected

*For any* label string composed entirely of whitespace characters, or any URL string composed entirely of whitespace characters, attempting to add a `Quick_Link` SHALL leave the list length unchanged.

**Validates: Requirements 4.5**

---

### Property 13: Quick Link delete removes exactly one entry

*For any* list of `Quick_Link`s and any link `x` in that list, deleting `x` by id SHALL produce a list of length `n − 1` that contains no entry with the same id as `x`.

**Validates: Requirements 4.8**

---

### Property 14: Clock time formatting is total and correct

*For any* valid `Date` object, `formatTime(date)` SHALL return a string matching the regex `^\d{2}:\d{2}:\d{2}$` whose hours, minutes, and seconds components equal `date.getHours()`, `date.getMinutes()`, and `date.getSeconds()` respectively (zero-padded).

**Validates: Requirements 1.1**

---

### Property 15: Countdown formatting is total and correct

*For any* integer `s` in the range [0, 3600], `formatCountdown(s)` SHALL return a string matching `^\d{2}:\d{2}$` where the minutes component equals `Math.floor(s / 60)` and the seconds component equals `s % 60` (both zero-padded).

**Validates: Requirements 3.1**

---

## Error Handling

| Scenario | Widget | Behaviour |
|---|---|---|
| Empty / whitespace title submitted | TodoWidget | Show inline error; no list change |
| Title > 200 chars | TodoWidget | Show inline error with char-limit note; no list change |
| Empty label or URL submitted | LinksWidget | Show inline error; no list change |
| 50-link cap reached | LinksWidget | Show inline error "Maximum of 50 links reached"; no list change |
| Timer duration out of range or non-integer | TimerWidget | Show inline error "Enter a whole number between 1 and 60"; retain previous duration |
| Local Storage unavailable at load | All widgets | Widget starts with empty/default state; no error shown to user |
| Local Storage write fails (quota, etc.) | All widgets | Write is silently swallowed; in-memory state remains the source of truth |
| `new Date()` returns Invalid Date | ClockWidget | Static error message replaces time display; interval cleared |

All inline error messages are rendered into a dedicated `<p class="error-msg" aria-live="polite">` element within each widget, so screen readers announce them without a focus change.

---

## Testing Strategy

### Dual Approach

Testing uses two complementary strategies:

1. **Unit / example-based tests** — verify specific behaviours, integration points, and error conditions with concrete inputs.
2. **Property-based tests** — verify universal invariants across hundreds of randomly generated inputs using a PBT library.

### Tooling

| Tool | Role |
|---|---|
| [Vitest](https://vitest.dev/) | Test runner (fast, native ESM) |
| [fast-check](https://github.com/dubzzz/fast-check) | Property-based testing library |
| [jsdom](https://github.com/jsdom/jsdom) | DOM environment for unit tests (via Vitest's `jsdom` environment) |

### Unit Test Coverage (example-based)

Each widget's pure-function layer is tested with concrete examples:

- `validateTitle('')` → error message
- `validateTitle('a'.repeat(201))` → error message
- `validateTitle('hello')` → `null`
- `formatTime(new Date(2024, 0, 1, 9, 5, 3))` → `"09:05:03"`
- `formatCountdown(0)` → `"00:00"`, `formatCountdown(1500)` → `"25:00"`
- `validateTimerDuration(0)`, `validateTimerDuration(61)`, `validateTimerDuration(1.5)` → error
- `validateTimerDuration(25)` → `null`
- Storage fallback: `StorageManager.get()` returns `null` for unparseable JSON

### Property-Based Tests

Each correctness property from the section above maps to exactly one property-based test. All property tests run a minimum of **100 iterations** (fast-check default). Each test is tagged with a comment for traceability:

```
// Feature: todo-life-dashboard, Property 1: Todo item addition round-trip
// Feature: todo-life-dashboard, Property 2: Whitespace-only titles are rejected
// Feature: todo-life-dashboard, Property 3: Over-length titles are rejected
// Feature: todo-life-dashboard, Property 4: Toggle completion is an involution
// Feature: todo-life-dashboard, Property 5: Delete removes exactly one item
// Feature: todo-life-dashboard, Property 6: Timer countdown preserves time through pause/resume
// Feature: todo-life-dashboard, Property 7: Custom timer duration round-trip
// Feature: todo-life-dashboard, Property 8: Out-of-range timer durations are rejected
// Feature: todo-life-dashboard, Property 9: Quick Link addition round-trip
// Feature: todo-life-dashboard, Property 10: URL scheme normalisation
// Feature: todo-life-dashboard, Property 11: Quick Link cap enforcement
// Feature: todo-life-dashboard, Property 12: Whitespace-only labels or URLs are rejected
// Feature: todo-life-dashboard, Property 13: Quick Link delete removes exactly one entry
// Feature: todo-life-dashboard, Property 14: Clock time formatting is total and correct
// Feature: todo-life-dashboard, Property 15: Countdown formatting is total and correct
```

Property tests operate on the pure-logic layer (validation functions, formatting functions, in-memory state transitions) and do not touch the DOM or Local Storage, keeping them fast and deterministic.

### Integration Tests

A small set of integration tests use jsdom to exercise the full widget `init → user action → DOM assertion` path with representative examples:

- Adding a task renders a new `<li>` in the DOM.
- Deleting a task removes its `<li>`.
- Toggling a task applies / removes the `done` CSS class.
- Starting the timer changes the start button label.
- Adding a link renders a new anchor.
- Opening a link calls `window.open` with the correct URL.

### Accessibility Smoke Tests

- All interactive controls have accessible labels (`aria-label` or visible `<label>`).
- Error messages use `aria-live="polite"`.
- Focus management after add/delete operations is verified.
