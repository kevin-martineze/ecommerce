// Librerías
import { expect, test } from '@playwright/test';

// Utilidades
import { waitForHydratedRecord } from './hydration';

/**
 * Abrir una tienda de punta a punta: el formulario de registro, el onboarding
 * de la plantilla y el panel ya dentro.
 *
 * Cada corrida crea una tienda nueva, con el correo y la dirección marcados con
 * la hora (`e2e-…`). No las borra: este repositorio no habla con la base, y
 * abrirle una puerta para las pruebas sería abrirla del todo. Se limpian desde
 * la API, que es quien tiene acceso:
 *
 *   docker compose exec -T postgres psql -U postgres -d globerce \
 *     -c "delete from stores where slug like 'e2e-%'" \
 *     -c "delete from users where email like 'e2e-%@globerce.test'"
 */

const PASSWORD = 'una contrasena larga de prueba';

function newStore() {
	const brand = `e2e-${Date.now().toString(36)}`;

	return { slug: brand, email: `${brand}@globerce.test`, storeName: 'Tienda de prueba' };
}

test('registrarse, elegir plantilla y entrar al panel', async ({ page }) => {
	const store = newStore();

	await page.goto('/signup?plan=pro');

	// El plan viene marcado desde la página de precios.
	await expect(page.locator('input[name="planCode"][value="pro"]')).toBeChecked();

	await page.fill('input[name="storeName"]', store.storeName);
	await page.fill('input[name="whatsappPhone"]', '573001234567');
	await page.fill('input[name="storeSlug"]', store.slug);
	await page.fill('input[name="fullName"]', 'Prueba Playwright');
	await page.fill('input[name="email"]', store.email);
	await page.fill('input[name="password"]', PASSWORD);
	await page.fill('input[name="confirm"]', PASSWORD);

	await page.getByRole('button', { name: /crear mi tienda/i }).click();

	// Primer paso: elegir con qué se viste la tienda.
	await expect(page).toHaveURL(/\/admin\/welcome/);
	await expect(page.getByRole('heading', { name: /cómo quieres que se vea/i })).toBeVisible();

	await page
		.getByRole('button', { name: /empezar con esta/i })
		.first()
		.click();

	await expect(page).toHaveURL(/\/admin\?welcome=/);
	await expect(page.getByText(/tu tienda está lista/i)).toBeVisible();

	// Y el plan quedó en el que eligió al registrarse.
	await page.goto('/admin/plan');
	await expect(page.getByRole('heading', { name: 'Pro' })).toBeVisible();
});

test('el formulario de registro se queja campo por campo, sin llamar al servidor', async ({
	page
}) => {
	await page.goto('/signup');

	await waitForHydratedRecord(page);

	let requests = 0;
	page.on('request', (request) => {
		if (request.method() === 'POST') requests += 1;
	});

	await page.getByRole('button', { name: /crear mi tienda/i }).click();

	await expect(page.locator('#storeName-error')).toHaveText(/ponle nombre/i);
	await expect(page.locator('#email-error')).toHaveText(/escribe tu correo/i);
	expect(requests).toBe(0);
});

test('la contraseña se puede mirar', async ({ page }) => {
	await page.goto('/signup');

	await waitForHydratedRecord(page);

	const field = page.locator('input[name="password"]');
	// Hay dos ojos, uno por contraseña: el primero es el de esta.
	const eye = page.getByRole('button', { name: /mostrar la contraseña/i }).first();

	await expect(field).toHaveAttribute('type', 'password');
	await eye.click();
	await expect(field).toHaveAttribute('type', 'text');
	await expect(page.locator('input[name="confirm"]')).toHaveAttribute('type', 'password');
});
