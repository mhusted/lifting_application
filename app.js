const WORKOUT_KEY='liftGrowthWorkoutsV1';
const ROUTINE_KEY='liftGrowthRoutinesV2';
const DRAFT_KEY='liftGrowthWorkoutDraftV1';
const DB_NAME='liftGrowthDB';
const DB_STORE='kv';
let workouts=[];
let routines=[];
let dbPromise=null;
let currentGrouping='week';
let currentRange='3m';
let currentViz='line';
let deferredPrompt=null;
const $=id=>document.getElementById(id);
const today=()=>new Date().toISOString().slice(0,10);

const EXERCISE_LIBRARY=[
 // Chest
 'Bench Press','Incline Press','Incline Bench Press','Decline Bench Press','Dumbbell Bench Press','Incline Dumbbell Bench Press','Chest Press','Chest Press Machine','Smith Machine Bench Press','Smith Machine Incline Press','Cable Fly','Pec Fly','Pec Deck','Push-Up',
 // Shoulders
 'Shoulder Press','Dumbbell Shoulder Press','Machine Shoulder Press','Smith Machine Shoulder Press','Arnold Press','Lateral Raise','Dumbbell Lateral Raise','Cable Lateral Raise','Front Raise','Rear Delt','Rear Delt Fly','Reverse Pec Deck',
 // Back
 'Lat Pulldown','Neutral Grip Lat Pulldown','Wide Grip Lat Pulldown','Close Grip Lat Pulldown','Assisted Pull-Up','Cable Row','Seated Row','Seated Row Machine','Chest Supported Row','One-Arm Dumbbell Row','Straight-Arm Pulldown','Machine Row','Back Extension',
 // Biceps
 'Bicep Curls','Biceps Curl','Dumbbell Curl','Alternating Dumbbell Curl','Hammer Curl','Preacher Curl','Machine Preacher Curl','Cable Curl','Incline Dumbbell Curl',
 // Triceps
 'Tricep Extensions','Triceps Extension','Triceps Pushdown','Rope Triceps Pushdown','Overhead Triceps Extension','Cable Overhead Triceps Extension','Skull Crusher','Assisted Dip','Dip Machine',
 // Quads / hamstrings / glutes
 'Squat','Back Squat','Front Squat','Smith Machine Squat','Goblet Squat','Hack Squat','Leg Press','Single-Leg Press','Leg Extension','Leg Curl','Seated Leg Curl','Lying Leg Curl','Romanian Deadlift','Deadlift','Smith Machine Romanian Deadlift','Good Morning','Bulgarian Split Squat','Walking Lunge','Reverse Lunge','Hip Thrust','Smith Machine Hip Thrust','Glute Kickback','Cable Glute Kickback',
 // Hips / calves
 'Hip Abduction Machine','Hip Adduction Machine','Standing Hip Abduction','Standing Hip Adduction','Calf Extension','Calf Raise','Standing Calf Raise','Seated Calf Raise','Leg Press Calf Raise',
 // Core
 'Abdominal Crunch Machine','Cable Crunch','Hanging Knee Raise','Captain Chair Knee Raise','Plank','Side Plank','Torso Rotation Machine','Russian Twist',
 // Common cable / functional movements
 'Face Pull','Cable Wood Chop','Farmer Carry'
]

const EXERCISE_ALIASES={
 'seated rows':'Seated Row',
 'seated row':'Seated Row',
 'bicep curl':'Bicep Curls',
 'biceps curls':'Bicep Curls',
 'bicep curls':'Bicep Curls',
 'tricep extension':'Tricep Extensions',
 'tricep extensions':'Tricep Extensions',
 'triceps extension':'Tricep Extensions',
 'triceps extensions':'Tricep Extensions',
 'leg curls':'Leg Curl',
 'leg curl':'Leg Curl',
 'leg extensions':'Leg Extension',
 'leg extension':'Leg Extension',
 'calf extensions':'Calf Extension',
 'calf extension':'Calf Extension',
 'calf raises':'Calf Raise',
 'hip abductors':'Hip Abduction Machine',
 'hip abductor':'Hip Abduction Machine',
 'hip abduction':'Hip Abduction Machine',
 'hip adductors':'Hip Adduction Machine',
 'hip adductor':'Hip Adduction Machine',
 'hip adduction':'Hip Adduction Machine',
 'hip aductors':'Hip Adduction Machine',
 'hip aductor':'Hip Adduction Machine',
 'squats':'Squat',
 'squat':'Squat',
 'deadlifts':'Deadlift',
 'romanian deadlifts':'Romanian Deadlift',
 'rdl':'Romanian Deadlift',
 'rdls':'Romanian Deadlift',
 'pec fly machine':'Pec Fly',
 'rear delts':'Rear Delt',
 'lat pull down':'Lat Pulldown',
 'lat pull downs':'Lat Pulldown'
}

const starters=[
 {id:'starter-upper-a',name:'Upper A',exercises:[['Bench Press',3,6],['Lat Pulldown',3,8],['Shoulder Press',3,8],['Cable Row',3,10],['Biceps Curl',3,10],['Triceps Pushdown',3,10]]},
 {id:'starter-lower-a',name:'Lower A',exercises:[['Back Squat',3,6],['Romanian Deadlift',3,8],['Leg Press',3,10],['Leg Curl',3,10],['Calf Raise',4,12]]},
 {id:'starter-push',name:'Push',exercises:[['Bench Press',3,6],['Incline Bench Press',3,8],['Shoulder Press',3,8],['Lateral Raise',3,12],['Triceps Pushdown',3,10]]},
 {id:'starter-pull',name:'Pull',exercises:[['Lat Pulldown',3,8],['Chest Supported Row',3,8],['Cable Row',3,10],['Biceps Curl',3,10],['Hammer Curl',3,10]]},
 {id:'starter-legs',name:'Legs',exercises:[['Back Squat',3,6],['Romanian Deadlift',3,8],['Leg Press',3,10],['Leg Extension',3,12],['Leg Curl',3,10],['Calf Raise',4,12]]},
 {id:'starter-full',name:'Full Body',exercises:[['Back Squat',3,6],['Bench Press',3,6],['Lat Pulldown',3,8],['Shoulder Press',3,8],['Romanian Deadlift',3,8]]}
];

