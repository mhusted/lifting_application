# Lift Growth

**A simple, mobile-first strength training tracker for building routines, logging workouts, and visualizing progress over time.**

Lift Growth is a Progressive Web App (PWA) designed primarily for iPhone. It can be installed directly from Safari and used like a standalone app—without the App Store, Xcode, or a Mac.

## Features

### Import workout text

Paste an ordinary workout plan from Notes, Messages, a coach, ChatGPT, or any other source. Lift Growth recognizes common exercise names and formats such as `3 × 8`, `3 sets of 10 at 220 lb`, and `120 lb for 10 × 3`. Preview the result before importing it as a workout or saving it as a reusable routine. No account or external AI connection is required; parsing happens locally in the browser.


- **Expanded exercise library** with common machine and cable movements including Incline Press, Chest Press, Seated Row, Rear Delt, Pec Fly, Bicep Curls, and Tricep Extensions.

- **Searchable exercise library** with standardized lift names while still allowing custom exercises.
- **Previous-session reference** shown while logging each exercise, including prior sets, top weight, and estimated 1RM.


- **Custom workout routines** — Create, edit, delete, and reuse your own routines.
- **Starter templates** — Quickly add Upper A, Lower A, Push, Pull, Legs, or Full Body templates and customize them.
- **Fast workout logging** — Start from a saved routine and record sets, reps, weight, and optional RIR.
- **Lift-specific progress tracking** — View the history of any exercise you have logged.
- **Interactive progress metrics** — Switch between estimated 1RM, top weight, and session training volume.
- **Progress insights** — See changes in performance compared with your first logged session.
- **Workout history** — Review previous sessions and the work completed in each workout.
- **Local-first storage** — Workout and routine data are stored locally in the browser; no account is required.
- **Installable on iPhone** — Add Lift Growth to the iPhone Home Screen for an app-like, full-screen experience.
- **Offline support** — Previously loaded app resources are cached by the service worker for offline use.

## Progress Metrics

Lift Growth currently provides three ways to visualize progress for an individual lift:

| Metric | What it shows |
| --- | --- |
| **Estimated 1RM** | An estimate of maximal strength based on the weight and reps performed. |
| **Top Weight** | The heaviest working weight recorded in each session. |
| **Session Volume** | Total training work calculated from weight × reps across logged sets. |

These metrics are intended to make it easier to distinguish between increases in absolute load, rep-based strength, and overall training workload.

## Run Locally

No build process or package installation is required. The project uses standard HTML, CSS, and JavaScript.

For basic inspection, open `index.html` in a browser. For full PWA behavior—including the service worker—serve the project from a local web server or deploy it over HTTPS.

## Deploy with GitHub Pages

1. Create a GitHub repository for the project (for example, `lift-growth`).
2. Upload the **contents** of this folder to the repository root.
3. Open the repository's **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and `/ (root)` folder, then save.
6. After deployment completes, GitHub Pages will provide the public URL for the app.

For a repository named `lift-growth`, the URL will typically follow this format:

```text
https://YOUR-USERNAME.github.io/lift-growth/
```

## Install on iPhone

After the app has been deployed:

1. Open the GitHub Pages URL in **Safari** on the iPhone.
2. Tap the **Share** button.
3. Select **Add to Home Screen**.
4. Confirm the app name and tap **Add**.

Lift Growth will then appear on the Home Screen and launch in its standalone PWA interface.

## Updating an Existing Deployment

If an earlier version of Lift Growth is already published, replace the corresponding application files in the same repository and commit the changes. GitHub Pages will redeploy automatically.

The service worker uses versioned caching so updated application resources can replace older cached versions after deployment.


## Exercise Library

The searchable exercise library includes common commercial-gym and Planet Fitness-style movements across chest, shoulders, back, arms, legs, glutes, calves, hips, and core. It includes common machine, cable, dumbbell, Smith-machine, and bodyweight variations.

Exercise aliases are normalized so common naming variations such as `Seated Rows` / `Seated Row`, `Hip Abductors` / `Hip Abduction Machine`, and `Squats` / `Squat` feed the same progress history instead of creating duplicate lift records. Custom exercise names are still supported.

## Data & Privacy

Lift Growth currently has no user account, cloud database, or external workout-data service. Routine and workout history are stored in the browser's local storage on the device where the app is used.

Because the data is local, **clearing Safari website data or browser storage can erase saved workout history and routines**. Export/import backup functionality is a planned improvement.

