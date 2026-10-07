import { factories } from '@strapi/strapi';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { readFile } from 'fs/promises';

const UNPARSED_BODY = Symbol.for('unparsedBody');

export default factories.createCoreController('api::match-submission.match-submission', ({ strapi }) => ({
	async submit(ctx: any) {
		const userId = Number(ctx.state.user?.id);
		if (!Number.isInteger(userId) || userId < 1) return ctx.unauthorized();

		const matchId = String(ctx.request.body?.match_id ?? '');
		const rawFile = ctx.request.files?.screenshot;
		const screenshot = Array.isArray(rawFile) ? rawFile[0] : rawFile;
		if (!matchId || !screenshot?.filepath) return ctx.badRequest('match_id and screenshot are required');

		const mimeType = String(screenshot.mimetype ?? '');
		if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
			return ctx.badRequest('Upload a JPEG, PNG, or WebP screenshot');
		}
		if (Number(screenshot.size) > 10 * 1024 * 1024) {
			return ctx.badRequest('Screenshot must be 10 MB or smaller');
		}

		const match = await strapi.db.query('api::match.match').findOne({
			where: /^\d+$/.test(matchId)
				? { $or: [{ id: Number(matchId) }, { documentId: matchId }] }
				: { documentId: matchId },
			populate: {
				player1_entry: { populate: { user: { select: ['id'] } } },
				player2_entry: { populate: { user: { select: ['id'] } } },
			},
		});
		if (!match) return ctx.notFound('Match not found');

		const isParticipant = [match.player1_entry?.user?.id, match.player2_entry?.user?.id]
			.some((participantId) => Number(participantId) === userId);
		if (!isParticipant) return ctx.forbidden('Only match participants can submit a screenshot');
		if (!['scheduled', 'postponed', 'awaiting_confirmation'].includes(match.match_status)) {
			return ctx.badRequest('This match is not accepting submissions');
		}

		const priorSubmission = await strapi.db.query('api::match-submission.match-submission').findOne({
			where: {
				match: match.id,
				user: userId,
				match_submission_status: { $in: ['pending', 'processing', 'valid', 'needs_review'] },
			},
			select: ['id'],
		});
		if (priorSubmission) return ctx.badRequest('You already have a live submission for this match');

		const fileBytes = await readFile(screenshot.filepath);
		const screenshotHash = createHash('sha256').update(fileBytes).digest('hex');
		const duplicate = await strapi.db.query('api::match-submission.match-submission').findOne({
			where: { screenshot_hash: screenshotHash },
			select: ['id'],
		});
		if (duplicate) return ctx.badRequest('This screenshot has already been submitted');

		const uploadedFiles = await strapi.plugin('upload').service('upload').upload({
			data: {
				fileInfo: {
					name: screenshot.originalFilename,
					alternativeText: 'Tournament match result screenshot',
				},
			},
			files: screenshot,
		}, { user: ctx.state.user });
		const uploadedFile = uploadedFiles[0];

		const submission = await strapi.documents('api::match-submission.match-submission').create({
			data: {
				match: match.documentId ?? match.id,
				user: userId,
				screenshot: uploadedFile.id,
				screenshot_hash: screenshotHash,
				match_submission_status: 'pending',
			},
		});

		return ctx.send({
			data: {
				documentId: submission.documentId,
				match_submission_status: submission.match_submission_status,
			},
		}, 201);
	},

	async scoreWebhook(ctx: any) {
		const secret = process.env.WEBHOOK_SECRET;
		const timestamp = String(ctx.request.headers['x-timestamp'] ?? '');
		const signature = String(ctx.request.headers['x-signature'] ?? '');
		const rawBody = ctx.request.body?.[UNPARSED_BODY];
		if (!secret || !timestamp || !signature || !Buffer.isBuffer(rawBody)) {
			return ctx.unauthorized('Invalid score webhook signature');
		}
		const timestampSeconds = Number(timestamp);
		if (!Number.isFinite(timestampSeconds) || Math.abs(Date.now() / 1000 - timestampSeconds) > 300) {
			return ctx.unauthorized('Score webhook timestamp has expired');
		}

		const expectedSignature = `sha256=${createHmac('sha256', secret).update(timestamp).update('.').update(rawBody).digest('hex')}`;
		const expectedBytes = Buffer.from(expectedSignature);
		const suppliedBytes = Buffer.from(signature);
		if (expectedBytes.length !== suppliedBytes.length || !timingSafeEqual(expectedBytes, suppliedBytes)) {
			return ctx.unauthorized('Invalid score webhook signature');
		}

		let payload: any;
		try {
			payload = JSON.parse(rawBody.toString('utf8'));
		} catch {
			return ctx.badRequest('Invalid score webhook payload');
		}
		if (payload?.event !== 'score.result' || !payload.job_id || !payload.result) {
			return ctx.badRequest('Invalid score webhook payload');
		}

		const submissionId = Number(payload.job_id);
		const submission = await strapi.db.query('api::match-submission.match-submission').findOne({
			where: {
				$or: [
					{ score_job_id: String(payload.job_id) },
					...(Number.isInteger(submissionId) ? [{ id: submissionId }] : []),
				],
			},
			populate: {
				match: { populate: { tournament: { populate: { game: true } } } },
			},
		});
		if (!submission) return ctx.notFound('Submission not found');
		if (submission.extracted_json) return ctx.send({ received: true, duplicate: true });

		const result = payload.result;
		const gameId = submission.match?.tournament?.game?.id;
		const zones = gameId
			? await strapi.db.query('api::game-score-zone.game-score-zone').findMany({
				where: { game: gameId },
				select: ['allowed_zone'],
			})
			: [];
		const allowedZones = zones.map((zone: any) => zone.allowed_zone);
		const settings = await strapi.db.query('api::admn-settings.admn-settings').findOne({});
		const confidenceThreshold = Number(settings?.min_ocr_confidence ?? 0.8);
		const status = result.status === 'rejected' || result.status === 'no_score_found'
			? 'invalid'
			: !allowedZones.includes(result.zone)
				? 'invalid'
				: Number(result.confidence) < confidenceThreshold || !result.score
					? 'needs_review'
					: 'valid';

		await strapi.db.query('api::match-submission.match-submission').update({
			where: { id: submission.id },
			data: {
				score_job_id: String(payload.job_id),
				extracted_json: result,
				ocr_confidence: Number.isFinite(Number(result.confidence)) ? Number(result.confidence) : null,
				score_zone_found: typeof result.zone === 'string' ? result.zone : null,
				match_submission_status: status,
				rejection_reason: status === 'invalid' ? (result.reject_reason ?? 'Score was not found in the permitted game zone.') : null,
			},
		});

		return ctx.send({ received: true });
	},
}));
