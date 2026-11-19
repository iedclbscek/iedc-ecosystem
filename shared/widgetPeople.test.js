import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveWidgetPeople } from './widgetPeople.js';
test('club people use live team while custom and legacy keep saved people',()=>{
 const team=[{name:'Live lead',role:'Lead'}];const saved=[{name:'Saved person',role:'Member'}];
 assert.equal(resolveWidgetPeople({source:'club',people:saved},team),team);
 assert.equal(resolveWidgetPeople({source:'custom',people:saved},team),saved);
 assert.equal(resolveWidgetPeople({people:saved},team),saved);
 assert.deepEqual(resolveWidgetPeople({},team),[]);
});
test('live team preserves loading and error states without falling back to stale saved people',()=>{
 assert.equal(resolveWidgetPeople({source:'club',people:[{name:'Old'}]},undefined),undefined);
 assert.equal(resolveWidgetPeople({source:'club'},null),null);
 assert.deepEqual(resolveWidgetPeople({source:'club'},[]),[]);
});
test('club social overrides follow stable member keys without freezing the team or leaking between members',()=>{
 const team=[{key:'a',name:'Same name',github:'https://github.com/original'},{key:'b',name:'Same name',github:'https://github.com/b'}];
 const settings={source:'club',socialOverrides:[{memberKey:'a',github:'',linkedin:'https://linkedin.com/in/new',name:'Injected'}]};
 const resolved=resolveWidgetPeople(settings,team);
 assert.equal(resolved[0].github,'');assert.equal(resolved[0].linkedin,'https://linkedin.com/in/new');assert.equal(resolved[0].name,'Same name');assert.equal(resolved[1].github,'https://github.com/b');assert.equal(team[0].github,'https://github.com/original');
 assert.deepEqual(resolveWidgetPeople(settings,[]),[]);
});
