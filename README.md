# Lift Growth

**A simple, mobile-first strength training tracker for building routines, logging workouts, and visualizing progress over time.**

Lift Growth is a Progressive Web App (PWA) designed primarily for iPhone. It can be installed directly from Safari and used like a standalone app—without the App Store, Xcode, or a Mac.

## Features

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
