# Requirements Document

## Introduction

The To-Do List Life Dashboard is a client-side web application that serves as a personal daily organizer. It runs entirely in the browser with no backend, using Local Storage to persist data. The dashboard presents four core widgets in a single view: a live clock, a to-do list, a focus (Pomodoro-style) timer, and a quick-links panel. The goal is a clean, distraction-free interface that helps users stay organized and focused throughout their day.

**Technical Constraints (apply to all requirements):**
- TC-1: Implemented using HTML, CSS, and Vanilla JavaScript only (no frameworks).
- TC-2: All persistent data stored via the Browser Local Storage API.
- TC-3: Compatible with current stable versions of Chrome, Firefox, Edge, and Safari; usable as a standalone HTML file or browser extension.

**Non-Functional Requirements (apply to all requirements):**
- NFR-1: Clean, minimal interface with no complex setup.
- NFR-2: Fast load time; UI interactions respond with no noticeable lag.
- NFR-3: Clear visual hierarchy and readable typography.

---

## Glossary

- **Dashboard**: The single-page web application that hosts all widgets.
- **Clock_Widget**: The widget that displays the current time and date.
- **Todo_Widget**: The widget that manages a list of to-do items.
- **Todo_Item**: A single entry in the to-do list with a title and a completion state.
- **Focus_Timer**: The widget that runs a countdown timer to support focused work sessions.
- **Timer_Session**: A single countdown interval (work or break) within the Focus_Timer.
- **Links_Widget**: The widget that stores and displays user-defined quick-access URLs.
- **Quick_Link**: A user-defined entry consisting of a label and a URL.
- **Local_Storage**: The Browser Local Storage API used to persist all user data.
- **Completion_State**: A boolean flag on a Todo_Item indicating whether it is done or not done.

---

## Requirements

### Requirement 1: Live Clock Display

**User Story:** As a user, I want to see the current time and date at a glance, so that I always know what time it is without leaving the dashboard.

#### Acceptance Criteria

1. THE Clock_Widget SHALL display the current local time in hours (00–23), minutes (00–59), and seconds (00–59), formatted as HH:MM:SS.
2. THE Clock_Widget SHALL display the current day of the week (full name, e.g. "Monday"), calendar date (1–31), and month (full name, e.g. "January").
3. WHEN the Dashboard is opened, THE Clock_Widget SHALL begin displaying the current local time and date within 1 second, without requiring user interaction.
4. WHILE the Dashboard is visible, THE Clock_Widget SHALL update the displayed time once per second, with each update reflecting the current local system time, without a full page reload.
5. IF the local system time cannot be retrieved, THEN THE Clock_Widget SHALL display an error message indicating that the time is unavailable and cease updating until the time source is restored.

---

### Requirement 2: To-Do List Management

**User Story:** As a user, I want to create, complete, and remove to-do items, so that I can track tasks for my day.

#### Acceptance Criteria

1. THE Todo_Widget SHALL provide an input field and a submit control for entering a new Todo_Item title.
2. WHEN the user submits a non-empty title of 1 to 200 characters, THE Todo_Widget SHALL add a new Todo_Item with that title and a Completion_State of not done, and clear the input field.
3. IF the user submits an empty or whitespace-only title, THEN THE Todo_Widget SHALL reject the input, display an error message, and leave the list unchanged.
4. IF the user submits a title exceeding 200 characters, THEN THE Todo_Widget SHALL reject the input, display an error message indicating the character limit, and leave the list unchanged.
5. WHEN the user activates the completion control on a Todo_Item, THE Todo_Widget SHALL toggle that item's Completion_State between done and not done.
6. WHEN the user activates the delete control on a Todo_Item, THE Todo_Widget SHALL remove that item from the list.
7. THE Todo_Widget SHALL visually distinguish Todo_Items with a Completion_State of done from those with a Completion_State of not done using a distinct text decoration (e.g., strikethrough) on the completed item's title.
8. WHEN the list of Todo_Items changes, THE Todo_Widget SHALL persist the updated list to Local_Storage within 500 milliseconds of the change.
9. WHEN the Dashboard is loaded, THE Todo_Widget SHALL restore all previously persisted Todo_Items from Local_Storage, preserving each item's title and Completion_State.
10. IF Local_Storage is unavailable or the stored Todo_Item data cannot be parsed, THEN THE Todo_Widget SHALL display an empty list and not throw an error.

---

### Requirement 3: Focus Timer

**User Story:** As a user, I want a countdown timer I can start, pause, and reset, so that I can time focused work sessions and short breaks.

