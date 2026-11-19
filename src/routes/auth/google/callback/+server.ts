// Tipos
import type { RequestHandler } from './$types';

// Servidor
import { finishGoogleSignIn } from '$lib/server/google-signin';

/** Google vuelve aquí con el código. Es la única URI registrada en Google. */
export const GET: RequestHandler = (event) => finishGoogleSignIn(event);