function safeParse(v,fallback){try{return v?JSON.parse(v):fallback}catch{return fallback}}
function uid(){return crypto?.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(16).slice(2)}`}
function setStorageStatus(text,isError=false){const el=$('storageStatus');if(!el)return;el.textContent=text;el.style.color=isError?'#fca5a5':'';}
function safeLocalGet(key){try{return localStorage.getItem(key)}catch(err){console.warn('localStorage read unavailable',err);return null}}
function safeLocalSet(key,value){try{localStorage.setItem(key,value);return true}catch(err){console.warn('localStorage write unavailable',err);return false}}
function safeLocalRemove(key){try{localStorage.removeItem(key)}catch(err){console.warn('localStorage remove unavailable',err)}}
function openDb(){
 if(dbPromise)return dbPromise;
 dbPromise=new Promise((resolve,reject)=>{
  if(!('indexedDB' in window)){reject(new Error('IndexedDB unavailable'));return;}
  const req=indexedDB.open(DB_NAME,1);
  req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(DB_STORE))db.createObjectStore(DB_STORE)};
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error||new Error('IndexedDB open failed'));
 });
 return dbPromise;
}
async function idbGet(key){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readonly');const req=tx.objectStore(DB_STORE).get(key);req.onsuccess=()=>resolve(req.result??null);req.onerror=()=>reject(req.error);});}
async function idbSet(key,value){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).put(value,key);tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('IndexedDB write aborted'));});}
async function idbDelete(key){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).delete(key);tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error);});}
async function storageGet(key){
 try{const v=await idbGet(key);if(v!=null)return v;}catch(err){console.warn('IndexedDB read failed; using localStorage fallback',err)}
 return safeLocalGet(key);
}
async function storageSet(key,value){
 let idbOk=false;
 try{await idbSet(key,value);idbOk=true;}catch(err){console.error('IndexedDB write failed',err)}
 const localOk=safeLocalSet(key,value);
 if(idbOk){setStorageStatus('Saved on this device');return true;}
 if(localOk){setStorageStatus('Saved using fallback storage');return true;}
 setStorageStatus('Storage unavailable',true);return false;
}
async function storageDelete(key){try{await idbDelete(key)}catch(err){console.warn('IndexedDB delete failed',err)}safeLocalRemove(key)}
async function saveWorkouts(){return storageSet(WORKOUT_KEY,JSON.stringify(workouts))}
async function saveRoutines(){return storageSet(ROUTINE_KEY,JSON.stringify(routines))}
function serializeDraft(){return {date:$('date')?.value||today(),name:$('workoutName')?.value||'',routineId:$('routineQuickSelect')?.value||'',exercises:[...document.querySelectorAll('#exerciseRows .exercise-card')].map(card=>({name:card.querySelector('.exercise-name')?.value||'',sets:[...card.querySelectorAll('.set-entry')].map(row=>({weight:row.querySelector('.set-weight')?.value||'',reps:row.querySelector('.set-reps')?.value||'',rir:row.querySelector('.set-rir')?.value||''}))}))}}
let draftTimer=null;
function saveDraft(){clearTimeout(draftTimer);draftTimer=setTimeout(()=>{storageSet(DRAFT_KEY,JSON.stringify(serializeDraft()))},180)}
async function deleteDraft(){await storageDelete(DRAFT_KEY)}
async function restoreDraft(){const d=safeParse(await storageGet(DRAFT_KEY),null);if(!d||!Array.isArray(d.exercises)||!d.exercises.length)return false;$('date').value=d.date||today();$('workoutName').value=d.name||'';$('exerciseRows').innerHTML='';d.exercises.forEach(e=>addExercise(e.name||'',Math.max(1,e.sets?.length||1),'',e.sets||[]));if(d.routineId&&routines.some(r=>r.id===d.routineId))$('routineQuickSelect').value=d.routineId;return true}
async function loadPersistentData(){
 const storedWorkouts=safeParse(await storageGet(WORKOUT_KEY),[]);
 const storedRoutines=safeParse(await storageGet(ROUTINE_KEY),[]);
 workouts=Array.isArray(storedWorkouts)?storedWorkouts:[];
 routines=Array.isArray(storedRoutines)?storedRoutines:[];
 // Migrate any existing localStorage data into IndexedDB on first v11 launch.
 if(workouts.length)await storageSet(WORKOUT_KEY,JSON.stringify(workouts));
 if(routines.length)await storageSet(ROUTINE_KEY,JSON.stringify(routines));
}
async function verifyStorage(){
 const key='liftGrowthStorageProbe';const value=`ok-${Date.now()}`;
 try{await storageSet(key,value);const read=await storageGet(key);await storageDelete(key);if(read===value){setStorageStatus('Storage verified');return true;}}catch(err){console.error('Storage verification failed',err)}
 setStorageStatus('Storage verification failed',true);return false;
}
async function requestPersistentStorage(){try{if(navigator.storage?.persist){await navigator.storage.persist()}}catch(err){console.warn('Persistent storage request failed',err)}}
function escapeHtml(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function e1rm(w,r){return r===1?w:w*(1+r/30)}
function fmt(n){return Math.round(n).toLocaleString()}
function fmtDate(s){const [y,m,d]=s.split('-').map(Number);return new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',year:'numeric'}).format(new Date(y,m-1,d))}
function startOfWeek(d){const x=new Date(d+'T12:00:00');const day=(x.getDay()+6)%7;x.setDate(x.getDate()-day);x.setHours(0,0,0,0);return x}

function exerciseCatalog(){
 const prior=workouts.flatMap(w=>normalizedWorkout(w).exercises.map(e=>e.name)).filter(Boolean);
 return [...new Set([...EXERCISE_LIBRARY,...prior])].sort((a,b)=>a.localeCompare(b));
}
function canonicalExerciseName(value){
 const clean=String(value||'').trim(); if(!clean)return '';
 const alias=EXERCISE_ALIASES[clean.toLowerCase()];
 if(alias)return alias;
 const exact=exerciseCatalog().find(n=>n.toLowerCase()===clean.toLowerCase());
 return exact||clean;
}
function latestExercisePerformance(name){
 const key=String(name||'').trim().toLowerCase(); if(!key)return null;
 const ordered=[...workouts].sort((a,b)=>b.date.localeCompare(a.date));
 for(const w of ordered){
  const matches=normalizedWorkout(w).exercises.filter(e=>e.name.trim().toLowerCase()===key);
  if(!matches.length)continue;
  const sets=matches.flatMap(e=>e.sets).filter(s=>s.weight>0&&s.reps>0);
  if(sets.length)return {date:w.date,workoutName:w.name,sets};
 }
 return null;
}
function renderPreviousPerformance(card){
 const out=card.querySelector('.previous-performance'); if(!out)return;
 const name=canonicalExerciseName(card.querySelector('.exercise-name')?.value||'');
 if(!name){out.textContent='Choose an exercise to see your previous performance.';return;}
 const last=latestExercisePerformance(name);
 if(!last){out.innerHTML=`<strong>No previous session</strong><span>First logged session for ${escapeHtml(name)}.</span>`;return;}
 const setText=last.sets.map(s=>`${s.weight}×${s.reps}${s.rir==null?'':` @${s.rir} RIR`}`).join(' · ');
 const top=Math.max(...last.sets.map(s=>s.weight));
 const best=Math.max(...last.sets.map(s=>e1rm(s.weight,s.reps)));
 out.innerHTML=`<strong>Last: ${fmtDate(last.date)}</strong><span>${escapeHtml(setText)}</span><small>Top ${top} lb · est. 1RM ${Math.round(best)} lb</small>`;
}
function setupExerciseAutocomplete(input,menu,onPick){
 const close=()=>{menu.classList.add('hidden');menu.innerHTML='';};
 const show=()=>{
  const q=input.value.trim().toLowerCase();
  const choices=exerciseCatalog().filter(n=>!q||n.toLowerCase().includes(q)).slice(0,8);
  menu.innerHTML='';
  choices.forEach(name=>{
   const b=document.createElement('button');b.type='button';b.className='exercise-suggestion';b.textContent=name;
   b.addEventListener('mousedown',e=>e.preventDefault());
   b.addEventListener('click',()=>{input.value=name;close();onPick?.(name);});menu.appendChild(b);
  });
  if(q&&!choices.some(n=>n.toLowerCase()===q)){
   const custom=document.createElement('div');custom.className='custom-exercise-hint';custom.textContent=`Keep “${input.value.trim()}” as a custom exercise`;menu.appendChild(custom);
  }
  menu.classList.toggle('hidden',!menu.children.length);
 };
 input.addEventListener('focus',show);input.addEventListener('input',()=>{show();onPick?.(input.value);});
 input.addEventListener('blur',()=>{setTimeout(close,120);const canonical=canonicalExerciseName(input.value);if(canonical)input.value=canonical;onPick?.(canonical);});
}

// Normalizes old workouts (weight/reps/sets on an exercise) into the new per-set structure.
function normalizeExercise(ex){
 const name=canonicalExerciseName(ex.name||'');
 if(Array.isArray(ex.sets)) return {name,sets:ex.sets.map(s=>({weight:+s.weight||0,reps:+s.reps||0,rir:s.rir==null||s.rir===''?null:+s.rir}))};
 const count=Math.max(1,+ex.sets||1);
 return {name,sets:Array.from({length:count},()=>({weight:+ex.weight||0,reps:+ex.reps||0,rir:ex.rir==null?null:+ex.rir}))};
}
function normalizedWorkout(w){return {...w,exercises:(w.exercises||[]).map(normalizeExercise)}}
function exerciseVolume(ex){return normalizeExercise(ex).sets.reduce((sum,s)=>sum+s.weight*s.reps,0)}
function sessionVolume(w){return (w.exercises||[]).reduce((sum,e)=>sum+exerciseVolume(e),0)}
function setCountForWorkout(w){return (w.exercises||[]).reduce((sum,e)=>sum+normalizeExercise(e).sets.filter(s=>s.weight>0&&s.reps>0).length,0)}
function bestE1ForExercise(ex){const sets=normalizeExercise(ex).sets.filter(s=>s.weight>0&&s.reps>0);return sets.length?Math.max(...sets.map(s=>e1rm(s.weight,s.reps))):0}

$('date').value=today();

function renumberSets(exerciseNode){
 [...exerciseNode.querySelectorAll('.set-entry')].forEach((row,i)=>{row.querySelector('.set-number').textContent=`Set ${i+1}`;});
}
function addSet(exerciseNode, values={}){
 const node=$('setTemplate').content.firstElementChild.cloneNode(true);
 node.querySelector('.set-weight').value=values.weight??'';
 node.querySelector('.set-reps').value=values.reps??'';
 node.querySelector('.set-rir').value=values.rir??'';
 node.querySelector('.remove-set').addEventListener('click',()=>{node.remove();renumberSets(exerciseNode);});
 exerciseNode.querySelector('.set-rows').appendChild(node);
 renumberSets(exerciseNode);
 return node;
}
function addExercise(name='',setCount=3,targetReps='',prefillSets=null,target=null){
 const node=$('exerciseTemplate').content.firstElementChild.cloneNode(true);
 const nameInput=node.querySelector('.exercise-name');
 nameInput.value=canonicalExerciseName(name);
 setupExerciseAutocomplete(nameInput,node.querySelector('.exercise-suggestions'),()=>renderPreviousPerformance(node));
 const rows=node.querySelector('.set-rows'); rows.innerHTML='';
 const sets=Array.isArray(prefillSets)&&prefillSets.length?prefillSets:Array.from({length:Math.max(1,+setCount||1)},()=>({reps:targetReps||''}));
 sets.forEach(s=>addSet(node,s));
 node.querySelector('.add-set').addEventListener('click',()=>{
  const prior=[...node.querySelectorAll('.set-entry')].at(-1);
  addSet(node,{reps:prior?.querySelector('.set-reps').value||targetReps||''});
 });
 node.querySelector('.fill-down').addEventListener('click',()=>{
  const all=[...node.querySelectorAll('.set-entry')]; if(all.length<2)return;
  const first={weight:all[0].querySelector('.set-weight').value,reps:all[0].querySelector('.set-reps').value,rir:all[0].querySelector('.set-rir').value};
  all.slice(1).forEach(r=>{r.querySelector('.set-weight').value=first.weight;r.querySelector('.set-reps').value=first.reps;r.querySelector('.set-rir').value=first.rir;});
 });
 node.querySelector('.remove-exercise').addEventListener('click',()=>node.remove());
 (target||$('exerciseRows')).appendChild(node);
 renderPreviousPerformance(node);
 return node;
}
function clearWorkout(){
 $('workoutName').value='';$('routineQuickSelect').value='';$('exerciseRows').innerHTML='';addExercise();deleteDraft();
}
$('addExercise').addEventListener('click',()=>addExercise('',3,''));
$('clearWorkout').addEventListener('click',clearWorkout);

function loadRoutineIntoLog(routine){
 $('exerciseRows').innerHTML='';
 $('workoutName').value=routine.name;
 routine.exercises.forEach(e=>addExercise(e.name,e.sets,e.reps));
 $('routineQuickSelect').value=routine.id;
 switchTab('log');
 window.scrollTo({top:0,behavior:'smooth'});
}

$('routineQuickSelect').addEventListener('change',e=>{
 const r=routines.find(x=>x.id===e.target.value);
 if(r)loadRoutineIntoLog(r);
});

$('saveWorkout').addEventListener('click',async()=>{
 const exercises=[...document.querySelectorAll('#exerciseRows .exercise-card')].map(card=>({
  name:canonicalExerciseName(card.querySelector('.exercise-name').value),
  sets:[...card.querySelectorAll('.set-entry')].map(row=>({
   weight:+row.querySelector('.set-weight').value||0,
   reps:+row.querySelector('.set-reps').value||0,
   rir:row.querySelector('.set-rir').value===''?null:+row.querySelector('.set-rir').value
  })).filter(s=>s.weight>0&&s.reps>0)
 })).filter(x=>x.name&&x.sets.length);
 if(!exercises.length){alert('Add at least one exercise with a completed set (weight and reps).');return;}
 workouts.push({id:uid(),date:$('date').value||today(),name:$('workoutName').value.trim()||'Workout',exercises});
 workouts.sort((a,b)=>a.date.localeCompare(b.date));const saved=await saveWorkouts();if(!saved){alert('Lift Growth could not save this workout on this device. Please export a backup and try again.');return;}await deleteDraft();clearWorkout();$('date').value=today();renderAll();alert('Workout saved on this device.');
});


// v9: import ordinary workout text from notes, messages, coaches, or AI-generated plans.
function titleCaseExercise(value){
 return String(value||'').trim().replace(/\b\w/g,c=>c.toUpperCase());
}
function cleanImportLine(line){
 return String(line||'')
  .replace(/^\s*(?:[-*•▪◦]+|\d+[.)])\s*/, '')
  .replace(/\*\*/g,'')
  .replace(/^#+\s*/,'')
  .trim();
}
function findExerciseInText(line){
 const lower=line.toLowerCase();
 const names=[...exerciseCatalog(),...Object.keys(EXERCISE_ALIASES)].sort((a,b)=>b.length-a.length);
 const found=names.find(name=>{
  const n=name.toLowerCase();
  const i=lower.indexOf(n);
  if(i<0)return false;
  const before=i===0?' ':lower[i-1], after=i+n.length>=lower.length?' ':lower[i+n.length];
  return !/[a-z]/.test(before)&&!/[a-z]/.test(after);
 });
 return found?canonicalExerciseName(found):'';
}
function inferCustomExerciseName(line){
 let name=line
  .replace(/\([^)]*\)/g,' ')
  .split(/\s[-–—:]\s|:/)[0]
  .replace(/\b\d+(?:\.\d+)?\s*(?:lb|lbs|pounds?|kg|kgs)?\b.*$/i,'')
  .replace(/\b(?:sets?|reps?|at|for|x|×|@)\b.*$/i,'')
  .trim();
 if(!name || name.length>55)return '';
 return canonicalExerciseName(titleCaseExercise(name));
}
function parseWorkoutLine(raw){
 const line=cleanImportLine(raw);
 if(!line)return null;
 let sets=null,reps=null,weight=null;
 let m;
 // 3 sets of 8-10 at 165 lb / 3 sets x 8 reps @ 165
 m=line.match(/(\d+)\s*sets?\s*(?:of|x|×)?\s*(\d+)(?:\s*[-–]\s*\d+)?\s*(?:reps?)?(?:.*?(?:at|@)\s*(\d+(?:\.\d+)?)\s*(?:lb|lbs|pounds?|kg|kgs)?)?/i);
 if(m){sets=+m[1];reps=+m[2];if(m[3])weight=+m[3];}
 // 165 lb x 8 reps x 3 sets
 if(!sets && (m=line.match(/(\d+(?:\.\d+)?)\s*(?:lb|lbs|pounds?|kg|kgs)\s*(?:x|×)\s*(\d+)\s*(?:reps?)?\s*(?:x|×)\s*(\d+)\s*sets?/i))){weight=+m[1];reps=+m[2];sets=+m[3];}
 // 165 x 8 x 3 where the first value is clearly load-sized
 if(!sets && (m=line.match(/\b(\d+(?:\.\d+)?)\s*(?:x|×)\s*(\d+)\s*(?:x|×)\s*(\d+)\b/i))){
  const a=+m[1],b=+m[2],c=+m[3];
  if(a>30 && b<=50 && c<=20){weight=a;reps=b;sets=c;} else {sets=a;reps=b;}
 }
 // 120 for 10x3
 if(!sets && (m=line.match(/\b(\d+(?:\.\d+)?)\s*(?:lb|lbs|pounds?)?\s+for\s+(\d+)\s*(?:x|×)\s*(\d+)\b/i))){weight=+m[1];reps=+m[2];sets=+m[3];}
 // 3x8 @ 165 / 3 x 8 at 165
 if(!sets && (m=line.match(/\b(\d+)\s*(?:x|×)\s*(\d+)(?:\s*[-–]\s*\d+)?(?:\s*(?:reps?))?(?:.*?(?:at|@)\s*(\d+(?:\.\d+)?)\s*(?:lb|lbs|pounds?|kg|kgs)?)?/i))){sets=+m[1];reps=+m[2];if(m[3])weight=+m[3];}
 // One-set shorthand: 165 x 8 / 165 lb for 8
 if(!sets && (m=line.match(/\b(\d+(?:\.\d+)?)\s*(?:lb|lbs|pounds?)\s*(?:x|×|for)\s*(\d+)\b/i))){weight=+m[1];reps=+m[2];sets=1;}
 if(!(sets>0&&reps>0))return null;
 sets=Math.min(20,Math.max(1,sets));reps=Math.min(100,Math.max(1,reps));
 let name=findExerciseInText(line)||inferCustomExerciseName(line);
 if(!name)return null;
 const setData=Array.from({length:sets},()=>({weight:weight||'',reps,rir:''}));
 return {name,sets,reps,weight:weight||null,setData};
}
function parseWorkoutText(text){
 const lines=String(text||'').split(/\r?\n/).map(cleanImportLine).filter(Boolean);
 const exercises=[];
 let workoutName='Imported Workout';
 let pendingHeading='';
 let current=null;

 const flushCurrent=()=>{
  if(!current||!current.name||!current.setData.length)return;
  const first=current.setData[0]||{};
  exercises.push({
   name:canonicalExerciseName(current.name),
   sets:current.setData.length,
   reps:first.reps||'',
   weight:first.weight||null,
   setData:current.setData
  });
  current=null;
 };

 const parseSingleSet=(line)=>{
  // Supports lines such as:
  // 110 x 10 @ RIR 2
  // 110 lb × 10 RIR 2
  // 110 x 10
  // 10 reps @ 110 lb
  let m=line.match(/^\s*(\d+(?:\.\d+)?)\s*(?:lb|lbs|pounds?|kg|kgs)?\s*(?:x|×)\s*(\d+)(?:\s*(?:reps?))?(?:\s*(?:@)?\s*RIR\s*[:=]?\s*(\d+(?:\.\d+)?))?\s*$/i);
  if(m)return {weight:+m[1],reps:+m[2],rir:m[3]==null?'':+m[3]};
  m=line.match(/^\s*(\d+)\s*(?:reps?)\s*(?:@|at)\s*(\d+(?:\.\d+)?)\s*(?:lb|lbs|pounds?|kg|kgs)?(?:\s*(?:@)?\s*RIR\s*[:=]?\s*(\d+(?:\.\d+)?))?\s*$/i);
  if(m)return {weight:+m[2],reps:+m[1],rir:m[3]==null?'':+m[3]};
  return null;
 };

 for(const line of lines){
  const singleSet=parseSingleSet(line);
  if(singleSet){
   if(!current && pendingHeading){
    current={name:pendingHeading,setData:[]};
    pendingHeading='';
   }
   if(current)current.setData.push(singleSet);
   continue;
  }

  // Compact one-line formats such as "Bench Press 3x8 @ 165".
  const parsed=parseWorkoutLine(line);
  if(parsed){
   flushCurrent();
   exercises.push(parsed);
   pendingHeading='';
   continue;
  }

  // A standalone exercise name followed by one line per set.
  const known=findExerciseInText(line);
  const hasDigits=/\d/.test(line);
  if(!hasDigits){
   if(current)flushCurrent();

   if(known){
    pendingHeading=known;
    continue;
   }

   // Keep only the most recent plausible heading. This lets headings such as
   // "Upper Body" be superseded by "Incline Press" before set lines begin.
   const candidate=line
    .replace(/[*_`]/g,'')
    .replace(/[:\-–—]+$/,'')
    .trim();
   if(candidate && candidate.length<=55 && !/^(notes?|warm[- ]?up|cool[- ]?down|sets?|reps?)$/i.test(candidate)){
    pendingHeading=canonicalExerciseName(titleCaseExercise(candidate));
    if(workoutName==='Imported Workout' && !known)workoutName=candidate;
   }
  }
 }
 flushCurrent();

 // Merge adjacent blocks with the same exercise name, preserving each set.
 const merged=[];
 for(const ex of exercises){
  const prior=merged.at(-1);
  if(prior && prior.name.toLowerCase()===ex.name.toLowerCase()){
   prior.setData=[...(prior.setData||[]),...(ex.setData||[])];
   prior.sets=prior.setData.length;
   prior.reps=prior.setData[0]?.reps||prior.reps;
   prior.weight=prior.setData[0]?.weight||prior.weight;
  }else merged.push(ex);
 }

 return {name:workoutName,exercises:merged};
}
function renderImportPreview(parsed){
 const box=$('importTextPreview');
 if(!parsed.exercises.length){box.classList.remove('hidden');box.innerHTML='<strong>No exercises recognized yet.</strong><span>Try including each exercise with sets and reps, for example: “Leg Press — 3 × 10 at 220 lb”.</span>';return;}
 box.classList.remove('hidden');
 box.innerHTML=`<span>${parsed.exercises.length} exercise${parsed.exercises.length===1?'':'s'} recognized</span><div class="import-preview-list">${parsed.exercises.map(e=>`<span><strong>${escapeHtml(e.name)}</strong> · ${e.sets} × ${e.reps}${e.weight?` @ ${e.weight} lb`:''}</span>`).join('')}</div>`;
}
function currentImportedPlan(){
 const parsed=parseWorkoutText($('importTextInput').value);
 renderImportPreview(parsed);
 return parsed;
}
let importPreviewTimer=null;
function scheduleImportPreview(){
 clearTimeout(importPreviewTimer);
 importPreviewTimer=setTimeout(()=>{
  if($('importTextInput').value.trim()) currentImportedPlan();
  else { $('importTextPreview').classList.add('hidden'); $('importTextPreview').innerHTML=''; }
 },180);
}
async function pasteWorkoutText(){
 const input=$('importTextInput');
 const help=$('clipboardHelp');
 try{
  if(!navigator.clipboard?.readText)throw new Error('Clipboard API unavailable');
  const text=await navigator.clipboard.readText();
  if(!text.trim())throw new Error('Clipboard is empty');
  input.value=text;
  currentImportedPlan();
  help.textContent='Clipboard pasted. Review the recognized workout below.';
  help.classList.add('good');
 }catch(err){
  help.textContent='Direct clipboard access was blocked. Tap the workout text box, then choose Paste.';
  help.classList.remove('good');
  input.focus();
  input.select?.();
 }
}
function setEntryMode(mode){
 document.querySelectorAll('.entry-mode').forEach(btn=>{
  const active=btn.dataset.entryMode===mode;
  btn.classList.toggle('active',active);
  btn.setAttribute('aria-selected',active?'true':'false');
 });
 $('manualEntryPanel').classList.toggle('active',mode==='manual');
 $('importEntryPanel').classList.toggle('active',mode==='import');
 if(mode==='import')setTimeout(()=>$('importTextInput').focus(),30);
}
document.querySelectorAll('.entry-mode').forEach(btn=>btn.addEventListener('click',()=>setEntryMode(btn.dataset.entryMode)));
$('pasteImportText').addEventListener('click',pasteWorkoutText);
$('importTextInput').addEventListener('input',scheduleImportPreview);
$('previewImportText').addEventListener('click',currentImportedPlan);
function hasMeaningfulManualEntry(){
 return [...document.querySelectorAll('#exerciseRows .exercise-card')].some(card=>{
  const name=card.querySelector('.exercise-name')?.value?.trim();
  const values=[...card.querySelectorAll('.set-entry input')].some(input=>String(input.value||'').trim());
  return !!name||values;
 }) || !!$('workoutName').value.trim();
}
function showImportMessage(message,isError=false){
 const el=$('importActionMessage');if(!el)return;
 el.textContent=message;el.classList.remove('hidden','good','bad');el.classList.add(isError?'bad':'good');
}
$('importAsWorkout').addEventListener('click',()=>{
 try{
  const parsed=currentImportedPlan();
  if(!parsed.exercises.length){showImportMessage('Nothing was imported. Add sets and reps to at least one exercise, then try again.',true);return;}
  if(hasMeaningfulManualEntry()&&!confirm('Start this imported workout? Your current manual entry will be replaced.'))return;

  // Build the entire imported workout off-screen first. The current workout is not
  // touched unless every exercise can be created successfully.
  const fragment=document.createDocumentFragment();
  parsed.exercises.forEach(e=>{
   if(!e?.name||!Number.isFinite(+e.sets)||+e.sets<1||!Number.isFinite(+e.reps)||+e.reps<1)throw new Error('Invalid imported exercise');
   addExercise(e.name,e.sets,e.reps,e.setData,fragment);
  });
  if(!fragment.childNodes.length)throw new Error('No valid exercises were created');

  $('exerciseRows').replaceChildren(fragment);
  $('workoutName').value=parsed.name==='Imported Workout'?'':parsed.name;
  $('routineQuickSelect').value='';
  showImportMessage('Workout imported successfully.');
  setEntryMode('manual');switchTab('log');window.scrollTo({top:0,behavior:'smooth'});saveDraft();
 }catch(err){
  console.error('Workout text import failed',err);
  showImportMessage(`Import could not be started${err?.message?`: ${err.message}`:''}. Your existing workout is unchanged.`,true);
 }
});
$('importAsRoutine').addEventListener('click',()=>{
 const parsed=currentImportedPlan();
 if(!parsed.exercises.length)return;
 let routineName=parsed.name||'Imported Routine';
 if(routines.some(r=>r.name.toLowerCase()===routineName.toLowerCase()))routineName=`${routineName} Copy`;
 routines.push({id:uid(),name:routineName,exercises:parsed.exercises.map(e=>({name:e.name,sets:e.sets,reps:e.reps}))});
 saveRoutines();renderRoutines();
 setEntryMode('manual');switchTab('routines');
});

