# DAYMARK

<div align="center">

```
  ██████╗  █████╗ ██╗   ██╗███╗   ███╗ █████╗ ██████╗ ██╗  ██╗
  ██╔══██╗██╔══██╗╚██╗ ██╔╝████╗ ████║██╔══██╗██╔══██╗██║ ██╔╝
  ██║  ██║███████║ ╚████╔╝ ██╔████╔██║███████║██████╔╝█████╔╝ 
  ██║  ██║██╔══██║  ╚██╔╝  ██║╚██╔╝██║██╔══██║██╔══██╗██╔═██╗ 
  ██████╔╝██║  ██║   ██║   ██║ ╚═╝ ██║██║  ██║██║  ██║██║  ██╗
  ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝
```

**Local-first, keyboard-driven personal execution, desk telemetry, and circadian sleep-schedule shifter.**

[![Tauri v2](https://img.shields.io/badge/Tauri-v2-FFC131?style=flat-square&logo=tauri&logoColor=black)](https://tauri.app)
[![React 18](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Dexie.js](https://img.shields.io/badge/Storage-Dexie.js%20IndexedDB-brightgreen?style=flat-square)](https://dexie.org)
[![Platform](https://img.shields.io/badge/Platform-Linux%20%7C%20Web%20PWA-orange?style=flat-square)](https://github.com/whoisadi19/daymark)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

</div>

---

## Overview

**DAYMARK** is an industrial, keyboard-first desktop instrument for makers, engineers, and deep workers. Designed with a dark frosted **Nothing OS 3.0 / Braun industrial** aesthetic, it fuses daily execution logs, workstation focus telemetry, and a circadian sleep phase-shifter into a single zero-distraction surface.

It is **100% local-first**: all telemetry, task items, and sleep data are stored in an encrypted/private local IndexedDB database on your computer. Zero analytics, zero cloud lock-in, zero subscription fees.

---

## Key Features

### 1. 01 · Reflection (Execution & Planning)
- **Today & Tomorrow Lists:** Focus purely on what needs to happen today and queue tomorrow's agenda.
- **Strict Midnight Rollover:** Uncompleted tasks automatically carry over to the next day with rollover frequency tracking (`1D`, `2D`, `3D` stale badges). Tomorrow's queue automatically promotes to Today.
- **Per-Task Focus Tracking:** Every minute of deep work tracked in desk telemetry is automatically attributed to the active task with time badges (`45m`, `1h 20m`).
- **Unlimited Scrollable Architecture:** Add unlimited tasks with smooth internal scrolling (`max-h-[340px]`) so card geometry stays clean and fixed. Dynamic task count badge alerts you with a subtle amber accent when more than 5 tasks are queued.
- **One-Click Goal Linking:** Link items directly to long-term objectives with tactile indicator dots.

### 2. 02 · Tracker (Desk Telemetry & State Rocker)
- **Mechanical State Rocker:** Press <kbd>Space</kbd> anywhere to flip seamlessly between **FOCUS** (Nothing Crimson `#D71921`) and **DRIFT** (Amber `#F59E0B`).
- **Active Task Attribution:** Select what you're working on from a dropdown or create an ad-hoc task. Focus seconds are attributed directly to that item in real-time.
- **Live ASCII Telemetry Readouts:** Dynamic block progress bars and animated state indicators (`[:: LOCKED IN // ▓▓▓▓▓▓▒▒░░ ::]`).
- **Today's Time Breakdown:** Itemized duration summaries displaying exact splits across every task tackled today.
- **Post-Session Calibration Modal:** Stepped away or forgot to toggle? Calibrate your session split with a tactile slider before committing to your log.
- **2-Step Safe Reset:** Easily zero out timers for a fresh start with safety confirmation.

### 3. 03 · Analytics & Sleep Phase-Shifter
- **Dedicated Sleep & Wake Logging:** Full overnight and late-night cross-midnight calculation support (e.g. `11:30 PM` to `07:30 AM` $\to$ `8h 00m`, or `04:30 AM` to `01:30 PM` $\to$ `9h 00m`).
- **Tactile "Log Sleep" Action:** Real-time duration previews (`[ ☾ Log Sleep · 08h 00m ]`) that commit to disk and change to `✓ Sleep Logged (Update)`.
- **Circadian Schedule Shifter:**
  - **Baseline:** `04:30 AM` Sleep · `02:00 PM` Wake
  - **Target:** `12:00 AM` Sleep · `08:00 AM` Wake
  - **Daily Shifting Rate:** Step-by-step gradual shift (e.g. `15m/day`) with calculated tonight targets and days remaining.
- **Weekly 7-Day Sleep Schedule Graph:** Floating sleep duration bars plotted directly against the target `12:00 AM – 08:00 AM` green circadian zone.
- **14-Day Focus vs. Distracted Trend:** Architectural vertical bar chart with interactive day inspection.
- **Clean 3-Card Zero-Scroll Layout:** Everything fits strictly on a single screen without vertical scrolling.

### 4. Native Linux Desktop & Mini-Widget (Tauri v2)
- **Frameless Translucent Frosted Glass:** Built on Tauri v2 with `transparent: true`, a smoked glass base (`#121216]/75 backdrop-blur-2xl`), and specular highlights that refract ambient Nothing Crimson and Ivory light orbs.
- **Native Window Dragging:** Grab and reposition the window anywhere across your Ubuntu desktop.
- **Compact Always-On-Top Mini-Widget (`380x460`):** Click `[ ❐ ]` to collapse the app into a tiny, pinned floating instrument in the corner of your monitor showing the live timer, active task, space rocker, and top 3 priorities.
- **Frameless Controls:** Clean top-right circular frosted icon buttons:
  - `[ ❐ ]` Toggle Mini-Widget (`380x460`) / Full Dashboard (`900x640`)
  - `[ — ]` Minimize
  - `[ □ ]` Maximize / Restore
  - `[ ✕ ]` Close (turns `#D71921` crimson on hover)
- **Ubuntu App Launcher:** Registered desktop entry (`~/.local/share/applications/daymark.desktop`) lets you press the **Super key** and type `Daymark` to launch immediately.
- **Offline PWA:** Also runs standalone in any browser with Service Worker asset caching and manifest support.

---

## Keyboard Shortcuts

| Shortcut | Action |
|:---:|:---|
| <kbd>1</kbd> | Switch to **01 · Reflection** (Today & Tomorrow lists) |
| <kbd>2</kbd> | Switch to **02 · Tracker** (Desk telemetry) |
| <kbd>3</kbd> | Switch to **03 · Analytics** (Sleep shifter & graphs) |
| <kbd>Space</kbd> | Toggle between **LOCKED IN** and **DRIFTING** when clocked in |
| <kbd>Enter</kbd> | Submit new task / commit session calibration |
| <kbd>?</kbd> | Open Keyboard Shortcuts cheat sheet |
| <kbd>Esc</kbd> | Close any open dialog or modal |

---

## Tech Stack

- **Desktop Framework:** [Tauri v2](https://tauri.app/) (Rust 2024 edition, WebKitGTK)
- **Frontend Core:** [React 18+](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/)
- **Styling & Design System:** [Tailwind CSS](https://tailwindcss.com/), Tabular [JetBrains Mono](https://www.jetbrains.com/lp/mono/), [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans)
- **Local Database:** [Dexie.js](https://dexie.org/) (`dexie-react-hooks` reactive IndexedDB)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Packaging:** Debian `.deb` & Linux `.AppImage`

---

## Getting Started

### Prerequisites

- **Node.js** (v18+) & **npm**
- **Rust & Cargo** (1.90+ for Tauri v2):
  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  ```
- **Linux Build Dependencies** (Ubuntu/Debian):
  ```bash
  sudo apt update
  sudo apt install -y libwebkit2gtk-4.1-dev build-essential curl wget file libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
  ```

### Installation

```bash
# Clone the repository
git clone git@github.com:whoisadi19/daymark.git
cd daymark

# Install dependencies
npm install
```

### Running in Development

```bash
# Launch Native Desktop App (Tauri v2 with live reload)
npm run tauri:dev

# Or run frontend in browser only
npm run dev
```

### Building Release Binaries

```bash
# Compile optimized native desktop packages (.deb & .AppImage)
npm run tauri:build
```

Compiled packages will be generated at:
- `src-tauri/target/release/daymark` (Native binary)
- `src-tauri/target/release/bundle/deb/DAYMARK_1.0.0_amd64.deb`
- `src-tauri/target/release/bundle/appimage/DAYMARK_1.0.0_amd64.AppImage`

### Launching on Ubuntu

To run the compiled AppImage directly:
```bash
./src-tauri/target/release/bundle/appimage/DAYMARK_1.0.0_amd64.AppImage
```

Or install the `.deb` package to your system:
```bash
sudo dpkg -i src-tauri/target/release/bundle/deb/DAYMARK_1.0.0_amd64.deb
```

---

## Data Privacy & Backups

All data is stored directly on your machine in IndexedDB:
1. Click the **`[ ⚙ ]`** Settings icon in the top navigation bar.
2. Click **`Export Backup (.JSON)`** to download an unencrypted, human-readable snapshot of all tasks, desk sessions, and sleep records.
3. Use **`Restore Backup`** to migrate your records to another device without cloud services.

---

## License

This project is open source and available under the [MIT License](LICENSE).