#### Acceptance Criteria

1. THE Focus_Timer SHALL display a configurable countdown duration in minutes and seconds (MM:SS format).
2. THE Focus_Timer SHALL provide a default Timer_Session duration of 25 minutes (displayed as 25:00).
3. WHEN the user activates the start control, THE Focus_Timer SHALL begin counting down from the current displayed duration, decrementing by one second each second.
4. WHEN the user activates the pause control during an active Timer_Session, THE Focus_Timer SHALL stop the countdown and preserve the remaining time to the nearest second.
5. WHEN the user activates the resume control after pausing, THE Focus_Timer SHALL continue the countdown from the preserved remaining time, decrementing by one second each second.
6. WHEN the user activates the reset control, THE Focus_Timer SHALL stop any active countdown and restore the displayed duration to the configured Timer_Session duration within 100 milliseconds.
7. WHEN the countdown reaches zero, THE Focus_Timer SHALL stop the countdown, display 00:00, play an audible alert of at least 1 second duration, and display a visible alert indicator until the user dismisses it or activates the reset control.
8. WHERE the user sets a custom Timer_Session duration, THE Focus_Timer SHALL accept integer minute values between 1 and 60 inclusive and display the new duration in MM:00 format.
9. IF the user enters a duration outside the range of 1 to 60 minutes or enters a non-integer value, THEN THE Focus_Timer SHALL reject the input, display an error message indicating the valid range (1–60 minutes), and retain the previous Timer_Session duration.
10. WHEN the user sets a valid custom Timer_Session duration, THE Focus_Timer SHALL persist that duration to Local_Storage within 500 milliseconds of the change, so that it is restored on the next page load.
11. IF Local_Storage is unavailable or the stored duration value is outside the range of 1 to 60 minutes, THEN THE Focus_Timer SHALL fall back to the default Timer_Session duration of 25 minutes.

---

### Requirement 4: Quick Links Management

**User Story:** As a user, I want to save and access links to websites I visit frequently, so that I can open them quickly from the dashboard.

#### Acceptance Criteria

1. THE Links_Widget SHALL display all saved Quick_Links as labelled, clickable entries in the order they were added.
2. WHEN the user activates a Quick_Link entry, THE Links_Widget SHALL open the associated URL in a new browser tab.
3. THE Links_Widget SHALL provide controls for adding a new Quick_Link by supplying a label of 1 to 100 characters and a URL of 1 to 2000 characters.
4. WHEN the user submits a new Quick_Link with a valid label and a valid URL, and the total number of saved Quick_Links is fewer than 50, THE Links_Widget SHALL add it to the end of the displayed list.
5. IF the user submits a new Quick_Link with an empty or whitespace-only label, or an empty or whitespace-only URL, THEN THE Links_Widget SHALL reject the input and leave the list unchanged.
6. IF the user submits a new Quick_Link when 50 Quick_Links are already saved, THEN THE Links_Widget SHALL reject the input and display an error message indicating the maximum limit has been reached.
7. IF the user submits a URL that does not begin with "http://" or "https://", THEN THE Links_Widget SHALL prepend "https://" to the URL before saving.
8. WHEN the user activates the delete control on a Quick_Link, THE Links_Widget SHALL remove that entry from the list.
9. WHEN the list of Quick_Links changes, THE Links_Widget SHALL persist the updated list to Local_Storage.
10. WHEN the Dashboard is loaded, THE Links_Widget SHALL restore all previously persisted Quick_Links from Local_Storage in their original insertion order, preserving each entry's label and URL.

---

### Requirement 5: Dashboard Layout and Responsiveness

**User Story:** As a user, I want all widgets to be visible and usable on a standard desktop screen, so that I can use the dashboard as my daily start page or browser extension.

#### Acceptance Criteria

1. THE Dashboard SHALL present the Clock_Widget, Todo_Widget, Focus_Timer, and Links_Widget together in a single viewport without requiring vertical scrolling on screens with a viewport width of 1024 pixels or greater and a viewport height of 600 pixels or greater.
2. THE Dashboard SHALL apply the same colour palette, font family, and spacing scale values across all four widgets, such that no widget uses a colour, font, or spacing value not used by at least one other widget.
3. IF the viewport width is below 768 pixels, THEN THE Dashboard SHALL stack all widgets in a single column so that all content remains accessible without horizontal scrolling.
4. THE Dashboard SHALL load and render all four widgets within 2 seconds on a network connection with a minimum download speed of 10 Mbps and a maximum round-trip latency of 50 milliseconds, loading no external resources.
