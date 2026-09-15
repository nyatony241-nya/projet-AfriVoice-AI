-- ══════════════════════════════════════════════════════════════════════════════
-- AfriVoice AI — CORRECTIF DE SÉCURITÉ CRITIQUE
-- Script : fix_security.sql
-- Faille : CWE-285 — Improper Authorization sur update_quota_for_plan
-- ──────────────────────────────────────────────────────────────────────────────
-- INSTRUCTIONS :
-- 1. Aller sur : https://supabase.com/dashboard → votre projet → SQL Editor
-- 2. Coller et exécuter CE script intégralement
-- 3. Vérifier que le résultat dit "Success. No rows returned."
-- ══════════════════════════════════════════════════════════════════════════════

-- ÉTAPE 1 : Révoquer le droit PUBLIC (tous les utilisateurs) d'exécuter
-- la fonction sensible update_quota_for_plan.
-- Sans ce REVOKE, n'importe quel utilisateur authentifié pouvait s'octroyer
-- un plan Pro gratuitement via : supabase.rpc('update_quota_for_plan', {...})
REVOKE EXECUTE ON FUNCTION public.update_quota_for_plan(TEXT, TEXT) FROM PUBLIC;

-- ÉTAPE 2 : S'assurer que seul le rôle service_role (utilisé exclusivement
-- par votre webhook Vercel côté serveur) peut exécuter cette fonction.
GRANT EXECUTE ON FUNCTION public.update_quota_for_plan(TEXT, TEXT) TO service_role;

-- ÉTAPE 3 : Même protection sur la fonction handle_new_user (trigger).
-- Elle est SECURITY DEFINER mais ne devrait pas être appelable directement.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;

-- ÉTAPE 4 : Même protection sur handle_updated_at.
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM PUBLIC;

-- ÉTAPE 5 : Vérification — cette requête doit retourner 0 résultats.
-- Si elle retourne des lignes, il reste des fonctions SECURITY DEFINER
-- accessibles publiquement.
SELECT
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  p.prosecdef AS is_security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE
  n.nspname = 'public'
  AND p.prosecdef = TRUE
  AND has_function_privilege('public', p.oid, 'EXECUTE');

-- ══════════════════════════════════════════════════════════════════════════════
-- ✅ Correctif appliqué. La fonction update_quota_for_plan est maintenant
--    inaccessible depuis le navigateur ou les clients Supabase non-admin.
-- ══════════════════════════════════════════════════════════════════════════════
