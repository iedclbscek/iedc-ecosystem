import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import express from 'express';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import adminRoutes from '../routes/adminRoutes.js';
import publicRoutes from '../routes/publicRoutes.js';
import User from '../models/User.js';
import Club from '../models/Club.js';
import ClubMembership from '../models/ClubMembership.js';
import ClubPage from '../models/ClubPage.js';
import {emptyClubPage} from '../../shared/clubPageSchema.js';

// Deliberately requires a local Mongo endpoint and creates its own disposable database.
const uri=process.env.TEST_MONGO_URI;
assert.ok(/^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/.test(uri||''),'Set TEST_MONGO_URI to a local MongoDB endpoint.');
process.env.NODE_ENV='test';
process.env.JWT_SECRET=randomUUID();
const dbName='iedc_nexus_http_test_'+randomUUID().replaceAll('-','');
let server;
let assertions=0;
try {
 await mongoose.connect(uri,{dbName});
 await Promise.all([User.init(),Club.init(),ClubMembership.init(),ClubPage.init()]);
 const password=randomUUID();const hash=await bcrypt.hash(password,10);
 const makeUser=(role,label)=>User.create({name:label,membershipId:`nexus-${label}`,password:hash,role,portalAccessEnabled:true,websiteProfile:{visible:label==='lead'}});
 const [admin,lead,editor,publisher,ordinary]=await Promise.all([makeUser('super_admin','admin'),makeUser('club_lead','lead'),makeUser('club_member','editor'),makeUser('club_member','publisher'),makeUser('club_member','ordinary')]);
 const club=await Club.create({name:'Disposable Nexus HTTP Club',managerUsers:[lead._id],memberUsers:[editor._id,publisher._id,ordinary._id]});
 const other=await Club.create({name:'Other Disposable Nexus Club'});
 await ClubMembership.create([{clubId:club._id,userId:editor._id,permissions:['club_page_edit']},{clubId:club._id,userId:publisher._id,permissions:['club_page_publish']}]);
 const app=express();app.use(express.json({limit:'2mb'}));app.use(cookieParser());app.use('/api/admin',adminRoutes);app.use('/api/public',publicRoutes);
 server=await new Promise(resolve=>{const listening=app.listen(0,'127.0.0.1',()=>resolve(listening));});
 const origin=`http://127.0.0.1:${server.address().port}`;
 const request=async(method,path,body,cookie,status=200)=>{
  const response=await fetch(origin+path,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const data=await response.json();assert.equal(response.status,status,`${method} ${path}: ${JSON.stringify(data)}`);assertions++;
  return {data,cookie:response.headers.get('set-cookie')?.split(';')[0]};
 };
 const signIn=async(user)=> (await request('POST','/api/admin/auth/login',{membershipId:user.membershipId,password})).cookie;
 const [adminCookie,leadCookie,editorCookie,publisherCookie,ordinaryCookie]=await Promise.all([admin,lead,editor,publisher,ordinary].map(signIn));
 const adminContext=await request('GET','/api/admin/auth/me',undefined,adminCookie);
 assert.deepEqual(adminContext.data.workspaces.map(workspace=>String(workspace.id)).sort(),[String(club._id),String(other._id)].sort());assertions++;
 const memberContext=await request('GET','/api/admin/auth/me',undefined,editorCookie);
 assert.deepEqual(memberContext.data.workspaces.map(workspace=>String(workspace.id)),[String(club._id)]);assertions++;
 const base=`/api/admin/clubs/${club._id}`;const publicPath='/api/public/nexus/disposable-nexus-http';
 await request('GET',base+'/page',undefined,undefined,401);
 await request('GET',base+'/page',undefined,ordinaryCookie,403);
 await request('GET',`/api/admin/clubs/${other._id}/page`,undefined,editorCookie,403);
 await request('PATCH',base+'/public-binding',{slug:'disposable-nexus-http'},leadCookie,403);
 const teamPreview=await request('GET',base+'/page/team',undefined,leadCookie);assert.equal(teamPreview.data.people.length,1);assertions++;
 await request('GET',base+'/page/team',undefined,ordinaryCookie,403);
 await request('GET',publicPath+'/team',undefined,undefined,404);
 await request('PATCH',base+'/public-binding',{slug:'disposable-nexus-http',draft:emptyClubPage('Initial draft')},adminCookie);
 const neverPublished=await request('GET',publicPath,undefined,undefined,404);assert.equal(neverPublished.data.legacy,true);assertions++;
 const draft=emptyClubPage('Published HTTP title');draft.containers=[{id:'content',title:'Content',columns:1,hidden:false,widgets:[{id:'custom',type:'custom',settings:{title:'Sandbox demo',html:'<p>HTTP fixture</p>',css:'p{color:coral}',javascript:'',height:200}}]}];
 await request('PUT',base+'/page/draft',{expectedRevision:0,draft},publisherCookie,403);
 const concurrent=await Promise.all([0,1].map(async()=>{
  const response=await fetch(origin+base+'/page/draft',{method:'PUT',headers:{'Content-Type':'application/json',Cookie:editorCookie},body:JSON.stringify({expectedRevision:0,draft})});return response.status;
 }));assert.deepEqual(concurrent.sort(),[200,409]);assertions++;
 await request('POST',base+'/page/publish',{expectedRevision:1,draft},publisherCookie,400);
 await request('POST',base+'/page/publish',{expectedRevision:1},editorCookie,403);
 await request('POST',base+'/page/publish',{expectedRevision:1},publisherCookie);
 const publicTeam=await request('GET',publicPath+'/team');assert.deepEqual(publicTeam.data.people,teamPreview.data.people);assertions++;
 const visible=await request('GET',publicPath);assert.equal(visible.data.page.card.title,'Published HTTP title');assert.ok(!('draft' in visible.data));assertions+=2;
 const catalogue=await request('GET','/api/public/nexus');assert.equal(catalogue.data.pages[0].slug,'disposable-nexus-http');assert.ok(!('savedBy' in catalogue.data.pages[0]));assertions+=2;
 await request('POST','/api/admin/uploads/cloudinary',{purpose:'club_page',clubId:club._id,source:'unused'},ordinaryCookie,403);
 await request('POST','/api/admin/uploads/cloudinary',{purpose:'club_page',clubId:other._id,source:'unused'},editorCookie,403);
 // Revoke through the same HTTP delegation route used by the portal.
 await request('PATCH',base+`/portal-members/${editor._id}`,{pagePermissions:[]},leadCookie);
 await request('PUT',base+'/page/draft',{expectedRevision:2,draft},editorCookie,403);
 await request('POST',base+'/page/unpublish',{expectedRevision:2},leadCookie);
 const withdrawn=await request('GET',publicPath,undefined,undefined,404);assert.equal(withdrawn.data.withdrawn,true);assertions++;
 const hidden=await request('GET','/api/public/nexus');assert.deepEqual(hidden.data.withdrawn,['disposable-nexus-http']);assert.equal(hidden.data.pages.length,0);assertions+=2;
 await request('POST',base+'/page/publish',{expectedRevision:3},publisherCookie);
 await request('GET',publicPath);
 console.log(JSON.stringify({result:'PASS',transport:'HTTP with real login cookies',assertions,database:dbName,media:'authorization negatives only; no external upload'}));
} finally {
 if(server) await new Promise(resolve=>server.close(resolve));
 if(mongoose.connection.readyState===1){
  await mongoose.connection.dropDatabase();
  const remaining=await mongoose.connection.db.admin().listDatabases({nameOnly:true});
  assert.equal(remaining.databases.filter(database=>database.name===dbName).length,0);
  console.log(JSON.stringify({cleanup:'verified',remainingDisposableDatabases:0}));
  await mongoose.disconnect();
 }
}
