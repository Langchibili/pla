import { normalizeName } from '../../../../services/namePolicy';
function prepare(data:any) {
  if(data.display_term!==undefined) {
    if(typeof data.display_term!=='string' || !data.display_term.trim()) throw new Error('display_term is required');
    data.display_term=data.display_term.trim();
    data.normalized_term=normalizeName(data.display_term);
  } else if(data.normalized_term!==undefined) data.normalized_term=normalizeName(String(data.normalized_term));
}
export default { beforeCreate(event:any){prepare(event.params.data??{});},beforeUpdate(event:any){prepare(event.params.data??{});} };