function routineCard(r,isStarter=false){
 const ex=r.exercises.map(e=>typeof e[0]==='string'?{name:e[0],sets:e[1],reps:e[2]}:e);
 const el=document.createElement('article');el.className='routine-card';
 el.innerHTML=`<div class="routine-card-head"><div><strong>${escapeHtml(r.name)}</strong><div class="muted">${ex.length} exercises</div></div><span class="routine-badge">${isStarter?'Template':'Saved'}</span></div><div class="routine-preview">${ex.slice(0,5).map(e=>`<span>${escapeHtml(e.name)} · ${e.sets}×${e.reps}</span>`).join('')}${ex.length>5?`<span>+${ex.length-5} more</span>`:''}</div><div class="routine-buttons"></div>`;
 const buttons=el.querySelector('.routine-buttons');
 if(isStarter){
  const add=document.createElement('button');add.className='primary small';add.textContent='Add to My Routines';add.addEventListener('click',()=>{
   const copy={id:uid(),name:r.name,exercises:ex.map(e=>({...e}))};
   const same=routines.find(x=>x.name.toLowerCase()===copy.name.toLowerCase());if(same)copy.name=`${copy.name} Copy`;
   routines.push(copy);saveRoutines();renderRoutines();
  });buttons.appendChild(add);
 }else{
  const start=document.createElement('button');start.className='primary small';start.textContent='Start workout';start.addEventListener('click',()=>loadRoutineIntoLog(r));buttons.appendChild(start);
  const edit=document.createElement('button');edit.className='secondary small';edit.textContent='Edit';edit.addEventListener('click',()=>openRoutineEditor(r));buttons.appendChild(edit);
  const del=document.createElement('button');del.className='text-btn danger';del.textContent='Delete';del.addEventListener('click',()=>{if(confirm(`Delete ${r.name}?`)){routines=routines.filter(x=>x.id!==r.id);saveRoutines();renderRoutines();}});buttons.appendChild(del);
 }
 return el;
}

