import {test} from 'node:test';
import assert from 'node:assert/strict';
import {deform} from '../furby-hub/boba-realistic.mjs';
test('all poses keep finite vertices and preserve original artwork at rest',()=>{
 for(const p of ['front','side']) for(const a of ['idle','wag','cuddle','paw','fetch','treat','walk','sit','rest','talk','quiet']) for(let y=0;y<=1;y+=.1) for(let x=0;x<=1;x+=.1){
  assert.ok(deform(x,y,p,a,.7,1).every(v=>Number.isFinite(v)&&v>-.2&&v<1.2));
  assert.deepEqual(deform(x,y,p,a,0,0),[x,y]);
 }
});
test('paw moves upward and tail wags',()=>{
 assert.ok(deform(.27,.98,'front','paw',1,1)[1]<.9);
 assert.notDeepEqual(deform(.92,.2,'side','wag',1,1),[.92,.2]);
});
