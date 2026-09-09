-- Fix RLS Policies for user_quotas to use JWT email instead of querying auth.users

DROP POLICY IF EXISTS "user_quotas_update_own" ON public.user_quotas;
CREATE POLICY "user_quotas_update_own" ON public.user_quotas
FOR UPDATE
USING (
  auth.uid() = user_id 
  OR email = (auth.jwt() ->> 'email')
)
WITH CHECK (
  auth.uid() = user_id 
  OR email = (auth.jwt() ->> 'email')
);

DROP POLICY IF EXISTS "user_quotas_insert_own" ON public.user_quotas;
CREATE POLICY "user_quotas_insert_own" ON public.user_quotas
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  OR email = (auth.jwt() ->> 'email')
);

DROP POLICY IF EXISTS "user_quotas_select_own" ON public.user_quotas;
CREATE POLICY "user_quotas_select_own" ON public.user_quotas
FOR SELECT
USING (
  auth.uid() = user_id 
  OR email = (auth.jwt() ->> 'email')
);

-- Fix user_id linkage for existing accounts where it is NULL
UPDATE public.user_quotas uq
SET user_id = u.id
FROM auth.users u
WHERE uq.email = u.email AND uq.user_id IS NULL;