function renderRoutines(){
 const list=$('routineList');list.innerHTML='';
 if(!routines.length)list.innerHTML='<div class="empty-state"><strong>No saved routines yet.</strong><span>Add a starter template or create your own.</span></div>';
 routines.forEach(r=>list.appendChild(routineCard(r)));
 const startersEl=$('starterList');startersEl.innerHTML='';starters.forEach(r=>startersEl.appendChild(routineCard(r,true)));
 const select=$('routineQuickSelect'),cur=select.value;select.innerHTML='<option value="">Blank workout</option>'+routines.map(r=>`<option value="${r.id}">${escapeHtml(r.name)}</option>`).join('');if(routines.some(r=>r.id===cur))select.value=cur;
}

function renumberRoutineExercises(){
 [...document.querySelectorAll('.routine-exercise-row')].forEach((row,i)=>{row.querySelector('.routine-order').textContent=String(i+1);});
}
function moveRoutineRow(row,direction){
 const parent=row.parentElement;
 if(direction<0&&row.previousElementSibling)parent.insertBefore(row,row.previousElementSibling);
 if(direction>0&&row.nextElementSibling)parent.insertBefore(row.nextElementSibling,row);
 renumberRoutineExercises();
}
function addRoutineExercise(name='',sets=3,reps=8){
 const node=$('routineExerciseTemplate').content.firstElementChild.cloneNode(true);
 const input=node.querySelector('.routine-exercise-name');input.value=canonicalExerciseName(name);node.querySelector('.routine-sets').value=sets;node.querySelector('.routine-reps').value=reps;
 setupExerciseAutocomplete(input,node.querySelector('.exercise-suggestions'));
 node.querySelector('.remove').addEventListener('click',()=>{node.remove();renumberRoutineExercises();});
 node.querySelector('.move-up').addEventListener('click',()=>moveRoutineRow(node,-1));
 node.querySelector('.move-down').addEventListener('click',()=>moveRoutineRow(node,1));
 $('routineExerciseRows').appendChild(node);renumberRoutineExercises();
}
function openRoutineEditor(r=null){
 $('routineId').value=r?.id||'';$('routineName').value=r?.name||'';$('routineDialogTitle').textContent=r?'Edit routine':'New routine';$('routineExerciseRows').innerHTML='';
 (r?.exercises?.length?r.exercises:[{name:'',sets:3,reps:8}]).forEach(e=>addRoutineExercise(e.name,e.sets,e.reps));
 $('routineDialog').showModal();
}
$('newRoutine').addEventListener('click',()=>openRoutineEditor());$('addRoutineExercise').addEventListener('click',()=>addRoutineExercise());$('closeRoutine').addEventListener('click',()=>$('routineDialog').close());
$('routineForm').addEventListener('submit',e=>{
 e.preventDefault();const name=$('routineName').value.trim();const exercises=[...document.querySelectorAll('.routine-exercise-row')].map(row=>({name:canonicalExerciseName(row.querySelector('.routine-exercise-name').value),sets:+row.querySelector('.routine-sets').value||0,reps:+row.querySelector('.routine-reps').value||0})).filter(x=>x.name&&x.sets>0&&x.reps>0);
 if(!name||!exercises.length){alert('Give the routine a name and add at least one exercise.');return;}
 const id=$('routineId').value;if(id){const idx=routines.findIndex(r=>r.id===id);if(idx>=0)routines[idx]={id,name,exercises};}else routines.push({id:uid(),name,exercises});
 saveRoutines();$('routineDialog').close();renderRoutines();
});

