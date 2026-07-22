import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!secret || !supabaseUrl || !supabaseServiceKey) {
      console.error('Webhook: Missing environment variables');
      return res.status(500).json({ error: 'Configuration error' });
    }

    // Validate event
    const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex');
    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.body;

    if (event.event === 'charge.success') {
      const email = event.data.customer.email;
      const planId = event.data.metadata?.plan_id || 'creator';

      // Initialize Supabase client with Service Role to bypass RLS and update safely
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Find user by email
      const { data: users, error: userError } = await supabase.auth.admin.listUsers();
      if (userError) throw userError;

      const user = users.users.find(u => u.email === email);
      if (!user) {
        console.error('Webhook: User not found for email:', email);
        return res.status(404).json({ error: 'User not found' });
      }

      // Update their profile to the new plan, reset seconds_used
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          plan_id: planId,
          seconds_used: 0,
          subscription_status: 'active',
          paystack_customer_id: event.data.customer.customer_code
        })
        .eq('id', user.id);

      if (updateError) throw updateError;
      
      console.log(`Webhook: Successfully updated user ${email} to plan ${planId}`);
    }

    res.status(200).end();
  } catch (error: any) {
    console.error('Webhook Error:', error);
    res.status(500).json({ error: error.message });
  }
}
