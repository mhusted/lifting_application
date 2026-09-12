LIFT GROWTH PWA — UPDATED ROUTINES + PROGRESS VERSION

WHAT'S NEW
- Create, edit, delete, and reuse your own workout routines.
- Starter templates: Upper A, Lower A, Push, Pull, Legs, and Full Body.
- Each routine stores exercises plus target sets and reps.
- Start a workout directly from any saved routine.
- Lift progress charts can switch between estimated 1RM, top weight, and session volume.
- Progress callout shows percentage change from your first logged session.
- Existing workout history stored under liftGrowthWorkoutsV1 remains compatible.
- Your routines and workouts are stored locally on the device/browser.

PUBLISH FROM WINDOWS WITH GITHUB PAGES
1. Unzip this folder.
2. Create a public GitHub repository, for example: lift-growth.
3. Upload the files INSIDE this folder to the repository root.
4. In GitHub open Settings > Pages.
5. Under Build and deployment choose Deploy from a branch.
6. Choose main and / (root), then Save.
7. GitHub will publish a URL such as https://YOURNAME.github.io/lift-growth/

IF YOU ALREADY PUBLISHED THE OLD VERSION
Upload/replace index.html, app.js, styles.css, and service-worker.js in the same repository. Commit the changes. The app's service worker is versioned, so it will refresh to the new version after GitHub Pages updates.

ADD TO IPHONE
1. Open the GitHub Pages URL in Safari on iPhone.
2. Tap Share.
3. Tap Add to Home Screen.
4. Tap Add.

DATA NOTE
Workout history is saved in the browser's local storage. Clearing Safari website data can erase it. A future improvement should add Export/Import backup.