function renderDashboard(){
 const now=new Date(),cur=startOfWeek(now.toISOString().slice(0,10)),prev=new Date(cur),next=new Date(cur);prev.setDate(prev.getDate()-7);next.setDate(next.getDate()+7);
 const inRange=(w,a,b)=>{const d=new Date(w.date+'T12:00:00');return d>=a&&d<b};const cw=workouts.filter(w=>inRange(w,cur,next)),pw=workouts.filter(w=>inRange(w,prev,cur));
 const cv=cw.reduce((s,w)=>s+sessionVolume(w),0),pv=pw.reduce((s,w)=>s+sessionVolume(w),0);$('weekVolume').textContent=`${fmt(cv)} lb`;$('weekChange').textContent=pv?`${cv>=pv?'▲':'▼'} ${Math.abs((cv-pv)/pv*100).toFixed(1)}% vs last week`:'No prior week yet';$('weekChange').className='muted '+(pv?(cv>=pv?'good':'bad'):'');$('workoutCount').textContent=cw.length;$('setCount').textContent=cw.reduce((s,w)=>s+setCountForWorkout(w),0);
 let prs=0;const best={};[...workouts].sort((a,b)=>a.date.localeCompare(b.date)).forEach(w=>normalizedWorkout(w).exercises.forEach(ex=>{const key=ex.name.toLowerCase(),v=bestE1ForExercise(ex);if(v<=0)return;if(best[key]==null||v>best[key]){if(best[key]!=null&&inRange(w,cur,next))prs++;best[key]=v}}));$('prCount').textContent=prs;
}

