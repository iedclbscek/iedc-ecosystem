import mongoose from 'mongoose';
const schema = new mongoose.Schema({
 clubId:{type:mongoose.Schema.Types.ObjectId,ref:'Club',required:true,unique:true},
 slug:{type:String,required:true,unique:true},
 schemaVersion:{type:Number,default:1},revision:{type:Number,default:0},
 draft:{type:mongoose.Schema.Types.Mixed,required:true},published:{type:mongoose.Schema.Types.Mixed,default:null},
 adopted:{type:Boolean,default:false},
 savedBy:String,publishedBy:String,publishedAt:Date,
},{timestamps:true});
export const NexusOrder = mongoose.model('NexusOrder',new mongoose.Schema({_id:{type:String},slugs:[String]},{timestamps:true}),'nexus_order');
export default mongoose.model('ClubPage',schema,'club_pages');

export const ClubPageBindingBackup = mongoose.model('ClubPageBindingBackup',new mongoose.Schema({
 clubId:{type:mongoose.Schema.Types.ObjectId,required:true,index:true},
 fromSlug:{type:String,required:true},toSlug:{type:String,required:true},
 changedBy:{type:String,required:true},snapshot:{type:mongoose.Schema.Types.Mixed,required:true},
},{timestamps:true}),'club_page_binding_backups');