## Project Structure

```text
LiftGrowthPWA/
├── index.html              # Application interface
├── styles.css              # Responsive/mobile styling
├── app.js                  # Application logic and local data handling
├── manifest.webmanifest    # PWA metadata
├── service-worker.js       # Offline caching and PWA support
├── icon-192.png            # PWA icon
├── icon-512.png            # PWA icon
└── README.md               # Project documentation
```

## Roadmap

Potential future improvements include:

- Progressive-overload recommendations based on previous performance
- Export and import backups
- Additional routine templates
- More detailed PR tracking
- Additional progress metrics and time-range filters
- Improved workout editing and exercise management

## Technology

Lift Growth is intentionally lightweight and dependency-free:

- HTML5
- CSS3
- Vanilla JavaScript
- Progressive Web App APIs
- Browser local storage
- Service worker caching

## License

No open-source license has been assigned yet. Unless a license is added, the source code remains subject to standard copyright protections.

---

Built as a lightweight personal strength-training tracker with an emphasis on quick workout entry and clear long-term progress visualization.

## Workout logging model

Lift Growth records **each working set individually**. This makes progress metrics more accurate when the weight, reps, or RIR differ from set to set. A routine defines the planned exercise order and target sets/reps; when you start it, those targets are expanded into editable set rows for that workout.

Existing workouts saved by earlier versions remain supported and are normalized automatically when displayed or analyzed.


## Progress views

Lift Growth can now analyze each exercise at several time scales:

- **Session** — every individual workout session.
- **Week** — groups sessions by week. For estimated 1RM and top weight, the best result in the week is shown; volume is summed across the week.
- **Month** — the same aggregation at a monthly level.
- **Year** — a high-level annual view for long-term progress.

The Progress screen also includes **4-week, 3-month, 1-year, and all-time** ranges and can display either a **trend line** or **bar chart**.


## Progress focus in v8

The Progress screen now defaults to a **weekly** comparison over the **last 3 months**, with a one-tap switch to **monthly** grouping as more history accumulates. It shows two charts together: **Strength / PR trend** (best estimated 1RM per period) and **Training volume** (total volume per period), plus percent change for each.


## Data persistence and backups

Lift Growth stores saved workouts and routines locally on the device. Workout entries in progress are also automatically saved as a draft and restored after the app is closed and reopened.

The **History → Data & backup** section provides:

- **Export backup** — downloads a JSON backup containing workouts and routines.
- **Import backup** — restores a previously exported Lift Growth backup.
- A best-effort request for persistent browser storage when supported.

Because the app is local-first, clearing Safari/site data can still remove browser storage. Keep periodic exported backups if the workout history is important to you.


## v11 storage reliability

Lift Growth now uses IndexedDB as its primary on-device database, with localStorage retained only as a fallback and migration source. On launch, the app writes and reads a small probe record and reports **Storage verified** when durable storage is working.

### Quick text import

Lift Growth can turn ordinary workout text into a structured workout or reusable routine. On the **Log** tab, tap **Paste & parse**, then either paste from the clipboard or paste manually into the text box. The preview updates automatically so you can confirm the recognized exercises, sets, reps, and weights before choosing **Start workout** or **Save as routine**.

Example input:

```text
Upper Body
Incline Press — 3 x 8 at 70 lb
Lat Pulldown — 3 x 10 at 120 lb
Seated Row — 3 x 10 at 110 lb
Bicep Curls — 3 x 12 at 25 lb
```

The importer is source-agnostic: the text can come from ChatGPT, Notes, Messages, a coach, or anywhere else. Direct clipboard access depends on browser/iOS permission; when it is blocked, the app provides a normal manual paste fallback.

### Manual entry and Import text tabs

The Log screen now has two clean entry modes. **Manual entry** keeps the normal routine and set-by-set workflow. **Import text** accepts ordinary workout text, including ChatGPT-style headings and bullet lists. The import preview intentionally shows only recognized exercises and sets; headings and notes are ignored.


### v14 import safety
Text imports are now transactional. Lift Growth builds the imported workout off-screen and only replaces the manual-entry form after the full import succeeds. Failed imports leave the current workout untouched. The service worker also uses fresh network files when online to reduce version-mismatch issues after GitHub Pages deployments.


### v15 import fix
Text import now understands exercise blocks with one set per line, including formats like `110 x 10 @ RIR 2`, while preserving the current workout if an import cannot be completed.
