import { factories } from '@strapi/strapi';
import { requireUserId } from '../../../services/security';
import { getProfileForUser, getWalletForProfile } from '../../../services/walletService';
import { UID } from '../../../services/ids';

export default factories.createCoreController('api::coin-wallet.coin-wallet', ({ strapi }) => ({
  async mine(ctx:any) {
    const userId=requireUserId(ctx); if(!userId) return ctx.unauthorized();
    const profile=await getProfileForUser(strapi,userId); if(!profile) return ctx.notFound('Game profile not initialised');
    const wallet=await getWalletForProfile(strapi,profile.id); if(!wallet) return ctx.notFound('Coin wallet not initialised');
    const ledger=await strapi.db.query(UID.coinLedger).findMany({where:{player:profile.id},select:['documentId','coin_type','amount_delta','balance_after','ledger_type','source_type','createdAt'],orderBy:{createdAt:'desc'},limit:20});
    return ctx.send({data:{bronze_balance:wallet.bronze_balance,diamond_balance:wallet.diamond_balance,wallet_game_status:wallet.wallet_game_status,recent_transactions:ledger}});
  },
}));
