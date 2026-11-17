/**
 * Los datos de quien presta el servicio.
 *
 * Los usan las páginas legales y la de contacto. Lo que esté en `null` no se
 * pinta: una política de privacidad con un NIT inventado es peor que una sin
 * NIT, y un correo de contacto que no existe es una promesa rota en la primera
 * línea que alguien lea.
 *
 * Al constituir la empresa se llenan aquí y aparecen solos en las tres
 * páginas.
 */
export interface CompanyInfo {
	/** Nombre comercial. Siempre hay. */
	brand: string;
	legalName: string | null;
	nit: string | null;
	/** Correo al que escribe quien tiene una duda o ejerce sus derechos de datos. */
	email: string | null;
	/** Solo dígitos, con indicativo. */
	whatsapp: string | null;
	city: string | null;
	/** País cuya ley rige el servicio. */
	pais: string;
}

export const COMPANY: CompanyInfo = {
	brand: 'Globerce',
	legalName: null,
	nit: null,
	email: null,
	whatsapp: null,
	city: null,
	pais: 'Colombia'
};

/** Desde cuándo rige la versión actual de los textos legales. */
export const LEGAL_EFFECTIVE_DATE = '19 de septiembre de 2026';

/** Si hay al menos una forma de contactarnos. */
export function hasContact(company: CompanyInfo = COMPANY): boolean {
	return Boolean(company.email || company.whatsapp);
}
