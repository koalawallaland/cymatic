import {buildBoba as photo} from './boba-realistic.mjs';
export async function buildBoba(host,options={}){
 try{
    const {buildBoba3D}=await import('./boba-samoyed-3d.mjs?v=7');
    return buildBoba3D(host,options);
 }catch(err){
    console.warn('3D rendering unavailable; using Boba’s animated portrait.',err);
    const fallback=await photo(host);return {...fallback,kind:'photo'};
 }
}
