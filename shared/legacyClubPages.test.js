import test from 'node:test';
import assert from 'node:assert/strict';
import { legacyPages, legacyCatalogue } from './legacyClubPages.js';
import { mergeNexusCatalogue } from './nexusCatalogue.js';
test('all thirteen legacy pages serialize with rich fields and gallery widgets',()=>{
 assert.equal(Object.keys(legacyPages).length,13);
 for(const page of Object.values(legacyPages)) assert.ok(JSON.stringify(page).length>100);
 assert.ok(legacyPages.mulearn.containers.some(c=>c.widgets.some(w=>w.type==='list'&&w.settings.title==='What We Provide')));
 assert.ok(legacyPages.yip.containers.some(c=>c.widgets.some(w=>w.type==='gallery')));
 assert.ok(legacyPages.wow.containers.some(c=>c.widgets.some(w=>w.type==='gallery')));
 assert.match(JSON.stringify(legacyPages.cyber),/Ethical Commitment/);
 assert.match(JSON.stringify(legacyPages.gdg),/Why Join/);
 assert.ok(legacyPages.wtm.card.summary);
});
test('published overrides deduplicate and withdrawal suppresses old static entries',()=>{
 const result=mergeNexusCatalogue(legacyCatalogue,{pages:[{slug:'gdg',card:{title:'New GDG',summary:'New',cover:''}}],withdrawn:['cyber'],order:['gdg']});
 assert.equal(result[0].id,'gdg');
 assert.equal(result[0].name,'New GDG');
 assert.equal(result.filter(c=>c.id==='gdg').length,1);
 assert.equal(result.some(c=>c.id==='cyber'),false);
});
test('minimal published cards have searchable string fields',()=>{
 const [entry]=mergeNexusCatalogue([],{pages:[{slug:'minimal',card:{title:'Incomplete'}}]});
 assert.equal(entry.name,'Incomplete');
 assert.equal(entry.description,'');
 assert.equal(entry.cover,'');
 const [untitled]=mergeNexusCatalogue([],{pages:[{slug:'new-club',card:{}}]});
 assert.equal(untitled.name,'new-club');
 assert.doesNotThrow(()=>entry.description.toLowerCase());
});
