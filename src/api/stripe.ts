import { User, UserSubscription } from '../utils/types';

// Utiliser une approche compatible avec les restrictions CSP de l'extension Chrome
// Au lieu d'appeler une API externe, nous allons simuler le processus de paiement
class StripeService {
  private static instance: StripeService;

  private constructor() {}

  public static getInstance(): StripeService {
    if (!StripeService.instance) {
      StripeService.instance = new StripeService();
    }
    return StripeService.instance;
  }

  /**
   * Create a checkout session for premium subscription
   * @param user The current user
   * @returns The checkout URL
   */
  async createCheckoutSession(user: User): Promise<string> {
    try {
      // Au lieu d'appeler une API externe, nous allons ouvrir directement la page de paiement Stripe
      // en utilisant l'API chrome.tabs.create
      
      // Simuler un délai pour donner l'impression d'un traitement
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Créer une URL de paiement simulée qui respecte la CSP
      // Dans une vraie implémentation, vous devriez utiliser un backend sécurisé
      // pour créer la session Stripe et retourner l'URL
      
      // Pour l'instant, nous allons simplement ouvrir une page de démonstration
      return chrome.runtime.getURL('payment.html') + 
        `?userId=${encodeURIComponent(user.id)}` + 
        `&email=${encodeURIComponent(user.email || '')}` +
        `&plan=premium_monthly`;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  }

  /**
   * Create a customer portal session for managing subscription
   * @param user The current user
   * @returns The customer portal URL
   */
  async createCustomerPortalSession(user: User): Promise<string> {
    try {
      // Simuler un délai pour donner l'impression d'un traitement
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Créer une URL de gestion de compte simulée qui respecte la CSP
      return chrome.runtime.getURL('manage-subscription.html') + 
        `?userId=${encodeURIComponent(user.id)}`;
    } catch (error) {
      console.error('Error creating customer portal session:', error);
      throw error;
    }
  }

  /**
   * Check if a user has an active premium subscription
   * @param user The current user
   * @returns Whether the user has an active premium subscription
   */
  async checkPremiumStatus(user: User): Promise<boolean> {
    try {
      // Pour les besoins de la démonstration, nous allons vérifier si l'utilisateur
      // a une entrée dans le stockage local indiquant qu'il est premium
      const data = await chrome.storage.local.get(['premiumUsers']);
      const premiumUsers = data.premiumUsers || [];
      
      return premiumUsers.includes(user.id);
    } catch (error) {
      console.error('Error checking premium status:', error);
      return false;
    }
  }
  
  /**
   * Simuler l'activation d'un abonnement premium (pour la démonstration)
   * @param user L'utilisateur actuel
   * @returns Un objet contenant les détails de l'abonnement
   */
  async activatePremiumSubscription(user: User): Promise<UserSubscription> {
    try {
      // Récupérer la liste actuelle des utilisateurs premium
      const data = await chrome.storage.local.get(['premiumUsers']);
      const premiumUsers = data.premiumUsers || [];
      
      // Ajouter l'utilisateur actuel s'il n'est pas déjà dans la liste
      if (!premiumUsers.includes(user.id)) {
        premiumUsers.push(user.id);
        await chrome.storage.local.set({ premiumUsers });
      }
      
      // Créer un objet d'abonnement
      const subscription: UserSubscription = {
        id: `sub_${Date.now()}`,
        user_id: user.id,
        status: 'active',
        plan: 'premium',
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 jours
        cancel_at_period_end: false
      };
      
      return subscription;
    } catch (error) {
      console.error('Error activating premium subscription:', error);
      throw error;
    }
  }
}

export default StripeService.getInstance(); 