function setSummary(ex){
 const n=normalizeExercise(ex);return n.sets.map(s=>`${s.weight}×${s.reps}${s.rir==null?'':` @${s.rir} RIR`}`).join(' · ');
}
function renderHistory(){
 const el=$('historyList');el.innerHTML='';[...workouts].sort((a,b)=>b.date.localeCompare(a.date)).forEach(w=>{const nw=normalizedWorkout(w);const d=document.createElement('div');d.className='history-item';d.innerHTML=`<div class="history-top"><div><strong>${escapeHtml(w.name)}</strong><div class="muted">${fmtDate(w.date)} · ${setCountForWorkout(w)} sets · ${fmt(sessionVolume(w))} lb volume</div></div><button class="delete-workout" data-id="${w.id}">Delete</button></div><div class="history-exercises">${nw.exercises.map(e=>`<div class="history-exercise"><strong>${escapeHtml(e.name)}</strong><span class="muted">${escapeHtml(setSummary(e))}</span></div>`).join('')}</div>`;el.appendChild(d)});if(!workouts.length)el.innerHTML='<div class="empty-state"><strong>No workouts yet.</strong><span>Log your first workout to start tracking progress.</span></div>';
 el.querySelectorAll('.delete-workout').forEach(b=>b.addEventListener('click',()=>{if(confirm('Delete this workout?')){workouts=workouts.filter(w=>w.id!==b.dataset.id);saveWorkouts();renderAll();}}));
}
function allExerciseNames(){return [...new Set(workouts.flatMap(w=>normalizedWorkout(w).exercises.map(e=>e.name)))].sort((a,b)=>a.localeCompare(b))}
function renderExerciseSelect(){const s=$('exerciseSelect'),cur=s.value,names=allExerciseNames();s.innerHTML=names.map(n=>`<option>${escapeHtml(n)}</option>`).join('');if(names.includes(cur))s.value=cur;s.onchange=renderProgress;renderProgress()}

