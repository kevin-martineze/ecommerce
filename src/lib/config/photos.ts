// Dominio
import { shot } from '$lib/config/screenshots';

// Recursos
import customerNight1376 from '$lib/assets/marketing/customer-night-1376.webp';
import customerNight688 from '$lib/assets/marketing/customer-night-688.webp';
import founder464 from '$lib/assets/marketing/founder-workshop-464.webp';
import founder928 from '$lib/assets/marketing/founder-workshop-928.webp';
import industryBooks1024 from '$lib/assets/marketing/industry-books-1024.webp';
import industryBooks512 from '$lib/assets/marketing/industry-books-512.webp';
import industryClothing1024 from '$lib/assets/marketing/industry-clothing-1024.webp';
import industryClothing512 from '$lib/assets/marketing/industry-clothing-512.webp';
import industryCoffee1024 from '$lib/assets/marketing/industry-coffee-1024.webp';
import industryCoffee512 from '$lib/assets/marketing/industry-coffee-512.webp';
import productBlouse400 from '$lib/assets/marketing/product-blouse-400.webp';
import productBlouse800 from '$lib/assets/marketing/product-blouse-800.webp';
import productBook400 from '$lib/assets/marketing/product-book-400.webp';
import productBook800 from '$lib/assets/marketing/product-book-800.webp';
import productCoffee400 from '$lib/assets/marketing/product-coffee-400.webp';
import productCoffee800 from '$lib/assets/marketing/product-coffee-800.webp';

/**
 * Las fotos de ambiente del sitio comercial: productos, rubros y personas.
 *
 * A diferencia de las capturas, no salen de una tienda: son imágenes
 * generadas con Gemini, en una misma paleta (crema, terracota, verde salvia,
 * madera) para que se lean como una sola sesión de fotos. Van en WebP, en dos
 * anchos, recortadas a la proporción en que se pintan.
 *
 * Las que solo ambientan —el fondo de un rubro, la foto del cierre— llevan
 * `alt` vacío: el texto de al lado ya dice lo mismo.
 */

export const PHOTO_PRODUCT = {
	clothing: shot(productBlouse400, productBlouse800, 400, 300, ''),
	coffee: shot(productCoffee400, productCoffee800, 400, 300, ''),
	single: shot(productBook400, productBook800, 400, 300, '')
};

export const PHOTO_INDUSTRY = {
	clothing: shot(industryClothing512, industryClothing1024, 512, 512, ''),
	coffee: shot(industryCoffee512, industryCoffee1024, 512, 512, ''),
	single: shot(industryBooks512, industryBooks1024, 512, 512, '')
};

export const PHOTO_FOUNDER = shot(
	founder464,
	founder928,
	464,
	580,
	'Una emprendedora en su taller de ropa empaca un pedido mientras lo revisa en el celular.'
);

export const PHOTO_CUSTOMER_NIGHT = shot(customerNight688, customerNight1376, 688, 387, '');
