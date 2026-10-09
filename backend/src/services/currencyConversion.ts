const CACHE_TTL_MS = 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10_000;
const conversionRates = new Map<string, { rate: number; expiresAt: number }>();

type Logger = {
	log: {
		error: (message: string, error?: unknown) => void;
	};
};

export class CurrencyConversionUnavailableError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'CurrencyConversionUnavailableError';
	}
}

async function getConversionRate(
	strapi: Logger,
	fromCode: string,
	toCode: string,
): Promise<number> {
	if (fromCode === toCode) return 1;

	const cacheKey = `${fromCode}:${toCode}`;
	const cached = conversionRates.get(cacheKey);
	if (cached && cached.expiresAt > Date.now()) return cached.rate;

	const apiKey = process.env.EXCHANGE_RATE_API_KEY?.trim();
	if (!apiKey) {
		throw new CurrencyConversionUnavailableError('EXCHANGE_RATE_API_KEY is not configured');
	}

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
	try {
		const url = `https://v6.exchangerate-api.com/v6/${encodeURIComponent(apiKey)}/pair/${fromCode}/${toCode}`;
		const response = await fetch(url, { signal: controller.signal });
		if (!response.ok) {
			throw new Error(`Exchange-rate provider returned HTTP ${response.status}`);
		}
		const result = await response.json() as {
			result?: string;
			'error-type'?: string;
			conversion_rate?: number;
		};
		const rate = Number(result.conversion_rate);
		if (result.result !== 'success' || !Number.isFinite(rate) || rate <= 0) {
			throw new Error(`Exchange-rate provider response was invalid (${result['error-type'] ?? 'unknown error'})`);
		}

		conversionRates.set(cacheKey, { rate, expiresAt: Date.now() + CACHE_TTL_MS });
		return rate;
	} catch (error) {
		strapi.log.error(`[currencyConversion] Unable to retrieve ${fromCode}->${toCode} rate`, error);
		throw new CurrencyConversionUnavailableError(`No current exchange rate is available for ${fromCode}->${toCode}`);
	} finally {
		clearTimeout(timeout);
	}
}

export async function convertAmount(
	strapi: Logger,
	amount: number,
	fromCode: string,
	toCode: string,
): Promise<number> {
	const rate = await getConversionRate(strapi, fromCode, toCode);
	const converted = amount * rate;
	if (!Number.isFinite(converted)) {
		throw new CurrencyConversionUnavailableError(`Converted amount is invalid for ${fromCode}->${toCode}`);
	}
	return Math.round((converted + Number.EPSILON) * 100) / 100;
}
