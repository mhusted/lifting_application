const WORKOUT_KEY='liftGrowthWorkoutsV1';
const ROUTINE_KEY='liftGrowthRoutinesV2';
let workouts=safeParse(localStorage.getItem(WORKOUT_KEY),[]);
let routines=safeParse(localStorage.getItem(ROUTINE_KEY),[]);
let currentMetric='e1rm';
let deferredPrompt=null;
const $=id=>document.getElementById(id);
const today=()=>new Date().toISOString().slice(0,10);

const EXERCISE_LIBRARY=[
 'Bench Press','Incline Bench Press','Decline Bench Press','Dumbbell Bench Press','Incline Dumbbell Bench Press','Chest Press Machine','Cable Fly','Pec Deck',
 'Shoulder Press','Dumbbell Shoulder Press','Arnold Press','Lateral Raise','Cable Lateral Raise','Rear Delt Fly',
 'Lat Pulldown','Neutral Grip Lat Pulldown','Cable Row','Seated Row Machine','Chest Supported Row','One-Arm Dumbbell Row','Straight-Arm Pulldown',
 'Biceps Curl','Dumbbell Curl','Hammer Curl','Preacher Curl','Cable Curl','Triceps Pushdown','Overhead Triceps Extension','Skull Crusher',
 'Back Squat','Front Squat','Hack Squat','Leg Press','Romanian Deadlift','Good Morning','Leg Extension','Leg Curl','Seated Leg Curl','Calf Raise','Seated Calf Raise',
 'Hip Abduction Machine','Hip Adduction Machine','Bulgarian Split Squat','Walking Lunge','Goblet Squat'
];

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
function saveWorkouts(){localStorage.setItem(WORKOUT_KEY,JSON.stringify(workouts))}
function saveRoutines(){localStorage.setItem(ROUTINE_KEY,JSON.stringify(routines))}
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
 if(Array.isArray(ex.sets)) return {name:ex.name,sets:ex.sets.map(s=>({weight:+s.weight||0,reps:+s.reps||0,rir:s.rir==null||s.rir===''?null:+s.rir}))};
 const count=Math.max(1,+ex.sets||1);
 return {name:ex.name,sets:Array.from({length:count},()=>({weight:+ex.weight||0,reps:+ex.reps||0,rir:ex.rir==null?null:+ex.rir}))};
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
function addExercise(name='',setCount=3,targetReps='',prefillSets=null){
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
 $('exerciseRows').appendChild(node);
 renderPreviousPerformance(node);
}
function clearWorkout(){
 $('workoutName').value='';$('routineQuickSelect').value='';$('exerciseRows').innerHTML='';addExercise();
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

$('saveWorkout').addEventListener('click',()=>{
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
 workouts.sort((a,b)=>a.date.localeCompare(b.date));saveWorkouts();clearWorkout();$('date').value=today();renderAll();alert('Workout saved.');
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

function drawChart(points,metric){
 const c=$('chart'),ctx=c.getContext('2d');const cssW=Math.max(280,c.parentElement.clientWidth-2);const ratio=Math.min(window.devicePixelRatio||1,2);c.width=cssW*ratio;c.height=360*ratio;c.style.width=cssW+'px';c.style.height='360px';ctx.scale(ratio,ratio);const w=cssW,h=360,pad={l:58,r:20,t:30,b:54};ctx.clearRect(0,0,w,h);ctx.font='13px -apple-system,BlinkMacSystemFont,sans-serif';ctx.fillStyle='#9ca3af';
 if(points.length<2){ctx.fillText('Log at least two sessions to see a trend.',22,55);return;}
 const vals=points.map(p=>p.v),rawMin=Math.min(...vals),rawMax=Math.max(...vals),spread=Math.max(rawMax-rawMin,rawMax*.08,1),min=Math.max(0,rawMin-spread*.35),max=rawMax+spread*.35;
 ctx.strokeStyle='#273449';ctx.lineWidth=1;for(let i=0;i<4;i++){const y=pad.t+i*(h-pad.t-pad.b)/3;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();const val=max-(max-min)*i/3;ctx.fillStyle='#9ca3af';ctx.textAlign='right';ctx.fillText(metric==='volume'?fmt(val):Math.round(val),pad.l-8,y+4)}
 const coords=points.map((p,i)=>({x:pad.l+(points.length===1?0:i*(w-pad.l-pad.r)/(points.length-1)),y:pad.t+(max-p.v)/(max-min)*(h-pad.t-pad.b),...p}));ctx.strokeStyle='#60a5fa';ctx.lineWidth=4;ctx.lineJoin='round';ctx.beginPath();coords.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
 coords.forEach((p,i)=>{ctx.fillStyle='#f8fafc';ctx.beginPath();ctx.arc(p.x,p.y,5,0,Math.PI*2);ctx.fill();if(i===0||i===coords.length-1){ctx.fillStyle='#9ca3af';ctx.textAlign=i===0?'left':'right';ctx.fillText(fmtDate(p.date).replace(/, \d{4}/,''),p.x,h-22)}});
 ctx.fillStyle='#f8fafc';ctx.textAlign='right';const last=coords.at(-1);ctx.fillText(metric==='volume'?`${fmt(last.v)} lb`:`${Math.round(last.v)} lb`,Math.min(last.x,w-pad.r),Math.max(18,last.y-12));
}
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
function renderProgress(){
 const name=$('exerciseSelect').value;if(!name){$('bestWeight').textContent=$('bestE1RM').textContent=$('bestVolume').textContent='—';$('liftChange').textContent='Log a workout to begin tracking.';drawChart([],currentMetric);$('progressTable').innerHTML='<div class="muted">Your exercise history will appear here.</div>';return;}
 const rows=exerciseRows(name);$('bestWeight').textContent=Math.max(...rows.map(r=>r.weight))+' lb';$('bestE1RM').textContent=Math.round(Math.max(...rows.map(r=>r.e1)))+' lb';$('bestVolume').textContent=fmt(Math.max(...rows.map(r=>r.vol)))+' lb';const key=currentMetric==='e1rm'?'e1':currentMetric==='weight'?'weight':'vol';drawChart(rows.map(r=>({v:r[key],date:r.date})),currentMetric);
 if(rows.length>=2){const first=rows[0][key],last=rows.at(-1)[key],pct=first?((last-first)/first*100):0;const label=currentMetric==='e1rm'?'estimated 1RM':currentMetric==='weight'?'top weight':'session volume';$('liftChange').innerHTML=`<strong class="${pct>=0?'good':'bad'}">${pct>=0?'▲':'▼'} ${Math.abs(pct).toFixed(1)}%</strong> ${label} since your first logged session`;}
 else $('liftChange').textContent='Log one more session to calculate your trend.';
 $('progressTable').innerHTML=[...rows].reverse().map(r=>`<div class="progress-item"><strong>${fmtDate(r.date)}</strong><div class="muted">${r.sets.map(s=>`${s.weight}×${s.reps}${s.rir==null?'':` (RIR ${s.rir})`}`).join(' · ')}</div><div class="muted">Top weight ${r.weight} lb · est. 1RM ${Math.round(r.e1)} lb · volume ${fmt(r.vol)} lb</div></div>`).join('');
}

document.querySelectorAll('.metric').forEach(b=>b.addEventListener('click',()=>{currentMetric=b.dataset.metric;document.querySelectorAll('.metric').forEach(x=>x.classList.toggle('active',x===b));renderProgress();}));
function switchTab(id){document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab===id));document.querySelectorAll('.panel').forEach(x=>x.classList.toggle('active',x.id===id))}
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));
function renderAll(){renderDashboard();renderRoutines();renderHistory();renderExerciseSelect()}

if(!routines.length){routines=starters.slice(0,2).map(s=>({id:uid(),name:s.name,exercises:s.exercises.map(e=>({name:e[0],sets:e[1],reps:e[2]}))}));saveRoutines();}
addExercise();renderAll();window.addEventListener('resize',()=>{if($('progress').classList.contains('active'))renderProgress()});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('installBtn').classList.remove('hidden')});$('installBtn').addEventListener('click',async()=>{if(deferredPrompt){deferredPrompt.prompt();deferredPrompt=null}});if('serviceWorker' in navigator)navigator.serviceWorker.register('service-worker.js');
