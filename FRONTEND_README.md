# Tapu Okuyucu - Frontend Architecture

This document provides a technical overview of the frontend implementation of the **Tapu Okuyucu** application.

## Tech Stack
- **Framework:** Next.js (React)
- **Styling:** Custom Vanilla CSS with a global variable system (`globals.css`)
- **Desktop Bridge:** Tauri APIs (`@tauri-apps/api/core`, `@tauri-apps/plugin-dialog`)

## Project Structure

```text
app/
├── globals.css           # Global design system, colors, variables, animations
├── layout.tsx            # Root layout wrapper
├── page.tsx              # Main entry point and state container
├── components/
│   ├── AddMalikModal.tsx       # Modal for creating new users
│   ├── ComparisonView.tsx      # Core logic for diffing two Tapu records
│   ├── ExportColumnsModal.tsx  # Modal for selecting columns before Excel export
│   ├── SerhList.tsx            # Main UI for displaying grouped legal liens (şerhler)
│   └── views/
│       ├── HomeView.tsx        # Dashboard showing list of all Maliks
│       ├── MalikDetailView.tsx # View showing Tapu records belonging to a Malik
│       └── RecordDetailView.tsx# View showing the extracted SerhList for a specific record
└── lib/
    └── python-bridge.ts  # Types and interfaces matching the Python backend
```

## State Management (`app/page.tsx`)

The frontend relies on React's local state (`useState`) centralized inside `page.tsx` rather than a global state manager (like Redux or Zustand). The `page.tsx` component acts as the **"Controller"**, fetching data from the Tauri backend and passing it down to the "Views" as props.

### Core States
- `view`: Controls the current active screen (`home` | `malik-detail` | `record-detail` | `comparison`).
- `maliks`: List of all registered users/entities.
- `selectedMalik`: The currently viewed user.
- `tapuRecords`: PDF records uploaded for the `selectedMalik`.
- `selectedRecord`: The specific record currently being viewed.
- `serhGrouped` & `serhEntries`: The parsed lien data for the active record.
- `tauriReady`: A boolean flag checking if the Tauri native environment has loaded successfully.

## Tauri - Python Bridge Communication

The frontend communicates with the Python sidecar process using a JSON payload structure through Tauri's `invoke("run_python")` API.

```typescript
const payload = JSON.stringify({ action: "action_name", data: { ... } });
const rawResponse = await tauriCore.invoke("run_python", { scriptPath: "python-backend/main.py", payload });
const response = JSON.parse(rawResponse);
```

### Fallback Web Mode
To support rapid UI development without recompiling the Tauri shell, the `runPython` wrapper function includes an HTTP fallback. If `__TAURI_INTERNALS__` is not detected in the window, it attempts to POST the payload to `http://localhost:8000`. This allows developers to run `npm run dev` and `python python-backend/server.py` to develop the frontend directly in a web browser.

## Key Components

### `ComparisonView.tsx`
Handles the logic for visualizing changes between two points in time.
- Uses a multi-select "pill" interface to filter visible changes by lien type (e.g., "İcrai Haciz").
- Dynamically recalculates summary statistics (Removed, Ongoing, Added) based on active filters.

### `SerhList.tsx`
Displays extracted liens grouped by Execution Office (İcra Dairesi).
- Implements an accordion UI to collapse/expand large datasets.
- Includes full-text search across all extracted string fields.
- Uses the same multi-select filtering logic as the Comparison view.

## Styling Philosophy
The UI uses "Glassmorphism" concepts built entirely with CSS variables for rapid theme switching (dark/light mode readiness). No external UI libraries (like Material UI or Radix) are used, keeping the bundle size minimal and the codebase fully custom.
