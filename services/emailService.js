import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

// Initialisation de Resend. Ne crashera pas si la clé est absente, mais l'envoi échouera.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Email d'expéditeur par défaut (doit être vérifié sur ton compte Resend)
// Par exemple: 'AfriVoice <contact@afrivoice.site>'
const FROM_EMAIL = 'AfriVoice <onboarding@resend.dev>'; // Par défaut pour les tests Resend

/**
 * Envoie l'e-mail de rappel (Email 1) : L'utilisateur s'est inscrit mais n'a pas utilisé son essai.
 */
export const sendReminderEmail = async (userEmail, userName = 'Créateur') => {
  if (!resend) {
    console.warn('⚠️ RESEND_API_KEY non configurée. E-mail de rappel non envoyé à', userEmail);
    return false;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: userEmail,
      subject: 'Oubli ? Venez écouter votre première voix africaine gratuite 🎙️',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
          <h2>Bonjour ${userName},</h2>
          <p>Nous avons remarqué que vous avez créé un compte sur <strong>AfriVoice AI</strong>, mais que vous n'avez pas encore généré votre première voix.</p>
          <p>Saviez-vous que vous avez droit à un <strong>essai gratuit</strong> ? Vous pouvez transformer jusqu'à 200 caractères de texte en une voix africaine ultra-réaliste, sans même avoir besoin d'une carte bancaire.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://afrivoice.site" style="background-color: #6C5CE7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Générer ma voix gratuite maintenant</a>
          </div>
          
          <p>Si vous avez des questions, n'hésitez pas à répondre à cet e-mail.</p>
          <p>À tout de suite dans le studio,<br/>L'équipe AfriVoice</p>
        </div>
      `,
    });

    if (error) {
      console.error('❌ Erreur Resend (Reminder):', error);
      return false;
    }
    
    console.log(`✅ E-mail de rappel envoyé à ${userEmail}`);
    return true;
  } catch (err) {
    console.error('❌ Exception Resend (Reminder):', err);
    return false;
  }
};

/**
 * Envoie l'e-mail de conversion (Email 2) : L'utilisateur a utilisé l'essai, on l'invite à s'abonner.
 */
export const sendConversionEmail = async (userEmail, userName = 'Créateur') => {
  if (!resend) {
    console.warn('⚠️ RESEND_API_KEY non configurée. E-mail de conversion non envoyé à', userEmail);
    return false;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: userEmail,
      subject: 'Votre voix africaine vous attend... passez au niveau supérieur 🚀',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
          <h2>Bonjour ${userName},</h2>
          <p>Vous avez récemment testé notre studio de synthèse vocale et nous espérons que le résultat vous a plu !</p>
          <p>Pour vos vidéos YouTube, TikTok, vos publicités ou vos podcasts, des voix authentiques font toute la différence. Avec <strong>AfriVoice AI</strong>, vous avez accès à des accents de 19 pays africains.</p>
          
          <p>Il est temps de débloquer votre plein potentiel créatif.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://afrivoice.site" style="background-color: #00D68F; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Découvrir les forfaits et créer sans limite</a>
          </div>
          
          <p>Passez au forfait supérieur dès aujourd'hui pour faire exploser l'engagement de vos vidéos.</p>
          <p>À très vite,<br/>L'équipe AfriVoice</p>
        </div>
      `,
    });

    if (error) {
      console.error('❌ Erreur Resend (Conversion):', error);
      return false;
    }
    
    console.log(`✅ E-mail de conversion envoyé à ${userEmail}`);
    return true;
  } catch (err) {
    console.error('❌ Exception Resend (Conversion):', err);
    return false;
  }
};
