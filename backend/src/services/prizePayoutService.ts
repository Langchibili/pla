import { creditPlapoTournamentPrize } from './plapoLedgerService';

const TOURNAMENT_UID = 'api::tournament.tournament';
const ENTRY_UID = 'api::tournament-entry.tournament-entry';
const PAYOUT_UID = 'api::prize-payout.prize-payout';

function getSettingsRelation(relation: any): any {
	const data = relation?.data ?? relation;
	const config = Array.isArray(data) ? data[0] : data;
	return config?.attributes && typeof config.attributes === 'object'
		? config.attributes.settings_json
		: config?.settings_json;
}

function allocateUnits(poolAmount: number, distribution: Array<{ place: number; percent: number }>, precision: number) {
	const multiplier = 10 ** precision;
	const poolUnits = Math.round(poolAmount * multiplier);
	const allocations = distribution.map((prize) => {
		const exact = poolUnits * prize.percent / 100;
		return { ...prize, units: Math.floor(exact), remainder: exact - Math.floor(exact) };
	});
	let remaining = poolUnits - allocations.reduce((sum, prize) => sum + prize.units, 0);
	const remainderOrder = [...allocations].sort((left, right) =>
		right.remainder - left.remainder || left.place - right.place);
	for (let index = 0; remaining > 0; index += 1, remaining -= 1) {
		remainderOrder[index % remainderOrder.length].units += 1;
	}
	return allocations.map((prize) => ({
		...prize,
		amount: prize.units / multiplier,
	}));
}

export async function createTournamentPrizePayouts(strapi: any, tournamentId: number): Promise<void> {
	const tournament = await strapi.db.query(TOURNAMENT_UID).findOne({
		where: { id: tournamentId },
		select: ['id', 'documentId', 'title', 'tournament_status', 'prize_type', 'has_prize_pool', 'prize_pool_current_amount', 'config_snapshot'],
		populate: {
			tournament_config: { select: ['settings_json'] },
			prize_pool_currency: { select: ['id'] },
		},
	});
	if (!tournament || tournament.tournament_status !== 'completed'
		|| !tournament.has_prize_pool || tournament.prize_type === 'no-prize') return;

	const settings = tournament.config_snapshot ?? getSettingsRelation(tournament.tournament_config);
	const distribution = settings?.prizePool?.distribution;
	if (!Array.isArray(distribution) || distribution.length === 0) {
		strapi.log.warn(`[PrizePayout] No prize distribution configured for completed tournament ${tournament.documentId}`);
		return;
	}

	const normalized = distribution.map((prize: any) => ({
		place: Number(prize?.place),
		percent: Number(prize?.percent),
	})).filter((prize: any) =>
		Number.isSafeInteger(prize.place) && prize.place > 0
		&& Number.isFinite(prize.percent) && prize.percent > 0);
	const totalPercent = normalized.reduce((sum: number, prize: any) => sum + prize.percent, 0);
	if (normalized.length !== distribution.length
		|| new Set(normalized.map((prize: any) => prize.place)).size !== normalized.length
		|| Math.abs(totalPercent - 100) > 0.000001) {
		strapi.log.warn(`[PrizePayout] Skipped tournament ${tournament.documentId}: prize distribution must total 100%`);
		return;
	}

	const plapo = tournament.prize_type === 'plapo';
	const poolAmount = Number(tournament.prize_pool_current_amount);
	if (!Number.isFinite(poolAmount) || poolAmount <= 0 || (plapo && !Number.isSafeInteger(poolAmount))) {
		strapi.log.warn(`[PrizePayout] Skipped tournament ${tournament.documentId}: prize pool amount is invalid`);
		return;
	}
	const allocations = allocateUnits(poolAmount, normalized, plapo ? 0 : 2);
	const entries = await strapi.db.query(ENTRY_UID).findMany({
		where: { tournament: tournamentId, final_position: { $in: allocations.map((item) => item.place) } },
		select: ['id', 'final_position'],
		populate: { user: { select: ['id'] } },
	});

	for (const allocation of allocations) {
		if (allocation.amount <= 0) continue;
		const entry = entries.find((candidate: any) => Number(candidate.final_position) === allocation.place);
		const userId = Number(entry?.user?.id);
		if (!entry || !Number.isSafeInteger(userId) || userId < 1) continue;
		const idempotencyKey = `tournament-prize-payout:${tournament.documentId ?? tournament.id}:${allocation.place}`;
		let payout = await strapi.db.query(PAYOUT_UID).findOne({
			where: { idempotency_key: idempotencyKey },
			select: ['id', 'documentId', 'prize_payout_status'],
		});
		if (!payout) {
			payout = await strapi.db.query(PAYOUT_UID).findOne({
				where: { tournament: tournamentId, place: allocation.place },
				select: ['id', 'documentId', 'prize_payout_status'],
			});
		}
		if (!payout) {
			try {
				payout = await strapi.db.query(PAYOUT_UID).create({
					data: {
						tournament: tournamentId,
						user: userId,
						tournament_entry: entry.id,
						place: allocation.place,
						amount: allocation.amount,
						...(plapo || !tournament.prize_pool_currency?.id
							? {}
							: { currency: tournament.prize_pool_currency.id }),
						prize_payout_status: plapo ? 'paid' : 'calculated',
						...(plapo ? { approved_at: new Date(), paid_at: new Date() } : {}),
						idempotency_key: idempotencyKey,
					},
				});
			} catch (error) {
				payout = await strapi.db.query(PAYOUT_UID).findOne({
					where: { idempotency_key: idempotencyKey },
					select: ['id', 'documentId', 'prize_payout_status'],
				});
				if (!payout) throw error;
			}
		}
		if (plapo && payout.prize_payout_status === 'paid') {
			await creditPlapoTournamentPrize(strapi, Number(payout.id));
		}
	}
}
