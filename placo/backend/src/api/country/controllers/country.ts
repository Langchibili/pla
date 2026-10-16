import { factories } from '@strapi/strapi';
const COUNTRY_FIELDS=new Set(['id','documentId','name','iso_code','dial_code','default_currency','country_status','createdAt','updatedAt','publishedAt']);
const CURRENCY_FIELDS=new Set(['id','documentId','code','name','symbol','rate_to_base','rate_updated_at','is_base','currency_status','createdAt','updatedAt','publishedAt']);
function sanitizeCountry(entry:any) {
  if(!entry||typeof entry!=='object') return entry;
  const fields=entry.attributes&&typeof entry.attributes==='object'?entry.attributes:entry;
  for(const key of Object.keys(fields)) if(!COUNTRY_FIELDS.has(key)) delete fields[key];
  const currency=fields.default_currency;
  if(currency&&typeof currency==='object') { const nested=currency.attributes&&typeof currency.attributes==='object'?currency.attributes:currency; for(const key of Object.keys(nested)) if(!CURRENCY_FIELDS.has(key)) delete nested[key]; }
  return entry;
}
function onlyActive(ctx:any) { const f=ctx.query.filters; ctx.query.filters=f?{$and:[f,{country_status:{$eq:'active'}}]}:{country_status:{$eq:'active'}}; }
export default factories.createCoreController('api::country.country',({strapi})=>({
  async find(ctx:any) { onlyActive(ctx); const response=await super.find(ctx); if(Array.isArray(response?.data)) response.data.forEach(sanitizeCountry); return response; },
  async findOne(ctx:any) {
    const key=String(ctx.params.documentId??ctx.params.id??'');
    const record=await strapi.db.query('api::country.country').findOne({where:{$or:[{documentId:key},{iso_code:key.toUpperCase()}]},populate:{default_currency:true}});
    if(!record||record.country_status!=='active') return ctx.notFound('Country not found');
    return ctx.send({data:sanitizeCountry(record)});
  },
}));
