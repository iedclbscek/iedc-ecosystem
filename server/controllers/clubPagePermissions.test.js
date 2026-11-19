import test from 'node:test';import assert from 'node:assert/strict';import mongoose from 'mongoose';import {randomUUID} from 'node:crypto';
import Club from '../models/Club.js';import User from '../models/User.js';import ClubMembership from '../models/ClubMembership.js';import {updateClubPortalMember} from './teamController.js';
test('page and event grant requests preserve each other including concurrent clients',{skip:!process.env.TEST_MONGO_URI},async()=>{
 await mongoose.connect(process.env.TEST_MONGO_URI,{dbName:'club_grants_test_'+randomUUID().replaceAll('-','')});
 try{
  const actor={id:new mongoose.Types.ObjectId(),role:'club_lead'};
  const user=await User.create({membershipId:'grant-test',role:'club_member',password:'unused',portalAccessEnabled:false});
  const club=await Club.create({name:'Grant test',managerUsers:[actor.id],memberUsers:[user._id]});
  await ClubMembership.create({clubId:club._id,userId:user._id,permissions:['club_page_publish','club_events_edit']});
  const call=async body=>{const r={statusCode:200,status(n){this.statusCode=n;return this;},json(data){this.body=data;return this;}};await updateClubPortalMember({user:actor,params:{clubId:String(club._id),userId:String(user._id)},body},r);return r;};
  assert.equal((await call({pagePermissions:'all'})).statusCode,400);
  assert.equal((await call({permissions:[]})).statusCode,200);
  assert.deepEqual((await ClubMembership.findOne({clubId:club._id,userId:user._id})).permissions,['club_page_publish']);
  const both=await Promise.all([call({permissions:['club_events_edit']}),call({pagePermissions:['club_page_edit']})]);assert.ok(both.every(v=>v.statusCode===200));
  assert.deepEqual((await ClubMembership.findOne({clubId:club._id,userId:user._id})).permissions.toSorted(),['club_events_edit','club_page_edit']);
  await ClubMembership.deleteOne({clubId:club._id,userId:user._id});
  assert.equal((await call({pagePermissions:['club_page_edit']})).statusCode,200);
  assert.equal((await ClubMembership.findOne({clubId:club._id,userId:user._id}).lean()).status,'active');
 }finally{await mongoose.connection.dropDatabase();await mongoose.disconnect();}
});
