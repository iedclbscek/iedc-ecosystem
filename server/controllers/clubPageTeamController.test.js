import test from 'node:test';import assert from 'node:assert/strict';import mongoose from 'mongoose';import {randomUUID} from 'node:crypto';
import User from '../models/User.js';import Club from '../models/Club.js';import ClubMembership from '../models/ClubMembership.js';import ClubPage from '../models/ClubPage.js';import WebsiteTeamEntry from '../models/WebsiteTeamEntry.js';
import {getPublicClubPageTeam,getClubPageTeam} from './clubPageTeamController.js';
import {emptyClubPage} from '../../shared/clubPageSchema.js';
const call=async(fn,params,user)=>{const r={statusCode:200,status(n){this.statusCode=n;return this;},set(){return this;},json(v){this.body=v;return this;}};await fn({params,user},r);return r;};
test('team defaults use opt-in public club users and omit private fields and inactive members',{skip:!process.env.TEST_MONGO_URI},async()=>{
 await mongoose.connect(process.env.TEST_MONGO_URI,{dbName:'club_team_test_'+randomUUID().replaceAll('-','')});
 try{
  const legacy=await Club.collection.insertOne({name:'Legacy club without arrays'});
  const legacyPreview=await call(getClubPageTeam,{clubId:String(legacy.insertedId)},{id:new mongoose.Types.ObjectId(),role:'Admin'});
  assert.equal(legacyPreview.statusCode,200);assert.deepEqual(legacyPreview.body.people,[]);
  const make=(name,visible)=>User.create({name,membershipId:name,email:name+'@private.test',password:'unused',role:'club_member',websiteProfile:{visible}});
  const [lead,member,privateUser,inactive]=await Promise.all([make('lead',true),make('member',false),make('private',false),make('inactive',true)]);
  const club=await Club.create({name:'Team club',managerUsers:[lead._id],memberUsers:[member._id,privateUser._id,inactive._id]});
  await ClubMembership.create({clubId:club._id,userId:inactive._id,status:'inactive'});
  await WebsiteTeamEntry.create({year:'2026',userRef:member._id,imageUrl:'https://example.test/member.jpg',visible:true,github:'https://github.com/member',linkedin:'https://linkedin.com/in/member'});
  const preview=await call(getClubPageTeam,{clubId:String(club._id)},{id:lead._id,role:'club_lead'});assert.equal(preview.statusCode,200);
  assert.deepEqual(preview.body.people.map(p=>p.name).sort(),['lead','member']);
  for(const person of preview.body.people)assert.deepEqual(Object.keys(person).sort(),['github','image','key','linkedin','name','role','url']);
  assert.equal(preview.body.people.find(p=>p.name==='member').github,'https://github.com/member');
  assert.equal((await call(getClubPageTeam,{clubId:String(club._id)},{id:privateUser._id,role:'club_member'})).statusCode,403);
  assert.equal((await call(getPublicClubPageTeam,{slug:'team-club'})).statusCode,404);
  await ClubPage.create({clubId:club._id,slug:'team-club',adopted:true,draft:emptyClubPage('Team'),published:emptyClubPage('Team')});
  const live=await call(getPublicClubPageTeam,{slug:'team-club'});assert.equal(live.statusCode,200);assert.deepEqual(live.body.people,preview.body.people);
  await ClubPage.updateOne({clubId:club._id},{$set:{published:null}});
  assert.equal((await call(getPublicClubPageTeam,{slug:'team-club'})).statusCode,404);
 }finally{await mongoose.connection.dropDatabase();await mongoose.disconnect();}
});