function chartValueLabel(v,metric){return metric==='volume'?`${fmt(v)} lb`:`${Math.round(v)} lb`}
function shortPointLabel(p){return p.label||fmtDate(p.date).replace(/, \d{4}/,'')}
function drawChart(points,metric,viz='line',canvasId='strengthChart'){
 const c=$(canvasId),ctx=c.getContext('2d');const cssW=Math.max(280,c.parentElement.clientWidth-2);const ratio=Math.min(window.devicePixelRatio||1,2);c.width=cssW*ratio;c.height=360*ratio;c.style.width=cssW+'px';c.style.height='360px';ctx.scale(ratio,ratio);const w=cssW,h=360,pad={l:58,r:20,t:30,b:62};ctx.clearRect(0,0,w,h);ctx.font='13px -apple-system,BlinkMacSystemFont,sans-serif';ctx.fillStyle='#9ca3af';
 if(!points.length){ctx.fillText('No data in this time range yet.',22,55);return;}
 const vals=points.map(p=>p.v),rawMin=Math.min(...vals),rawMax=Math.max(...vals),spread=Math.max(rawMax-rawMin,rawMax*.08,1),min=Math.max(0,rawMin-spread*.25),max=rawMax+spread*.25;
 ctx.strokeStyle='#273449';ctx.lineWidth=1;for(let i=0;i<4;i++){const y=pad.t+i*(h-pad.t-pad.b)/3;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();const val=max-(max-min)*i/3;ctx.fillStyle='#9ca3af';ctx.textAlign='right';ctx.fillText(metric==='volume'?fmt(val):Math.round(val),pad.l-8,y+4)}
 const plotW=w-pad.l-pad.r,plotH=h-pad.t-pad.b;
 if(viz==='bar'){
  const slot=plotW/Math.max(points.length,1),barW=Math.max(6,Math.min(42,slot*.62));
  points.forEach((p,i)=>{const x=pad.l+slot*i+slot/2-barW/2,y=pad.t+(max-p.v)/(max-min)*plotH,base=pad.t+(max-min)/(max-min)*plotH;ctx.fillStyle='#60a5fa';ctx.fillRect(x,y,barW,Math.max(2,base-y));if(points.length<=8||i===0||i===points.length-1){ctx.fillStyle='#9ca3af';ctx.textAlign='center';ctx.fillText(shortPointLabel(p),x+barW/2,h-28)}});
 }else{
  const coords=points.map((p,i)=>({x:pad.l+(points.length===1?plotW/2:i*plotW/(points.length-1)),y:pad.t+(max-p.v)/(max-min)*plotH,...p}));ctx.strokeStyle='#60a5fa';ctx.lineWidth=4;ctx.lineJoin='round';ctx.beginPath();coords.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();coords.forEach((p,i)=>{ctx.fillStyle='#f8fafc';ctx.beginPath();ctx.arc(p.x,p.y,5,0,Math.PI*2);ctx.fill();if(points.length<=8||i===0||i===coords.length-1){ctx.fillStyle='#9ca3af';ctx.textAlign=i===0?'left':i===coords.length-1?'right':'center';ctx.fillText(shortPointLabel(p),p.x,h-28)}});
 }
 ctx.fillStyle='#f8fafc';ctx.textAlign='right';const last=points.at(-1);ctx.fillText(chartValueLabel(last.v,metric),w-pad.r,20);
}
function parseLocalDate(s){const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d,12,0,0)}
function filterRowsByRange(rows,range){if(range==='all'||!rows.length)return rows;const latest=parseLocalDate(rows.at(-1).date);const start=new Date(latest);if(range==='4w')start.setDate(start.getDate()-28);if(range==='3m')start.setMonth(start.getMonth()-3);if(range==='6m')start.setMonth(start.getMonth()-6);if(range==='1y')start.setFullYear(start.getFullYear()-1);return rows.filter(r=>parseLocalDate(r.date)>=start)}
function periodInfo(date,group){const d=parseLocalDate(date);if(group==='session')return {key:date,label:fmtDate(date).replace(/, \d{4}/,'')};if(group==='week'){const monday=new Date(d);monday.setDate(d.getDate()-((d.getDay()+6)%7));const y=monday.getFullYear(),m=String(monday.getMonth()+1).padStart(2,'0'),day=String(monday.getDate()).padStart(2,'0');return {key:`${y}-${m}-${day}`,label:`Wk ${new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric'}).format(monday)}`}}if(group==='month')return {key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,label:new Intl.DateTimeFormat(undefined,{month:'short',year:'2-digit'}).format(d)};return {key:String(d.getFullYear()),label:String(d.getFullYear())}}
function aggregateRows(rows,metric,group){const key=metric==='e1rm'?'e1':metric==='weight'?'weight':'vol';if(group==='session')return rows.map(r=>({v:r[key],date:r.date,label:fmtDate(r.date).replace(/, \d{4}/,''),count:1,rows:[r]}));const buckets=new Map();rows.forEach(r=>{const p=periodInfo(r.date,group);if(!buckets.has(p.key))buckets.set(p.key,{...p,rows:[]});buckets.get(p.key).rows.push(r)});return [...buckets.values()].sort((a,b)=>a.key.localeCompare(b.key)).map(b=>({date:b.rows[0].date,label:b.label,count:b.rows.length,rows:b.rows,v:metric==='volume'?b.rows.reduce((sum,r)=>sum+r.vol,0):Math.max(...b.rows.map(r=>r[key]))}))}
function exerciseRows(name){
 const rows=[];
 workouts.forEach(w=>{
  const matching=normalizedWorkout(w).exercises.filter(e=>e.name===name);
  if(!matching.length)return;
  const sets=matching.flatMap(e=>e.sets).filter(s=>s.weight>0&&s.reps>0);if(!sets.length)return;
  rows.push({date:w.date,sets,weight:Math.max(...sets.map(s=>s.weight)),vol:sets.reduce((a,s)=>a+s.weight*s.reps,0),e1:Math.max(...sets.map(s=>e1rm(s.weight,s.reps)))});
 });
 return rows.sort((a,b)=>a.date.localeCompare(b.date));
}
function pctChange(points){
 if(points.length<2||!points[0].v)return null;
 return (points.at(-1).v-points[0].v)/points[0].v*100;
}
function changeHtml(pct,label){
 if(pct==null)return `Log at least two periods to see ${label} change.`;
 return `<strong class="${pct>=0?'good':'bad'}">${pct>=0?'▲':'▼'} ${Math.abs(pct).toFixed(1)}%</strong> ${label} over the selected period`;
}
function rangeLabel(range){return range==='all'?'all time':range==='4w'?'last 4 weeks':range==='3m'?'last 3 months':range==='6m'?'last 6 months':'last year'}
function renderProgress(){
 const name=$('exerciseSelect').value;
 if(!name){
  $('bestWeight').textContent=$('bestE1RM').textContent=$('bestVolume').textContent='—';
  $('strengthChange').textContent='Log a workout to begin tracking.';$('volumeChange').textContent='Log a workout to begin tracking.';
  drawChart([],'e1rm',currentViz,'strengthChart');drawChart([],'volume',currentViz,'volumeChart');
  $('progressTable').innerHTML='<div class="muted">Your exercise history will appear here.</div>';return;
 }
 const allRows=exerciseRows(name),rows=filterRowsByRange(allRows,currentRange);
 if(!rows.length){
  $('bestWeight').textContent=$('bestE1RM').textContent=$('bestVolume').textContent='—';
  $('strengthChange').textContent=$('volumeChange').textContent='No sessions for this exercise in the selected range.';
  drawChart([],'e1rm',currentViz,'strengthChart');drawChart([],'volume',currentViz,'volumeChart');
  $('progressTable').innerHTML='<div class="empty-state"><strong>No data in this range.</strong><span>Choose a wider time range or log another workout.</span></div>';return;
 }
 $('bestWeight').textContent=Math.max(...rows.map(r=>r.weight))+' lb';
 $('bestE1RM').textContent=Math.round(Math.max(...rows.map(r=>r.e1)))+' lb';
 $('bestVolume').textContent=fmt(Math.max(...rows.map(r=>r.vol)))+' lb';
 const strengthPoints=aggregateRows(rows,'e1rm',currentGrouping);
 const volumePoints=aggregateRows(rows,'volume',currentGrouping);
 drawChart(strengthPoints,'e1rm',currentViz,'strengthChart');
 drawChart(volumePoints,'volume',currentViz,'volumeChart');
 $('strengthChange').innerHTML=changeHtml(pctChange(strengthPoints),'estimated 1RM');
 $('volumeChange').innerHTML=changeHtml(pctChange(volumePoints),`${currentGrouping} volume`);
 const groupLabel=currentGrouping==='week'?'Weekly':'Monthly';
 $('progressViewSummary').textContent=`${groupLabel} view · ${rows.length} session${rows.length===1?'':'s'} · ${rangeLabel(currentRange)}`;
 const strengthByKey=new Map(strengthPoints.map(p=>[periodInfo(p.date,currentGrouping).key,p]));
 const volumeByKey=new Map(volumePoints.map(p=>[periodInfo(p.date,currentGrouping).key,p]));
 const keys=[...new Set([...strengthByKey.keys(),...volumeByKey.keys()])].sort().reverse();
 $('progressTable').innerHTML=keys.map(k=>{
   const sp=strengthByKey.get(k),vp=volumeByKey.get(k),p=sp||vp;
   return `<div class="progress-item"><strong>${escapeHtml(p.label)}</strong><div class="muted">${p.count} session${p.count===1?'':'s'}</div><div class="muted">Best est. 1RM: ${sp?chartValueLabel(sp.v,'e1rm'):'—'} · Total volume: ${vp?chartValueLabel(vp.v,'volume'):'—'}</div></div>`;
 }).join('');
}

