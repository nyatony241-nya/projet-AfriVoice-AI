-- Check the user's current quotas to see if bonus_seconds were added
SELECT email, monthly_limit, seconds_used, bonus_seconds, chariow_order_id, updated_at 
FROM public.user_quotas 
WHERE email = 'expressxport1@gmail.com';
