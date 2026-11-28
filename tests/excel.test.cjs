const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const path='vendor/xlsx-0.20.3.full.min.js';
test('Excel dependency is pinned, local and precached',()=>{
 const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('service-worker.js','utf8');
 assert.ok(html.includes('src="'+path+'"'));
 assert.ok(!html.includes('cdn.sheetjs.com'));
 assert.ok(sw.includes("'./"+path+"'"));
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex'),fs.readFileSync('vendor/SHEETJS.sha256','utf8').trim().split(/\s+/)[0]);
 assert.ok(fs.statSync('vendor/SHEETJS-LICENSE.txt').size>0);
});
test('bundled Excel library reads workbook without network',()=>{
 const x=require('../'+path);assert.equal(x.version,'0.20.3');
 const w=x.utils.book_new();x.utils.book_append_sheet(w,x.utils.aoa_to_sheet([['Exercise','Weight','Reps'],['Row',100,10]]),'Workout');
 const b=x.write(w,{type:'buffer',bookType:'xlsx'});
 assert.deepEqual(x.utils.sheet_to_json(x.read(b,{type:'buffer'}).Sheets.Workout),[{Exercise:'Row',Weight:100,Reps:10}]);
});
