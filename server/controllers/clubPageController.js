import mongoose from 'mongoose';
import Club from '../models/Club.js';
import ClubPage, {NexusOrder, ClubPageBindingBackup} from '../models/ClubPage.js';
import {resolveClubAccess} from '../utils/clubAccess.js';
import {isSuperAdmin} from '../utils/authorization.js';
import {validateClubPage} from '../utils/clubPageValidation.js';
import {emptyClubPage} from '../../shared/clubPageSchema.js';
import {setPublicRevalidation} from '../utils/httpCache.js';
const issue=(status,message)=>{const error=new Error(message);error.status=status;throw error;};
const respond=(res,error)=>res.status(error.code===11000?409:error.status||500).json({message:error.code===11000?'This public URL is already assigned to a club.':error.status?error.message:'Could not update the Nexus page. Please try again.',...(error.field?{field:error.field}:{})});
const scoped=async(req,capability)=>{
 if(!req.user?.id)issue(401,'Sign in to access club pages.');
 if(!mongoose.isValidObjectId(req.params.clubId))issue(400,'Choose a valid club.');
 const club=await Club.findById(req.params.clubId).lean();if(!club)issue(404,'Club not found.');
 const access=await resolveClubAccess({club,user:req.user});
 if(capability? !access[capability] : !(access.pageEdit||access.pagePublish))issue(403,'You do not have permission to manage this club page.');
 return {club,access};
};
const revision=(body,allowed)=>{
 if(!body||Object.keys(body).some(key=>!allowed.includes(key)))issue(400,'Send only the supported fields. Publish uses the saved draft.');
 if(!Number.isSafeInteger(body.expectedRevision)||body.expectedRevision<0)issue(400,'A valid saved revision is required. Reload the page and try again.');
 return body.expectedRevision;
};
const missingUpdate=async(clubId)=>{if(!await ClubPage.exists({clubId}))issue(404,'Ask an administrator to connect this club to its public URL.');issue(409,'Someone else changed this page. Your edits are still here; reload the saved version before trying again.');};
export const getClubPage=async(req,res)=>{try{const {access}=await scoped(req);const page=await ClubPage.findOne({clubId:req.params.clubId}).lean();res.json({page,access});}catch(error){respond(res,error);}};
export const bindClubPage=async(req,res)=>{try{
 if(!isSuperAdmin(req.user))issue(403,'Only an administrator can assign public URLs.');
 await scoped(req,'pageEdit');
 const slug=req.body?.slug;if(typeof slug!=='string'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length>80)issue(400,'Use a lowercase public URL with letters, numbers and hyphens.');
 const current=await ClubPage.findOne({clubId:req.params.clubId});
 if(current?.slug===slug)return res.json({page:current});
 const club=await Club.findById(req.params.clubId).lean();
 const draft=validateClubPage(req.body.draft||emptyClubPage(club.name));
 if(current){
  const expectedRevision=revision(req.body,['slug','draft','expectedRevision']);
  if(current.revision!==expectedRevision)await missingUpdate(club._id);
  if(await ClubPage.exists({slug}))issue(409,'This public URL is already assigned to a club.');
  // Keep a recoverable copy before replacing a mistaken connection or its content.
  await ClubPageBindingBackup.create({clubId:club._id,fromSlug:current.slug,toSlug:slug,changedBy:String(req.user.id),snapshot:current.toObject()});
  const page=await ClubPage.findOneAndUpdate({_id:current._id,clubId:club._id,slug:current.slug,revision:expectedRevision},{$set:{slug,draft,published:null,adopted:false,savedBy:String(req.user.id)},$unset:{publishedBy:1,publishedAt:1},$inc:{revision:1}},{new:true});
  if(!page)await missingUpdate(club._id);
  return res.json({page});
 }
 const page=await ClubPage.create({clubId:club._id,slug,draft,savedBy:String(req.user.id)});res.json({page});
}catch(error){respond(res,error);}};
export const saveClubPageDraft=async(req,res)=>{try{
 await scoped(req,'pageEdit');const expectedRevision=revision(req.body,['expectedRevision','draft']);const draft=validateClubPage(req.body.draft);
 const page=await ClubPage.findOneAndUpdate({clubId:req.params.clubId,revision:expectedRevision},{$set:{draft,savedBy:String(req.user.id)},$inc:{revision:1}},{new:true});
 if(!page)await missingUpdate(req.params.clubId);res.json({page});
}catch(error){respond(res,error);}};
const publication=(withdraw)=>async(req,res)=>{try{
 await scoped(req,'pagePublish');const expectedRevision=revision(req.body,['expectedRevision']);
 // Copy the stored draft in the same atomic write that checks its revision.
 const page=await ClubPage.findOneAndUpdate({clubId:new mongoose.Types.ObjectId(req.params.clubId),revision:expectedRevision,...(withdraw?{published:{$ne:null}}:{})},[{$set:{published:withdraw?null:'$draft',adopted:true,publishedBy:String(req.user.id),publishedAt:new Date(),revision:{$add:['$revision',1]},updatedAt:new Date()}}],{new:true});
 if(!page)await missingUpdate(req.params.clubId);res.json({page});
}catch(error){respond(res,error);}};
export const publishClubPage=publication(false);
export const unpublishClubPage=publication(true);
export const getNexusOrder=async(req,res)=>{try{if(!isSuperAdmin(req.user))issue(403,'Only an administrator can arrange the Nexus directory.');const row=await NexusOrder.findById('directory').lean();res.json({order:row?.slugs||[]});}catch(error){respond(res,error);}};
export const putNexusOrder=async(req,res)=>{try{
 if(!isSuperAdmin(req.user))issue(403,'Only an administrator can arrange the Nexus directory.');
 const order=req.body?.order;if(!Array.isArray(order)||order.length>500||new Set(order).size!==order.length||order.some(slug=>typeof slug!=='string'||!(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).test(slug)||slug.length>80))issue(400,'Provide a unique list of valid public URLs.');
 await NexusOrder.findByIdAndUpdate('directory',{$set:{slugs:order}},{upsert:true});res.json({order});
}catch(error){respond(res,error);}};
export const getPublicNexus=async(req,res)=>{try{
 const [rows,ordering]=await Promise.all([ClubPage.aggregate([{$match:{adopted:true}},{$lookup:{from:'clubs',localField:'clubId',foreignField:'_id',pipeline:[{$project:{_id:1}}],as:'_owner'}},{$project:{slug:1,'published.card':1,hasOwner:{$gt:[{$size:'$_owner'},0]}}}]),NexusOrder.findById('directory').lean()]);
 const order=ordering?.slugs||[];const pages=rows.filter(row=>row.published&&row.hasOwner).map(row=>({slug:row.slug,card:row.published.card,order:order.indexOf(row.slug)}));
 setPublicRevalidation(res);res.json({pages,withdrawn:rows.filter(row=>!row.published||!row.hasOwner).map(row=>row.slug),order});
}catch(error){respond(res,error);}};
export const getPublicClubPage=async(req,res)=>{try{
 const page=await ClubPage.findOne({slug:req.params.slug}).select('slug published clubId adopted').lean();
 setPublicRevalidation(res);
 if(!page?.adopted)return res.status(404).json({message:'No published club page.',legacy:true});
 if(!page.published||!await Club.exists({_id:page.clubId}))return res.status(404).json({message:'This club page is currently unpublished.',withdrawn:true});
 res.json({slug:page.slug,page:page.published,clubId:page.clubId});
}catch(error){respond(res,error);}};
