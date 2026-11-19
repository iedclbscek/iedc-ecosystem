import mongoose from 'mongoose';
import {resolve} from 'node:path';
import {mergeIedcClub} from '../migrations/mergeIedcClub.js';
const args=process.argv.slice(2);
const value=flag=>{const index=args.indexOf(flag);return index<0?undefined:args[index+1];};
try{
 if(!process.env.MONGO_URI)throw new Error('Set MONGO_URI for the intended database. The default run only inspects the merge.');
 const apply=args.includes('--apply');const selected=value('--club-id');const backup=value('--backup-file');
 if(selected&&!mongoose.isValidObjectId(selected))throw new Error('Provide a valid --club-id.');
 if(apply&&!backup)throw new Error('--apply requires a private --backup-file outside the repository. Use --transaction for production, or stop application writers on standalone Mongo.');
 if(backup&&resolve(backup).startsWith(resolve(new URL('../..',import.meta.url).pathname)+'/'))throw new Error('Store the private backup outside the repository.');
 await mongoose.connect(process.env.MONGO_URI);
 const db=mongoose.connection.db;
 const candidates=await db.collection('clubs').find(selected?{_id:new mongoose.Types.ObjectId(selected)}:{name:/^iedc$/i}).toArray();
 if(!candidates.length)console.log(JSON.stringify({database:db.databaseName,status:'already-merged-or-not-present',applied:false}));
 else{
  if(candidates.length!==1)throw new Error('More than one IEDC record exists. Select the intended --club-id.');
  const session = args.includes('--transaction') ? await mongoose.startSession() : undefined;
  try {
   if(session) session.startTransaction({readConcern:{level:'snapshot'},writeConcern:{w:'majority'}});
   const result = await mergeIedcClub({db,clubId:candidates[0]._id,backupFile:backup&&resolve(backup),apply,session});
   if(session) await session.commitTransaction();
   console.log(JSON.stringify({database:db.databaseName,...result,transactional:!!session}));
  } catch(error) {
   if(session?.inTransaction()) await session.abortTransaction();
   throw error;
  } finally { await session?.endSession(); }
 }
}catch(error){console.error(error.message);process.exitCode=1;}finally{await mongoose.disconnect();}
