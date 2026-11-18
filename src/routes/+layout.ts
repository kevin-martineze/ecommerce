// Librerías
import { injectAnalytics } from '@vercel/analytics/sveltekit';

// App
import { dev } from '$app/environment';

// Vercel Web Analytics: cuenta visitas y páginas vistas. En desarrollo solo
// escribe en la consola del navegador y no manda nada.
injectAnalytics({ mode: dev ? 'development' : 'production' });
