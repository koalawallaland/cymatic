import test from 'node:test';
import assert from 'node:assert/strict';
import {readGameState,saveGameState,clearGameState} from '../kwl-assets/chess-state.mjs';
import {Group,Mesh,BoxGeometry,MeshBasicMaterial,Vector3} from '../squish/vendor/three.module.js';
import {waxBounds} from '../squish/bounds.mjs';
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};};
test('White and Black retain their roles when another tab saves or resets',()=>{
  const device=storage(),white=storage(),black=storage(),key='game';
  saveGameState(key,{id:'qatest123',me:'w',moves:['e4']},white,device);
  saveGameState(key,{id:'qatest123',me:'b',moves:['e4','e5']},black,device);
  assert.equal(readGameState(key,white,device).me,'w');
  saveGameState(key,{id:'qatest123',me:'w',moves:['e4','e5','Nf3']},white,device);
  assert.equal(readGameState(key,black,device).me,'b');
  clearGameState(key,black,device);assert.equal(readGameState(key,white,device).me,'w');
});
test('saved games recover from unavailable or malformed storage',()=>{
  const device=storage(),tab=storage(),bad={getItem(){throw Error('disabled');},setItem(){throw Error('disabled');}};
  saveGameState('game',{id:'qatest123',me:'b',moves:[]},bad,device);
  tab.setItem('game','broken json');assert.equal(readGameState('game',tab,device).me,'b');
  assert.equal(readGameState('game',bad,device).me,'b');
});
test('wax stays centered when dipping during an active squeeze',()=>{
  const pivot=new Group(),model=new Group(),mesh=new Mesh(new BoxGeometry(2,1,1),new MeshBasicMaterial());
  model.add(mesh);model.position.y=-.89;pivot.add(model);pivot.rotation.y=Math.PI;
  const rest=waxBounds(pivot,model);
  pivot.scale.set(1.3,.4,1.3);pivot.position.y=-.8;pivot.updateWorldMatrix(true,true);
  const interrupted=waxBounds(pivot,model);
  assert.ok(rest.getCenter(new Vector3()).distanceTo(interrupted.getCenter(new Vector3()))<1e-8);
  assert.ok(rest.getSize(new Vector3()).distanceTo(interrupted.getSize(new Vector3()))<1e-8);
  mesh.geometry.dispose();mesh.material.dispose();
});
