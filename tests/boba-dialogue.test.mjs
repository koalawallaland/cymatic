import test from 'node:test';
import assert from 'node:assert/strict';
import {respond} from '../furby-hub/boba-dialogue.mjs';
const pickFirst=()=>0;
test('Boba replies to daycare play and conversation',()=>{
 for(const [p,k] of [['hi boba','hello'],['play fetch','fetch'],['high five','paw'],['pet boba','pet'],['tell me a story','story'],['i am sad','sad'],['are you real','name'],['zzzzzzz','unknown']]) assert.equal(respond(p,'',pickFirst).key,k,p);
 assert.equal(respond('again','fetch',pickFirst).key,'fetch');
 assert.equal(respond('  '),null);
});
test('Boba directs serious situations to trusted adults and discourages sharing private info',()=>{
 assert.match(respond('I want to die','',pickFirst).text,/trusted grown-up/);
 assert.equal(respond('my phone number is 123','',pickFirst).key,'private');
});
