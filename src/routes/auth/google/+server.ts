// Tipos
import type { RequestHandler } from './$types';

// Servidor
import { startGoogleSignIn } from '$lib/server/google-signin';

/** Arranca "Entrar con Google": guarda el intento y manda a Google. Ver `google-signin.ts`. */
export const GET: RequestHandler = (event) => startGoogleSignIn(event);
