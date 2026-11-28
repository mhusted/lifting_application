const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('app.js','utf8');
function extract(start,end){return source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));}
function context(overrides={}){const c=vm.createContext({console:{error(){},warn(){}},...overrides});vm.runInContext(extract('async function storageGet(','async function saveWorkouts()')+extract('function validateBackup(','async function importBackupFile('),c);return c;}
const workout={id:'w1',date:'2026-11-28',name:'Upper',exercises:[{name:'Chest Press',sets:[{weight:100,reps:10,rir:2}]}]};
test('full app parses',()=>assert.doesNotThrow(()=>new vm.Script(source)));
test('primary read failure does not silently load stale mirror',async()=>{const c=context({idbGet:async()=>{throw Error('offline')},safeLocalGet:()=> 'stale'});await assert.rejects(c.storageGet('x'));});
test('legacy data is read when primary key is absent',async()=>{const c=context({idbGet:async()=>null,safeLocalGet:()=> 'legacy'});assert.equal(await c.storageGet('x'),'legacy');});
test('failed transaction does not write legacy mirror',async()=>{let writes=0;const c=context({openDb:async()=>{throw Error('failure')},safeLocalSet:()=>writes++,setStorageStatus(){}});assert.equal(await c.storageSet('x','new'),false);assert.equal(writes,0);});
test('batch mirrors only after transaction completes',async()=>{let writes=[];let tx;const c=context({openDb:async()=>({transaction(){tx={objectStore:()=>({put(){}})};return tx;}}),safeLocalSet:(...args)=>writes.push(args),setStorageStatus(){}});const pending=c.storageBatch([['w','1'],['r','2']]);await new Promise(resolve=>setImmediate(resolve));assert.ok(tx,'transaction initialized');assert.equal(writes.length,0);tx.oncomplete();assert.equal(await pending,true);assert.equal(writes.length,2);});
test('valid backup and legacy sets accepted',()=>{const c=context();assert.doesNotThrow(()=>c.validateBackup({workouts:[workout],routines:[]}));assert.doesNotThrow(()=>c.validateBackup({workouts:[{...workout,exercises:[{name:'Row',sets:3,weight:50,reps:8}]}],routines:[]}));});
test('duplicate ids and invalid dates rejected',()=>{const c=context();assert.throws(()=>c.validateBackup({workouts:[workout,workout],routines:[]}));assert.throws(()=>c.validateBackup({workouts:[{...workout,date:'2026-02-30'}],routines:[]}));});
test('malformed sets rejected',()=>{const c=context();assert.throws(()=>c.validateBackup({workouts:[{...workout,exercises:[{name:'Row',sets:[{weight:-1,reps:8}]}]}],routines:[]}));});
