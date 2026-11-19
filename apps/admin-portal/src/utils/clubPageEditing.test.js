import test from 'node:test';
import assert from 'node:assert/strict';
import { moveContainer, moveWidget, createWidget } from './clubPageEditing.js';
const page = { containers: [{ id:'a', widgets:[{id:'x'},{id:'y'}] }, {id:'b',widgets:[]}] };
test('container movement preserves IDs and source draft',()=>{const moved=moveContainer(page,'a',1);assert.equal(moved.containers[1].id,'a');assert.equal(page.containers[0].id,'a');});
test('widgets move across containers and keep settings',()=>{const moved=moveWidget(page,'x','b',0);assert.deepEqual(moved.containers[0].widgets,[{id:'y'}]);assert.deepEqual(moved.containers[1].widgets,[{id:'x'}]);assert.equal(page.containers[0].widgets.length,2);});
test('invalid moves retain draft and widget defaults are independent',()=>{assert.deepEqual(moveWidget(page,'missing','b',0),page);const a=createWidget('gallery'),b=createWidget('gallery');a.settings.images.push({src:'x'});assert.equal(b.settings.images.length,0);assert.notEqual(a.id,b.id);});
