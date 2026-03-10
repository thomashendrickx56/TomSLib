import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

/**
 * Client Supabase pour les composants côté navigateur.
 * Utilise les cookies pour la session, afin que le middleware
 * puisse lire la session et autoriser l'accès à /dashboard.
 */
export const supabase = createClientComponentClient();

