import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import mongoose from 'mongoose';
const {EJSON}=mongoose.mongo.BSON;
import {getClubEventAccess,normalizePortalRole,isSuperAdmin} from '../utils/authorization.js';

// Run with application writers stopped; the local Mongo snapshot has no transaction support.
export async function mergeIedcClub({db,clubId,backupFile,apply=false}) {
 const club=await db.collection('clubs').findOne({_id:clubId});
 if(!club)throw new Error('The selected club does not exist. It may already have been merged.');
 if(club.name?.trim().toLowerCase()!=='iedc')throw new Error('Only the duplicate IEDC club can be merged.');
 const [memberships,events,pages]=await Promise.all([
  db.collection('club_memberships').find({clubId}).toArray(),db.collection('events').find({club:clubId}).toArray(),db.collection('club_pages').find({clubId}).toArray(),
 ]);
 if(pages.length)throw new Error('The IEDC club has a Nexus page. Transfer that page before merging; nothing has changed.');
 const userIds=[...(club.managerUsers||[]),...(club.editorUsers||[]),...(club.memberUsers||[]),...memberships.map(m=>m.userId)];
 const users=await db.collection('users').find({_id:{$in:userIds}}).toArray();
 if(users.some(user=>!['super_admin','iedc_execom'].includes(normalizePortalRole(user.role))))throw new Error('Some linked users need explicit organisation role assignments before merging. Nothing has changed.');
 const grants=users.filter(user=>{
  const membership=memberships.find(m=>String(m.userId)===String(user._id));
  const access=getClubEventAccess({user:{...user,id:user._id},club,membership});
  return !isSuperAdmin(user)&&(access.edit||access.publish||access.delete);
 });
 const result={clubId:String(clubId),events:events.length,accounts:users.length,eventAccessAccounts:grants.length,memberships:memberships.length,registrations:(club.memberRegistrations||[]).length,applied:apply};
 if(!apply)return result;
 if(!backupFile)throw new Error('A private backup file is required.');
 const registrations=await db.collection('registrations').find({_id:{$in:club.memberRegistrations||[]}}).toArray();
 const snapshot=EJSON.serialize({club,memberships,users,events,pages,registrations},{relaxed:false});
 const checksum=createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
 await writeFile(backupFile,JSON.stringify({version:1,createdAt:new Date().toISOString(),database:db.databaseName,checksum,snapshot},null,2),{mode:0o600,flag:'wx'});
 const verified=JSON.parse(await readFile(backupFile,'utf8'));
 if(createHash('sha256').update(JSON.stringify(verified.snapshot)).digest('hex')!==checksum)throw new Error('Backup verification failed. Nothing has changed.');
 // The organisation has a single Events capability; retain event access without promoting account roles.
 if(grants.length)await db.collection('users').updateMany({_id:{$in:grants.map(user=>user._id)}},{$addToSet:{permissions:'events'}});
 await db.collection('events').updateMany({club:clubId},{$set:{scope:'iedc',category:'IEDC'},$unset:{club:''}});
 if(await db.collection('events').countDocuments({club:clubId}))throw new Error('Event transfer incomplete. Duplicate club retained; backup is available.');
 await db.collection('club_memberships').deleteMany({clubId});
 const deleted=await db.collection('clubs').deleteOne({_id:clubId,name:club.name});
 if(deleted.deletedCount!==1)throw new Error('Club changed during merge; inspect the backup before retrying.');
 await db.collection('workspace_migrations').insertOne({kind:'iedc-club-merge',clubId,completedAt:new Date(),backupFile,checksum,counts:result});
 return result;
}
