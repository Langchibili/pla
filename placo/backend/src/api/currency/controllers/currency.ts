import { factories } from '@strapi/strapi';
import { requireUserId } from '../../../services/security';
import { convertAmount, CurrencyConversionUnavailableError } from '../../../services/currencyConversion';
import { getProfileForUser } from '../../../services/walletService';

const PUBLIC_FIELDS=new Set(['id','documentId','code','name','symbol','rate_to_base','rate_updated_at','is_base','currency_status','createdAt','updatedAt','publishedAt']);
function sanitize(entry:any) { if(!entry||typeof entry!=='object') return entry; const root=entry.attributes&&typeof entry.attributes==='object'?entry.attributes:entry; for(const key of Object.keys(root)) if(!PUBLIC_FIELDS.has(key)) delete root[key]; return entry; }
function requireActive(ctx:any) { const f=ctx.query.filters; ctx.query.filters=f?{$and:[f,{currency_status:{$eq:'active'}}]}:{currency_status:{$eq:'active'}}; }
export default factories.createCoreController('api::currency.currency', ({ strapi }) => ({
  async find(ctx:any) { requireActive(ctx); const response=await super.find(ctx); if(Array.isArray(response?.data)) response.data.forEach(sanitize); return response; },
  async findOne(ctx:any) {
    const key=String(ctx.params.documentId??ctx.params.id??'');
    const record=await strapi.db.query('api::currency.currency').findOne({where:{$or:[{documentId:key},{code:key.toUpperCase()}]}});
    if(!record||record.currency_status!=='active') return ctx.notFound('Currency not found');
    return ctx.send({data:sanitize(record)});
  },
  async convertPrice(ctx:any) {
    const userId=requireUserId(ctx); if(!userId) return ctx.unauthorized('Login required');
    const amount=Number(ctx.request.body?.amount); const from=String(ctx.request.body?.fromCurrencyCode??'').trim().toUpperCase();
    if(!Number.isFinite(amount)||amount<0||amount>1_000_000_000_000) return ctx.badRequest('amount must be a non-negative finite number');
    if(!/^[A-Z]{3}$/.test(from)) return ctx.badRequest('fromCurrencyCode must be a three-letter ISO code');
    const profile=await getProfileForUser(strapi,userId);
    const user=await strapi.db.query('plugin::users-permissions.user').findOne({where:{id:userId},populate:{country:{populate:{default_currency:true}},preferred_currency:true}});
    const source=await strapi.db.query('api::currency.currency').findOne({where:{code:from,currency_status:'active'}});
    if(!source) return ctx.badRequest(`Unknown or inactive source currency: ${from}`);
    const target=profile?.preferred_currency??user?.preferred_currency??user?.country?.default_currency;
    if(!target?.code||target.currency_status!=='active') return ctx.badRequest('Select a country with an active default currency before converting prices');
    try {
      const converted=await convertAmount(strapi,amount,from,String(target.code).toUpperCase());
      return ctx.send({success:true,amount:converted,currencyCode:target.code,currencySymbol:target.symbol??null,wasConverted:from!==target.code});
    } catch(error:any) {
      if(error instanceof CurrencyConversionUnavailableError) { ctx.status=503; ctx.body={error:{status:503,name:'ServiceUnavailableError',message:'Currency conversion is temporarily unavailable'}}; return; }
      throw error;
    }
  },
}));
