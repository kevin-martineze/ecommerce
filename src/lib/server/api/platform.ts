// Tipos
import type { ApiResult } from '$lib/server/api/client';
import type { AccountContext } from '$lib/server/context';
import type {
	MonthPayments,
	Plan,
	PlatformDashboard,
	PlatformPayment,
	PlatformPaymentRow,
	PlatformStore,
	PlatformStoreDetail,
	PlatformUser,
	PlatformUserDetail,
	StoreStatus,
	UserStatus
} from '$lib/domain/account';
import type { ActivationStage, StoreActivation } from '$lib/domain/activation';

// Librerías
import { z } from 'zod';

// Servidor
import { apiRequest } from '$lib/server/api/client';
import { planSchema } from '$lib/server/api/panel-team';
import {
	memberRoleSchema,
	storeStatusSchema,
	subscriptionStatusSchema
} from '$lib/server/api/statuses';

// Dominio
import { ACTIVATION_STAGES } from '$lib/domain/activation';
import { DOMAIN_STATUSES } from '$lib/domain/domain';

/** Consola de la plataforma: `/platform/*`. Solo para cuentas en `platform_admins`. */

const storeFields = {
	id: z.string(),
	name: z.string(),
	slug: z.string(),
	customDomain: z.string().nullable(),
	status: storeStatusSchema,
	trialEndsAt: z.string().nullable(),
	createdAt: z.string(),
	planCode: z.string().nullable(),
	subscriptionStatus: subscriptionStatusSchema.nullable(),
	currentPeriodEnd: z.string().nullable(),
	members: z.array(
		z.object({
			userId: z.string(),
			email: z.string(),
			fullName: z.string().nullable(),
			role: memberRoleSchema
		})
	),
	productCount: z.number(),
	orderCount: z.number(),
	activation: z.object({
		stage: z.enum(ACTIVATION_STAGES),
		stageReachedAt: z.string(),
		firstProductAt: z.string().nullable(),
		firstOrderAt: z.string().nullable(),
		firstSaleAt: z.string().nullable(),
		firstPaymentAt: z.string().nullable(),
		lastSeenAt: z.string().nullable(),
		activeProductsWithPhoto: z.number(),
		hasLogo: z.boolean(),
		wompiConnected: z.boolean(),
		contactPhone: z.string().nullable()
	})
};

type RawStore = z.output<z.ZodObject<typeof storeFields>>;

function toActivation(activation: RawStore['activation']): StoreActivation {
	return {
		stage: activation.stage,
		stage_reached_at: activation.stageReachedAt,
		first_product_at: activation.firstProductAt,
		first_order_at: activation.firstOrderAt,
		first_sale_at: activation.firstSaleAt,
		first_payment_at: activation.firstPaymentAt,
		last_seen_at: activation.lastSeenAt,
		active_products_with_photo: activation.activeProductsWithPhoto,
		has_logo: activation.hasLogo,
		wompi_connected: activation.wompiConnected,
		contact_phone: activation.contactPhone
	};
}

function toStore(store: RawStore): PlatformStore {
	return {
		id: store.id,
		name: store.name,
		slug: store.slug,
		custom_domain: store.customDomain,
		status: store.status,
		trial_ends_at: store.trialEndsAt,
		created_at: store.createdAt,
		plan_code: store.planCode,
		subscription_status: store.subscriptionStatus,
		current_period_end: store.currentPeriodEnd,
		members: store.members.map((member) => ({
			user_id: member.userId,
			email: member.email,
			full_name: member.fullName,
			role: member.role
		})),
		product_count: store.productCount,
		order_count: store.orderCount,
		activation: toActivation(store.activation)
	};
}

export const storeSchema = z.object(storeFields).transform(toStore);

