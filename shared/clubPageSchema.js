export const WIDGET_TYPES = Object.freeze(['text','image','gallery','links','stats','list','people','contact','events','embed','custom']);
export const emptyClubPage = (title = '') => ({card:{title,summary:'',cover:''},hero:{title,subtitle:'',image:''},containers:[]});
