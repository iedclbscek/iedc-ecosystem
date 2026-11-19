import test from 'node:test';
import assert from 'node:assert/strict';
import { getClubEventAccess, mergeClubPermissions } from './authorization.js';
const club = {managerUsers:['lead'],memberUsers:['member'],editorUsers:['editor']};
test('page capabilities are independently delegated to active members',()=>{
 assert.equal(getClubEventAccess({user:{id:'lead'},club}).pageEdit,true);
 assert.equal(getClubEventAccess({user:{id:'member'},club,membership:{status:'active',permissions:['club_page_edit']}}).pageEdit,true);
 assert.equal(getClubEventAccess({user:{id:'member'},club,membership:{status:'active',permissions:['club_page_publish']}}).pageEdit,false);
 assert.equal(getClubEventAccess({user:{id:'member'},club,membership:{status:'active',permissions:['club_page_publish']}}).pagePublish,true);
 for(const input of [{user:{id:'editor'},club},{user:{id:'outsider',role:'execom',permissions:['events']},club},{user:{id:'member'},club,membership:{status:'inactive',permissions:['club_page_edit']}}]) assert.equal(getClubEventAccess(input).pageEdit,false);
});
test('separate grant updates preserve unrelated namespaces',()=>{
 assert.deepEqual(mergeClubPermissions(['club_page_publish','club_events_edit'],{permissions:[]}),['club_page_publish']);
 assert.deepEqual(mergeClubPermissions(['club_page_publish','club_events_edit'],{pagePermissions:['club_page_edit']}),['club_events_edit','club_page_edit']);
 assert.throws(()=>mergeClubPermissions([],{pagePermissions:'all'}));
});