const paymentSchema = z
	.object({
		id: z.string(),
		amountCop: z.number(),
		periodStart: z.string(),
		periodEnd: z.string(),
		method: z.string(),
		reference: z.string().nullable(),
		recordedBy: z.string().nullable(),
		createdAt: z.string()
	})
	.transform((payment): PlatformPayment => ({
		id: payment.id,
		amount_cop: payment.amountCop,
		period_start: payment.periodStart,
		period_end: payment.periodEnd,
		method: payment.method,
		reference: payment.reference,
		recorded_by: payment.recordedBy,
		created_at: payment.createdAt
	}));

const storeDetailSchema = z
	.object({
		...storeFields,
		subscriptionNotes: z.string().nullable(),
		payments: z.array(paymentSchema),
		publicUrl: z.string(),
		customDomainStatus: z.enum(DOMAIN_STATUSES).nullable()
	})
	.transform((store): PlatformStoreDetail => ({
		...toStore(store),
		subscription_notes: store.subscriptionNotes,
		payments: store.payments,
		public_url: store.publicUrl,
		custom_domain_status: store.customDomainStatus
	}));

function platformRequest<T>(
	ctx: AccountContext,
	path: string,
	schema: z.ZodType<T, z.ZodTypeDef, unknown>,
	options: { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown } = {}
): Promise<ApiResult<T>> {
	return apiRequest(`/platform${path}`, schema, {
		...options,
		accessToken: ctx.accessToken,
		clientIp: ctx.clientIp
	});
}

export function listPlans(ctx: AccountContext): Promise<ApiResult<Plan[]>> {
	return platformRequest(ctx, '/plans', z.array(planSchema));
}

export interface StoreFilters {
	q: string | null;
	status: StoreStatus | null;
	overdue: boolean;
	stage: ActivationStage | null;
}

const STATUS_TO_API: Record<StoreStatus, string> = {
	trial: 'TRIAL',
	active: 'ACTIVE',
	past_due: 'PAST_DUE',
	suspended: 'SUSPENDED'
};

export function listStores(
	ctx: AccountContext,
	filters: StoreFilters
): Promise<ApiResult<PlatformStore[]>> {
	const params = new URLSearchParams();

	if (filters.q) params.set('q', filters.q);
	if (filters.status) params.set('status', STATUS_TO_API[filters.status]);
	if (filters.overdue) params.set('overdue', 'true');
	if (filters.stage) params.set('stage', filters.stage);

	const query = params.size > 0 ? `?${params}` : '';

	return platformRequest(ctx, `/stores${query}`, z.array(storeSchema));
}

export function getStore(ctx: AccountContext, id: string): Promise<ApiResult<PlatformStoreDetail>> {
	return platformRequest(ctx, `/stores/${encodeURIComponent(id)}`, storeDetailSchema);
}

export function setStoreStatus(
	ctx: AccountContext,
	id: string,
	status: 'active' | 'suspended'
): Promise<ApiResult<PlatformStoreDetail>> {
	return platformRequest(ctx, `/stores/${encodeURIComponent(id)}/status`, storeDetailSchema, {
		method: 'PATCH',
		body: { status: status === 'active' ? 'ACTIVE' : 'SUSPENDED' }
	});
}

export function changePlan(
	ctx: AccountContext,
	id: string,
	planCode: string,
	notes: string | null
): Promise<ApiResult<PlatformStoreDetail>> {
	return platformRequest(ctx, `/stores/${encodeURIComponent(id)}/plan`, storeDetailSchema, {
		method: 'PUT',
		body: { planCode, notes }
	});
}

export interface PaymentInput {
	amountCop: number;
	periodStart: string;
	periodEnd: string;
	method: string;
	reference: string | null;
}

export function recordPayment(
	ctx: AccountContext,
	id: string,
	input: PaymentInput
): Promise<ApiResult<PlatformStoreDetail>> {
	return platformRequest(ctx, `/stores/${encodeURIComponent(id)}/payments`, storeDetailSchema, {
		method: 'POST',
		body: input
	});
}

const storeRefFields = {
	id: z.string(),
	name: z.string(),
	slug: z.string(),
	ownerEmail: z.string().nullable()
};