document.querySelectorAll('.grouping').forEach(b=>b.addEventListener('click',()=>{currentGrouping=b.dataset.group;document.querySelectorAll('.grouping').forEach(x=>x.classList.toggle('active',x===b));renderProgress();}));
document.querySelectorAll('.range').forEach(b=>b.addEventListener('click',()=>{currentRange=b.dataset.range;document.querySelectorAll('.range').forEach(x=>x.classList.toggle('active',x===b));renderProgress();}));
document.querySelectorAll('.viz').forEach(b=>b.addEventListener('click',()=>{currentViz=b.dataset.viz;document.querySelectorAll('.viz').forEach(x=>x.classList.toggle('active',x===b));renderProgress();}));
function switchTab(id){document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab===id));document.querySelectorAll('.panel').forEach(x=>x.classList.toggle('active',x.id===id))}
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));
function exportBackup(){
 const payload={app:'Lift Growth',version:10,exportedAt:new Date().toISOString(),workouts,routines};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`lift-growth-backup-${today()}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function importBackupFile(file){
 if(!file)return;try{const parsed=JSON.parse(await file.text());if(!Array.isArray(parsed.workouts)||!Array.isArray(parsed.routines))throw new Error('Invalid backup');
  if(!confirm(`Restore ${parsed.workouts.length} workout(s) and ${parsed.routines.length} routine(s)? This will replace the data currently stored on this device.`))return;
  workouts=parsed.workouts;routines=parsed.routines;saveWorkouts();saveRoutines();renderAll();alert('Backup restored successfully.');
 }catch(err){console.error(err);alert('That file does not look like a valid Lift Growth backup.');}
}
$('exportBackup')?.addEventListener('click',exportBackup);
$('importBackup')?.addEventListener('change',e=>{importBackupFile(e.target.files?.[0]);e.target.value='';});
$('log')?.addEventListener('input',saveDraft);
$('log')?.addEventListener('change',saveDraft);
function renderAll(){renderDashboard();renderRoutines();renderHistory();renderExerciseSelect()}

async function initializeApp(){
 setStorageStatus('Checking storage…');
 await loadPersistentData();
 if(!routines.length){routines=starters.slice(0,2).map(s=>({id:uid(),name:s.name,exercises:s.exercises.map(e=>({name:e[0],sets:e[1],reps:e[2]}))}));await saveRoutines();}
 if(!await restoreDraft())addExercise();
 renderAll();
 await requestPersistentStorage();
 await verifyStorage();
}
window.addEventListener('resize',()=>{if($('progress').classList.contains('active'))renderProgress()});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('installBtn').classList.remove('hidden')});$('installBtn').addEventListener('click',async()=>{if(deferredPrompt){deferredPrompt.prompt();deferredPrompt=null}});if('serviceWorker' in navigator)navigator.serviceWorker.register('service-worker.js');
initializeApp().catch(err=>{console.error('Lift Growth initialization failed',err);setStorageStatus('Storage initialization failed',true);if(!$('exerciseRows').children.length)addExercise();renderAll();});
