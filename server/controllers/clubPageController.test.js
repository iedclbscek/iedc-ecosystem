import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import {randomUUID} from 'node:crypto';
import Club from '../models/Club.js';
import ClubMembership from '../models/ClubMembership.js';
import ClubPage from '../models/ClubPage.js';
import {deleteClub} from './clubController.js';
import {bindClubPage, getClubPage, saveClubPageDraft, publishClubPage, unpublishClubPage, getPublicNexus, getPublicClubPage} from './clubPageController.js';
import {emptyClubPage} from '../../shared/clubPageSchema.js';
const call=async(fn,user,clubId,body={},slug)=>{const res={statusCode:200,status(n){this.statusCode=n;return this;},set(){return this;},json(data){this.body=data;return this;}};await fn({user,params:{clubId:String(clubId),slug},body},res);return res;};
test('club page isolated revision and publication round trip',{skip:!process.env.TEST_MONGO_URI},async()=>{
 await mongoose.connect(process.env.TEST_MONGO_URI,{dbName:'club_page_test_'+randomUUID().replaceAll('-','')});
 try{
  await ClubPage.init();
  const lead={id:new mongoose.Types.ObjectId(),role:'club_lead'};
  const editor={id:new mongoose.Types.ObjectId(),role:'club_member'};
  const publisher={id:new mongoose.Types.ObjectId(),role:'club_member'};
  const admin={id:new mongoose.Types.ObjectId(),role:'Admin'};
  const a=await Club.create({name:'Test A',managerUsers:[lead.id],memberUsers:[editor.id,publisher.id]});
  const b=await Club.create({name:'Test B'});
  await ClubMembership.create([{clubId:a._id,userId:editor.id,permissions:['club_page_edit']},{clubId:a._id,userId:publisher.id,permissions:['club_page_publish']}]);
  assert.equal((await call(bindClubPage,lead,a._id,{slug:'test-a'})).statusCode,403);
  let r=await call(bindClubPage,admin,a._id,{slug:'test-a',draft:emptyClubPage('Test A')});assert.equal(r.statusCode,200,JSON.stringify(r.body));
  assert.equal((await call(bindClubPage,admin,b._id,{slug:'test-a'})).statusCode,409);
  assert.equal((await call(getClubPage,editor,b._id)).statusCode,403);
  assert.equal((await call(getClubPage,editor,'bad-id')).statusCode,400);
  assert.equal((await call(unpublishClubPage,lead,a._id,{expectedRevision:0})).statusCode,409);
  const draft=emptyClubPage('New draft');
  const results=await Promise.all([call(saveClubPageDraft,editor,a._id,{expectedRevision:0,draft}),call(saveClubPageDraft,editor,a._id,{expectedRevision:0,draft})]);
  assert.deepEqual(results.map(v=>v.statusCode).sort(),[200,409]);
  assert.equal((await call(saveClubPageDraft,publisher,a._id,{expectedRevision:1,draft})).statusCode,403);
  assert.equal((await call(publishClubPage,publisher,a._id,{expectedRevision:1,draft})).statusCode,400);
  r=await call(publishClubPage,publisher,a._id,{expectedRevision:1});assert.equal(r.statusCode,200,JSON.stringify(r.body));
  r=await call(getPublicClubPage,null,null,{},'test-a');assert.equal(r.body.page.card.title,'New draft');assert.equal(r.body.draft,undefined);
  r=await call(getPublicNexus,null,null);assert.equal(r.body.pages.length,1);assert.equal(r.body.pages[0].draft,undefined);
  assert.equal((await call(unpublishClubPage,lead,a._id,{expectedRevision:2})).statusCode,200);
  assert.equal((await call(getPublicClubPage,null,null,{},'test-a')).statusCode,404);
  assert.deepEqual((await call(getPublicNexus,null,null)).body.withdrawn,['test-a']);
  await ClubMembership.updateOne({clubId:a._id,userId:editor.id},{$set:{status:'inactive'}});
  assert.equal((await call(getClubPage,editor,a._id)).statusCode,403);
  assert.equal((await call(publishClubPage,publisher,a._id,{expectedRevision:3})).statusCode,200);
  const orphan=await ClubPage.create({clubId:new mongoose.Types.ObjectId(),slug:'orphan',draft,published:draft,adopted:true});
  assert.equal((await call(getPublicClubPage,null,null,{},'orphan')).statusCode,404);
  assert.ok(!(await call(getPublicNexus,null,null)).body.pages.some(page=>page.slug==='orphan'));
  await ClubPage.deleteOne({_id:orphan._id});
  const deleted={statusCode:200,status(n){this.statusCode=n;return this;},json(body){this.body=body;return this;}};
  await deleteClub({user:admin,params:{id:String(a._id)}},deleted);
  assert.equal(deleted.statusCode,200);
  assert.equal((await call(getPublicClubPage,null,null,{},'test-a')).statusCode,404);
  assert.deepEqual((await call(getPublicNexus,null,null)).body.withdrawn,['test-a']);
 }finally{await mongoose.connection.dropDatabase();await mongoose.disconnect();}
});

