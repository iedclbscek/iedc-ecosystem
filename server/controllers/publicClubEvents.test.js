import test from 'node:test';
import assert from 'node:assert/strict';
import Event from '../models/Event.js';
import {listPublicEvents} from './eventController.js';
test('public events reject malformed club IDs and constrain valid queries to that club',async()=>{
 const original=Event.aggregate; let pipeline;Event.aggregate=async p=>{pipeline=p;return [];};
 const res=()=>({statusCode:200,status(n){this.statusCode=n;return this;},set(){return this;},json(data){this.body=data;return this;}});
 try{
  const bad=res();await listPublicEvents({query:{clubId:'bad'}},bad);assert.equal(bad.statusCode,400);
  const good=res();await listPublicEvents({query:{clubId:'69dcd2a57e6d74eec8f4cd7a'}},good);assert.equal(good.statusCode,200);
  assert.equal(String(pipeline[0].$match.$and.find(v=>v.club)?.club),'69dcd2a57e6d74eec8f4cd7a');
 }finally{Event.aggregate=original;}
});