const platformPaymentSchema = z
	.object({
		id: z.string(),
		storeId: z.string(),
		storeName: z.string(),
		storeSlug: z.string(),
		amountCop: z.number(),
		periodStart: z.string(),
		periodEnd: z.string(),
		method: z.string(),
		reference: z.string().nullable(),
		recordedBy: z.string().nullable(),
		createdAt: z.string()
	})
	.transform((payment): PlatformPaymentRow => ({
		id: payment.id,
		store_id: payment.storeId,
		store_name: payment.storeName,
		store_slug: payment.storeSlug,
		amount_cop: payment.amountCop,
		period_start: payment.periodStart,
		period_end: payment.periodEnd,
		method: payment.method,
		reference: payment.reference,
		recorded_by: payment.recordedBy,
		created_at: payment.createdAt
	}));

export const dashboardSchema = z
	.object({
		stores: z.object({
			total: z.number(),
			trial: z.number(),
			active: z.number(),
			pastDue: z.number(),
			suspended: z.number()
		}),
		payingStores: z.number(),
		mrr: z.number(),
		revenueThisMonth: z.number(),
		revenueLastMonth: z.number(),
		trialsEnding: z.array(
			z.object({ ...storeRefFields, trialEndsAt: z.string(), daysLeft: z.number() })
		),
		overdue: z.array(
			z.object({
				...storeRefFields,
				currentPeriodEnd: z.string().nullable(),
				daysOverdue: z.number()
			})
		),
		recentPayments: z.array(platformPaymentSchema),
		activation: z.object({
			created: z.number(),
			catalog: z.number(),
			firstOrder: z.number(),
			firstSale: z.number(),
			paying: z.number()
		}),
		monthly: z.array(
			z.object({
				month: z.string(),
				revenueCop: z.number(),
				newStores: z.number(),
				totalStores: z.number()
			})
		)
	})
	.transform((dashboard): PlatformDashboard => ({
		stores: {
			total: dashboard.stores.total,
			trial: dashboard.stores.trial,
			active: dashboard.stores.active,
			past_due: dashboard.stores.pastDue,
			suspended: dashboard.stores.suspended
		},
		paying_stores: dashboard.payingStores,
		mrr: dashboard.mrr,
		revenue_this_month: dashboard.revenueThisMonth,
		revenue_last_month: dashboard.revenueLastMonth,
		trials_ending: dashboard.trialsEnding.map((store) => ({
			id: store.id,
			name: store.name,
			slug: store.slug,
			owner_email: store.ownerEmail,
			trial_ends_at: store.trialEndsAt,
			days_left: store.daysLeft
		})),
		overdue: dashboard.overdue.map((store) => ({
			id: store.id,
			name: store.name,
			slug: store.slug,
			owner_email: store.ownerEmail,
			current_period_end: store.currentPeriodEnd,
			days_overdue: store.daysOverdue
		})),
		recent_payments: dashboard.recentPayments,
		monthly: dashboard.monthly.map((point) => ({
			month: point.month,
			revenue_cop: point.revenueCop,
			new_stores: point.newStores,
			total_stores: point.totalStores
		})),
		activation: {
			created: dashboard.activation.created,
			catalog: dashboard.activation.catalog,
			first_order: dashboard.activation.firstOrder,
			first_sale: dashboard.activation.firstSale,
			paying: dashboard.activation.paying
		}
	}));

export function getDashboard(ctx: AccountContext): Promise<ApiResult<PlatformDashboard>> {
	return platformRequest(ctx, '/dashboard', dashboardSchema);
}

const monthPaymentsSchema = z.object({
	month: z.string(),
	total: z.number(),
	payments: z.array(platformPaymentSchema)
});

/** Todos los pagos de un mes de Colombia (`YYYY-MM`). */
export function listPayments(
	ctx: AccountContext,
	month: string
): Promise<ApiResult<MonthPayments>> {
	return platformRequest(ctx, `/payments?month=${encodeURIComponent(month)}`, monthPaymentsSchema);
}

