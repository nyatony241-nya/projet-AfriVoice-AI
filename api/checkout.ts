export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { planId, email } = req.body;
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];

    if (!process.env.PAYSTACK_SECRET_KEY) {
      return res.status(500).json({ error: 'Paystack Secret Key is missing' });
    }

    let amount = 0;
    let planCode = '';

    // Définir les prix en Kobo (1 FCFA = 100 centimes/kobo selon la devise)
    // Attention: Paystack attend le montant dans la plus petite unité de la devise.
    // Si la devise est XOF (FCFA), l'unité de base est le FCFA lui-même, donc amount = 3500.
    // Mais l'API Paystack demande "amount" en subunit. Il faut vérifier la devise.
    // Pour XOF/XAF, Paystack demande le montant normal (ex: 3500) x 100 pour API
    
    if (planId === 'creator') {
      amount = 3500 * 100;
    } else if (planId === 'pro') {
      amount = 9900 * 100;
    } else {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        amount: amount,
        currency: 'XOF', // Franc CFA
        metadata: {
          plan_id: planId,
          // Vous pouvez stocker l'ID de l'utilisateur ici mais nous utiliserons le JWT pour l'authentification dans Supabase 
          // ou l'email qui est lié au compte
          custom_fields: [
            {
              display_name: "Plan Request",
              variable_name: "plan_id",
              value: planId
            }
          ]
        },
        callback_url: 'https://projet-afri-voice-ai.vercel.app/'
      })
    });

    const data = await paystackResponse.json();

    if (!data.status) {
      return res.status(400).json({ error: data.message });
    }

    // data.data.authorization_url contient l'URL de paiement
    return res.status(200).json({ authorizationUrl: data.data.authorization_url });

  } catch (error: any) {
    console.error('Checkout error:', error);
    return res.status(500).json({ error: error.message });
  }
}
