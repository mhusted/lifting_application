// Lift Growth v22: persistent custom exercise library.
(() => {
  const KEY = 'liftGrowthCustomExercisesV1';
  const read = () => {
    try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v.filter(x => typeof x === 'string' && x.trim()) : []; }
    catch { return []; }
  };
  const write = names => { try { localStorage.setItem(KEY, JSON.stringify(names)); } catch (err) { console.warn('Custom exercise library write failed', err); } };
  const originalCatalog = window.exerciseCatalog;
  const initialCatalog = typeof originalCatalog === 'function' ? originalCatalog() : [];
  const merge = names => {
    const current = read();
    const seen = new Set(current.map(x => x.toLowerCase()));
    let changed = false;
    for (const raw of names || []) {
      const clean = String(raw || '').trim();
      if (!clean) continue;
      const canonical = typeof window.canonicalExerciseName === 'function' ? window.canonicalExerciseName(clean) : clean;
      const builtIn = initialCatalog.some(x => String(x).toLowerCase() === canonical.toLowerCase());
      if (!builtIn && !seen.has(canonical.toLowerCase())) { current.push(canonical); seen.add(canonical.toLowerCase()); changed = true; }
    }
    if (changed) { current.sort((a,b) => a.localeCompare(b)); write(current); }
  };
  if (typeof originalCatalog === 'function') {
    window.exerciseCatalog = function exerciseCatalogWithSavedCustoms() {
      const all = [...originalCatalog(), ...read()];
      return [...new Map(all.filter(Boolean).map(x => [String(x).toLowerCase(), String(x)])).values()].sort((a,b) => a.localeCompare(b));
    };
  }
  setTimeout(() => {
    if (typeof originalCatalog !== 'function') return;
    const base = new Set(initialCatalog.map(x => String(x).toLowerCase()));
    merge(originalCatalog().filter(x => !base.has(String(x).toLowerCase())));
  }, 500);
  const countWorkouts = () => {
    const textValue = document.getElementById('localDataCount')?.textContent || '0 workouts';
    const m = textValue.match(/(\d+)\s+workout/); return m ? Number(m[1]) : 0;
  };
  const saveBtn = document.getElementById('saveWorkout');
  if (saveBtn) saveBtn.addEventListener('click', () => {
    const before = countWorkouts();
    const names = [...document.querySelectorAll('#exerciseRows .exercise-name')].map(x => x.value.trim()).filter(Boolean);
    setTimeout(() => { if (countWorkouts() > before) merge(names); }, 500);
  }, true);
  const importBtn = document.getElementById('importAsWorkout');
  if (importBtn) importBtn.addEventListener('click', () => {
    const before = countWorkouts();
    let names = [];
    try { names = (window.currentImportedPlan?.().exercises || []).map(e => e.name); } catch {}
    setTimeout(() => { if (countWorkouts() > before) merge(names); }, 500);
  }, true);
})();