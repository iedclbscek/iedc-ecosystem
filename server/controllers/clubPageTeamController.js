import {createHash} from 'node:crypto';
import mongoose from 'mongoose';
import Club from '../models/Club.js';
import User from '../models/User.js';
import ClubMembership from '../models/ClubMembership.js';
import ClubPage from '../models/ClubPage.js';
import WebsiteTeamEntry from '../models/WebsiteTeamEntry.js';
import {resolveClubAccess} from '../utils/clubAccess.js';
import {setPublicNoStore} from '../utils/httpCache.js';

async function publicPeople(club) {
 const ids=[...new Set([...(club.managerUsers||[]),...(club.editorUsers||[]),...(club.memberUsers||[])].map(String))];
 const [entries,inactive]=await Promise.all([
  WebsiteTeamEntry.find({userRef:{$in:ids},visible:true}).select('userRef imageUrl linkedin github').sort({year:-1,order:1,createdAt:1}).lean(),
  ClubMembership.find({clubId:club._id,status:'inactive'}).select('userId').lean(),
 ]);
 const revoked=new Set(inactive.map(m=>String(m.userId)));
 const entryByUser=new Map();for(const entry of entries)if(!entryByUser.has(String(entry.userRef)))entryByUser.set(String(entry.userRef),entry);
 const users=await User.find({_id:{$in:ids.filter(id=>!revoked.has(id))},$or:[{'websiteProfile.visible':true},{_id:{$in:[...entryByUser.keys()]}}]}).select('name websiteProfile').sort({'websiteProfile.order':1,createdAt:1,_id:1}).lean();
 const leads=new Set((club.managerUsers||[]).map(String));
 return users.filter(user=>user.name).map(user=>{const entry=entryByUser.get(String(user._id));return {
  key:createHash('sha256').update(`${club._id}:${user._id}`).digest('hex').slice(0,32),name:user.name,role:leads.has(String(user._id))?'Club lead':user.websiteProfile?.roleTitle||'Member',image:entry?.imageUrl||'',url:entry?`/team/${entry._id}`:'',linkedin:entry?.linkedin||'',github:entry?.github||'',
 };});
}
export async function getClubPageTeam(req,res) {
 try{
  if(!mongoose.isValidObjectId(req.params.clubId))return res.status(400).json({message:'Choose a valid club.'});
  const club=await Club.findById(req.params.clubId).lean();if(!club)return res.status(404).json({message:'Club not found.'});
  const access=await resolveClubAccess({club,user:req.user});
  if(!access.pageEdit&&!access.pagePublish)return res.status(403).json({message:'You do not have permission to preview this club page.'});
  return res.json({people:await publicPeople(club)});
 }catch{return res.status(500).json({message:'Could not load the club team. Please try again.'});}
}
export async function getPublicClubPageTeam(req,res) {
 try{
  const page=await ClubPage.findOne({slug:req.params.slug,adopted:true,published:{$ne:null}}).select('clubId').lean();
  const club=page&&await Club.findById(page.clubId).lean();
  if(!club)return res.status(404).json({message:'This club page is not published.'});
  setPublicNoStore(res);return res.json({people:await publicPeople(club)});
 }catch{return res.status(500).json({message:'Could not load the club team. Please try again.'});}
}

/**
 * @openapi
 * /api/admin/clubs/{clubId}/page/team:
 *   get:
 *     tags: [Club Nexus]
 *     summary: Preview the club's publicly opted-in team members
 *     description: Requires live page-edit or page-publish access. Does not expose account IDs, email addresses, membership IDs or private members.
 *     security: [{ cookieAuth: [] }, { bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: clubId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: 'Object with people array containing name, role, image and public profile URL.' }
 *       400: { description: Invalid club ID. }
 *       401: { description: Sign in required. }
 *       403: { description: Club page access required. }
 *       404: { description: Club not found. }
 * /api/public/nexus/{slug}/team:
 *   get:
 *     tags: [Club Nexus]
 *     summary: Get the published club page's publicly opted-in team members
 *     description: Only active club members with website visibility enabled or a visible linked team profile are included. The club and its published page must exist.
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: 'Object with people array containing name, role, image and public profile URL.' }
 *       404: { description: Club page not published. }
 */
