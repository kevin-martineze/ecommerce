// Librerías
import { describe, expect, it } from 'vitest';

// Servidor
import { dashboardSchema, storeSchema } from '$lib/server/api/platform';

const activation = {
	stage: 'first_order',
	stageReachedAt: '2026-11-03T15:00:00.000Z',
	firstProductAt: '2026-11-02T15:00:00.000Z',
	firstOrderAt: '2026-11-03T15:00:00.000Z',
	firstSaleAt: null,
	firstPaymentAt: null,
	lastSeenAt: '2026-11-20T12:00:00.000Z',
	activeProductsWithPhoto: 2,
	hasLogo: false,
	wompiConnected: false,
	contactPhone: '573001234567'
};

const store = {
	id: 'b1d6c0a2-0f3e-4f5a-9d1e-2a7c1f6b8e01',
	name: 'Tienda Prueba',
	slug: 'tienda-prueba',
	customDomain: null,
	status: 'ACTIVE',
	trialEndsAt: null,
	createdAt: '2026-11-01T15:00:00.000Z',
	planCode: 'basico',
	subscriptionStatus: 'ACTIVE',
	currentPeriodEnd: '2026-12-01',
	members: [{ userId: 'u-1', email: 'dueña@ejemplo.co', fullName: null, role: 'OWNER' }],
	productCount: 2,
	orderCount: 1,
	activation
};

const dashboard = {
	stores: { total: 3, trial: 1, active: 1, pastDue: 0, suspended: 1 },
	payingStores: 1,
	mrr: 49000,
	revenueThisMonth: 49000,
	revenueLastMonth: 0,
	trialsEnding: [],
	overdue: [],
	recentPayments: [],
	activation: { created: 3, catalog: 2, firstOrder: 1, firstSale: 0, paying: 0 }
};

describe('storeSchema (tienda en la consola)', () => {
	it('traduce el embudo de activación a snake_case', () => {
		const parsed = storeSchema.parse(store);

		expect(parsed.activation).toEqual({
			stage: 'first_order',
			stage_reached_at: '2026-11-03T15:00:00.000Z',
			first_product_at: '2026-11-02T15:00:00.000Z',
			first_order_at: '2026-11-03T15:00:00.000Z',
			first_sale_at: null,
			first_payment_at: null,
			last_seen_at: '2026-11-20T12:00:00.000Z',
			active_products_with_photo: 2,
			has_logo: false,
			wompi_connected: false,
			contact_phone: '573001234567'
		});
	});

	it('rechaza una etapa que la API no define', () => {
		const result = storeSchema.safeParse({
			...store,
			activation: { ...activation, stage: 'oro' }
		});

		expect(result.success).toBe(false);
	});

	it('no acepta una respuesta sin embudo', () => {
		expect(storeSchema.safeParse({ ...store, activation: undefined }).success).toBe(false);
	});
});

describe('dashboardSchema (embudo del resumen)', () => {
	it('pasa cada etapa a su código de dominio, con guion bajo', () => {
		const parsed = dashboardSchema.parse(dashboard);

		expect(parsed.activation).toEqual({
			created: 3,
			catalog: 2,
			first_order: 1,
			first_sale: 0,
			paying: 0
		});
	});
});
