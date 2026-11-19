import test from 'node:test';
import assert from 'node:assert/strict';
import Event from '../models/Event.js';
import {listPublicEvents,getPublicEventById} from './eventController.js';
test('public events reject malformed club IDs and constrain valid queries to that club',async()=>{
 const original=Event.aggregate; let pipeline;Event.aggregate=async p=>{pipeline=p;return [];};
 const res=()=>({statusCode:200,status(n){this.statusCode=n;return this;},set(){return this;},json(data){this.body=data;return this;}});
 try{
  const bad=res();await listPublicEvents({query:{clubId:'bad'}},bad);assert.equal(bad.statusCode,400);
  const good=res();await listPublicEvents({query:{clubId:'69dcd2a57e6d74eec8f4cd7a'}},good);assert.equal(good.statusCode,200);
  assert.equal(String(pipeline[0].$match.$and.find(v=>v.club)?.club),'69dcd2a57e6d74eec8f4cd7a');
 }finally{Event.aggregate=original;}
});

const response=()=>({statusCode:200,status(n){this.statusCode=n;return this;},set(){return this;},json(data){this.body=data;return this;}});
test('public event detail rejects malformed IDs without querying the database',async t=>{
 let queries=0;t.mock.method(Event,'findById',()=>{queries++;throw new Error('Unexpected query');});
 for(const id of ['not-a-real-event','abcdefghijkl','', '123', 'z'.repeat(24)]){
  const res=response();await getPublicEventById({params:{id}},res);
  assert.equal(res.statusCode,404,id);assert.deepEqual(res.body,{success:false,message:'Event not found'});
 }
 assert.equal(queries,0);
});
test('public event detail keeps valid missing IDs at 404 and returns public records',async t=>{
 const id='69dcd2a57e6d74eec8f4cd7a';let result=null;let requestedId;
 t.mock.method(Event,'findById',value=>{requestedId=value;return {where(){return this;},populate(){return this;},async lean(){return result;}};});
 const missing=response();await getPublicEventById({params:{id}},missing);
 assert.equal(requestedId,id);assert.equal(missing.statusCode,404);assert.equal(missing.body.success,false);
 result={_id:id,title:'Public event',coordinators:[{name:'Coordinator',email:'private@example.test'}]};
 const found=response();await getPublicEventById({params:{id}},found);
 assert.equal(found.statusCode,200);assert.equal(found.body.event.title,'Public event');assert.deepEqual(found.body.event.coordinators,[{name:'Coordinator'}]);
});
test('public event detail retains generic 500 responses for database failures',async t=>{
 t.mock.method(Event,'findById',()=>{throw new Error('Private database detail');});
 const res=response();await getPublicEventById({params:{id:'69dcd2a57e6d74eec8f4cd7a'}},res);
 assert.equal(res.statusCode,500);assert.deepEqual(res.body,{success:false,message:'Failed to fetch event'});
});