test('superadmin can correct a binding without losing the old snapshot or publishing mixed content',{skip:!process.env.TEST_MONGO_URI},async()=>{
 await mongoose.connect(process.env.TEST_MONGO_URI,{dbName:'club_rebind_test_'+randomUUID().replaceAll('-','')});
 try{
  await ClubPage.init();
  const admin={id:new mongoose.Types.ObjectId(),role:'Admin'},lead={id:new mongoose.Types.ObjectId(),role:'club_lead'};
  const club=await Club.create({name:'GDG',managerUsers:[lead.id]});
  await call(bindClubPage,admin,club._id,{slug:'mulearn',draft:emptyClubPage('MuLearn')});
  await call(publishClubPage,admin,club._id,{expectedRevision:0});
  const body={slug:'gdg',expectedRevision:1,draft:emptyClubPage('GDG')};
  assert.equal((await call(bindClubPage,lead,club._id,body)).statusCode,403);
  assert.equal((await call(bindClubPage,admin,club._id,{...body,expectedRevision:0})).statusCode,409);
  const other=await Club.create({name:'Other'});
  await call(bindClubPage,admin,other._id,{slug:'taken'});
  assert.equal((await call(bindClubPage,admin,club._id,{...body,slug:'taken'})).statusCode,409);
  const response=await call(bindClubPage,admin,club._id,body);
  assert.equal(response.statusCode,200,JSON.stringify(response.body));
  assert.equal(response.body.page.slug,'gdg');assert.equal(response.body.page.revision,2);
  assert.equal(response.body.page.draft.card.title,'GDG');assert.equal(response.body.page.published,null);assert.equal(response.body.page.adopted,false);
  assert.equal((await call(getPublicClubPage,null,null,{},'mulearn')).body.legacy,true);
  const backups=await mongoose.connection.collection('club_page_binding_backups').find({clubId:club._id}).toArray();
  assert.equal(backups.length,1);assert.equal(backups[0].snapshot.slug,'mulearn');assert.equal(backups[0].snapshot.draft.card.title,'MuLearn');assert.equal(backups[0].snapshot.published.card.title,'MuLearn');
  assert.equal((await call(saveClubPageDraft,admin,club._id,{expectedRevision:1,draft:emptyClubPage('stale')})).statusCode,409);
  assert.equal((await call(publishClubPage,admin,club._id,{expectedRevision:2})).statusCode,200);
  assert.equal((await call(getPublicClubPage,null,null,{},'gdg')).body.page.card.title,'GDG');
  assert.equal((await call(bindClubPage,admin,club._id,{slug:'gdg',draft:emptyClubPage('Must not replace')})).body.page.draft.card.title,'GDG');
  const racing=await Promise.all([
   call(bindClubPage,admin,club._id,{slug:'gdg-next',expectedRevision:3,draft:emptyClubPage('Next')}),
   call(saveClubPageDraft,admin,club._id,{expectedRevision:3,draft:emptyClubPage('Concurrent edit')}),
  ]);
  assert.deepEqual(racing.map(result=>result.statusCode).sort(),[200,409]);
  const final=await ClubPage.findOne({clubId:club._id}).lean();
  assert.equal(final.revision,4);
  assert.ok((final.slug==='gdg-next'&&final.draft.card.title==='Next')||(final.slug==='gdg'&&final.draft.card.title==='Concurrent edit'));

 }finally{await mongoose.connection.dropDatabase();await mongoose.disconnect();}
});
