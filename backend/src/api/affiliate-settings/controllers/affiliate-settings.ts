import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::affiliate-settings.affiliate-settings', () => ({
	async conditionsTemplate(ctx: any) {
		return ctx.send({
			template: {
				operator: 'all',
				conditions: [
					{ type: 'trigger', value: 'tournament_entry_created' },
					{ type: 'minimum_tournament_entries', value: 1 },
					{ type: 'account_status', value: 'active' },
					{ type: 'email_verified', value: true },
				],
				description: 'Every listed condition must pass before the referrer earns Plapo.',
			},
		});
	},
}));
