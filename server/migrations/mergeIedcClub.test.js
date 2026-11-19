import test from 'node:test';import assert from 'node:assert/strict';import mongoose from 'mongoose';import {randomUUID} from 'node:crypto';import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {mergeIedcClub} from './mergeIedcClub.js';
import {createClub} from '../controllers/clubController.js';
test('IEDC is reserved for the main organisation',async()=>{const res={statusCode:200,status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;}};await createClub({user:{role:'Admin'},body:{name:' iEdC '}},res);assert.equal(res.statusCode,409);});
test('merges the duplicate IEDC with backup, stable event IDs and preserved account roles',{skip:!process.env.TEST_MONGO_URI},async()=>{
 await mongoose.connect(process.env.TEST_MONGO_URI,{dbName:'merge_iedc_test_'+randomUUID().replaceAll('-','')});const db=mongoose.connection.db;const dir=await mkdtemp(join(tmpdir(),'merge-iedc-'));
 try{
  const clubId=new mongoose.Types.ObjectId(),userId=new mongoose.Types.ObjectId(),eventId=new mongoose.Types.ObjectId(),otherId=new mongoose.Types.ObjectId();
  await db.collection('clubs').insertMany([{_id:clubId,name:'IEDC',managerUsers:[userId]},{_id:otherId,name:'GDG'}]);await db.collection('users').insertOne({_id:userId,role:'Execom',permissions:['dashboard','users'],portalAccessEnabled:true});
  await db.collection('events').insertMany([{_id:eventId,club:clubId,scope:'club',title:'IEDC event',coordinatorUsers:[userId],status:'published'},{club:otherId,scope:'club',title:'Other event'}]);
  const backupFile=join(dir,'backup.json');
  const preview=await mergeIedcClub({db,clubId,backupFile,apply:false});assert.equal(preview.events,1);assert.ok(await db.collection('clubs').findOne({_id:clubId}));
  const occupied=join(dir,'existing-backup.json');await writeFile(occupied,'keep existing backup');
  await assert.rejects(mergeIedcClub({db,clubId,backupFile:occupied,apply:true}),/EEXIST/);
  assert.equal((await db.collection('events').findOne({_id:eventId})).scope,'club');
  assert.deepEqual((await db.collection('users').findOne({_id:userId})).permissions,['dashboard','users']);
  await mergeIedcClub({db,clubId,backupFile,apply:true});
  assert.equal(await db.collection('clubs').findOne({_id:clubId}),null);assert.ok(await db.collection('clubs').findOne({_id:otherId}));
  const event=await db.collection('events').findOne({_id:eventId});assert.equal(event.scope,'iedc');assert.equal(event.club,undefined);assert.equal(event.status,'published');assert.deepEqual(event.coordinatorUsers,[userId]);
  const user=await db.collection('users').findOne({_id:userId});assert.equal(user.role,'Execom');assert.deepEqual(user.permissions,['dashboard','users','events']);
  const backup=JSON.parse(await readFile(backupFile,'utf8'));assert.equal(backup.snapshot.events[0]._id.$oid,String(eventId));assert.equal(backup.snapshot.club.name,'IEDC');
  assert.equal((await db.collection('events').findOne({club:otherId})).scope,'club');
 }finally{await mongoose.connection.dropDatabase();await mongoose.disconnect();await rm(dir,{recursive:true});}
});
