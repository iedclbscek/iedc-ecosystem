export function cloudinaryUploadOptions(purpose) {
 const contentImage=purpose==='club_page'||purpose.endsWith('_event');
 return {
  folder:purpose==='club_page'?'club-pages':purpose.endsWith('_event')?'events':'execom',
  transformation:[
   contentImage?{width:2000,height:2000,crop:'limit'}:{width:800,height:800,crop:'fill',gravity:'face'},
   {fetch_format:'auto',quality:'auto'},
  ],
 };
}
