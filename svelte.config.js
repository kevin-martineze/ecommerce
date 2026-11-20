// Svelte
import node from '@sveltejs/adapter-node';
import vercel from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/**
 * En Vercel se empaqueta con su adaptador. En local se usa el de Node porque
 * el de Vercel crea symlinks, y Windows los bloquea sin modo desarrollador.
 */
const adapter = process.env.VERCEL ? vercel() : node();

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter,
		alias: {
			$lib: 'src/lib'
		},
		// El service worker solo sirve para los avisos push del panel y la
		// consola: se registra a mano cuando alguien los activa, nunca en la
		// tienda pública (ver `$lib/stores/push-device.svelte.ts`).
		serviceWorker: {
			register: false
		}
	},
	compilerOptions: {
		runes: true
	}
};

export default config;