export function reconcile(ctx: AccountContext): Promise<ApiResult<{ markedPastDue: number }>> {
	return platformRequest(ctx, '/reconcile', z.object({ markedPastDue: z.number() }), {
		method: 'POST'
	});
}

// ---------------------------------------------------------------------------
// Cuentas
// ---------------------------------------------------------------------------

const userFields = {
	id: z.string(),
	email: z.string(),
	fullName: z.string().nullable(),
	createdAt: z.string(),
	disabledAt: z.string().nullable(),
	lastSignInAt: z.string().nullable(),
	hasPassword: z.boolean(),
	hasGoogle: z.boolean(),
	isPlatformAdmin: z.boolean(),
	memberships: z.array(
		z.object({
			storeId: z.string(),
			storeName: z.string(),
			storeSlug: z.string(),
			storeStatus: storeStatusSchema,
			role: memberRoleSchema
		})
	)
};

type RawUser = z.output<z.ZodObject<typeof userFields>>;

function toUser(user: RawUser): PlatformUser {
	return {
		id: user.id,
		email: user.email,
		full_name: user.fullName,
		created_at: user.createdAt,
		disabled_at: user.disabledAt,
		last_sign_in_at: user.lastSignInAt,
		has_password: user.hasPassword,
		has_google: user.hasGoogle,
		is_platform_admin: user.isPlatformAdmin,
		memberships: user.memberships.map((membership) => ({
			store_id: membership.storeId,
			store_name: membership.storeName,
			store_slug: membership.storeSlug,
			store_status: membership.storeStatus,
			role: membership.role
		}))
	};
}

const userSchema = z.object(userFields).transform(toUser);

const userDetailSchema = z
	.object({
		...userFields,
		soleOwnerStores: z.array(z.object({ id: z.string(), name: z.string(), slug: z.string() }))
	})
	.transform((user): PlatformUserDetail => ({
		...toUser(user),
		sole_owner_stores: user.soleOwnerStores
	}));

export interface UserFilters {
	q: string | null;
	status: UserStatus | null;
}

export function listUsers(
	ctx: AccountContext,
	filters: UserFilters
): Promise<ApiResult<PlatformUser[]>> {
	const params = new URLSearchParams();

	if (filters.q) params.set('q', filters.q);
	if (filters.status) params.set('status', filters.status);

	const query = params.size > 0 ? `?${params}` : '';

	return platformRequest(ctx, `/users${query}`, z.array(userSchema));
}

export function getUser(ctx: AccountContext, id: string): Promise<ApiResult<PlatformUserDetail>> {
	return platformRequest(ctx, `/users/${encodeURIComponent(id)}`, userDetailSchema);
}

/** Deshabilitar cierra todas sus sesiones; reactivar le devuelve la entrada. */
export function setUserDisabled(
	ctx: AccountContext,
	id: string,
	disabled: boolean
): Promise<ApiResult<PlatformUserDetail>> {
	return platformRequest(ctx, `/users/${encodeURIComponent(id)}/status`, userDetailSchema, {
		method: 'PATCH',
		body: { disabled }
	});
}

/**
 * Elimina la cuenta y las tiendas donde era la única creadora. `deleteStoreIds`
 * es la lista que se le mostró a quien confirma: si la API calcula otra, 409.
 */
export function deleteUser(
	ctx: AccountContext,
	id: string,
	input: { confirmEmail: string; deleteStoreIds: string[] }
): Promise<ApiResult<undefined>> {
	return platformRequest(ctx, `/users/${encodeURIComponent(id)}`, z.undefined(), {
		method: 'DELETE',
		body: input
	});
}

/** Borrado definitivo de una tienda suspendida, con sus fotos y su dominio. */
export function deleteStore(
	ctx: AccountContext,
	id: string,
	confirmSlug: string
): Promise<ApiResult<undefined>> {
	return platformRequest(ctx, `/stores/${encodeURIComponent(id)}`, z.undefined(), {
		method: 'DELETE',
		body: { confirmSlug }
	});
}
