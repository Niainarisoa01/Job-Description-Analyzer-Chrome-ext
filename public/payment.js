// Script pour la page de paiement simulée

document.addEventListener('DOMContentLoaded', () => {
  // Récupérer les paramètres de l'URL
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get('userId');
  const email = urlParams.get('email');
  const plan = urlParams.get('plan');
  
  console.log('Payment page initialized for user:', userId, email, plan);
  
  // Gérer le formulaire de paiement
  const checkoutForm = document.getElementById('checkout-form');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      
      // Simuler un traitement de paiement
      await simulatePaymentProcessing();
      
      // Activer l'abonnement premium pour l'utilisateur
      await activatePremiumSubscription(userId);
      
      // Afficher le message de succès
      document.getElementById('payment-form').style.display = 'none';
      document.getElementById('payment-success').style.display = 'block';
    });
  }
  
  // Gérer le bouton d'annulation
  const cancelBtn = document.getElementById('cancel-btn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      // Rediriger vers la popup
      window.location.href = 'popup.html';
    });
  }
});

/**
 * Simuler le traitement du paiement
 */
async function simulatePaymentProcessing() {
  // Afficher un indicateur de chargement
  const submitBtn = document.querySelector('#checkout-form button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
  }
  
  // Simuler un délai de traitement
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return true;
}

/**
 * Activer l'abonnement premium pour l'utilisateur
 * @param {string} userId - L'ID de l'utilisateur
 */
async function activatePremiumSubscription(userId) {
  try {
    // Récupérer la liste actuelle des utilisateurs premium
    const data = await chrome.storage.local.get(['premiumUsers']);
    const premiumUsers = data.premiumUsers || [];
    
    // Ajouter l'utilisateur s'il n'est pas déjà dans la liste
    if (!premiumUsers.includes(userId)) {
      premiumUsers.push(userId);
      await chrome.storage.local.set({ premiumUsers });
    }
    
    // Créer un objet d'abonnement
    const subscription = {
      id: `sub_${Date.now()}`,
      user_id: userId,
      status: 'active',
      plan: 'premium',
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 jours
      cancel_at_period_end: false
    };
    
    // Stocker les informations d'abonnement
    await chrome.storage.local.set({ 
      userSubscription: subscription 
    });
    
    // Envoyer un message pour mettre à jour l'état d'authentification
    chrome.runtime.sendMessage({
      action: 'subscriptionUpdated',
      subscription
    });
    
    console.log('Premium subscription activated for user:', userId);
    return true;
  } catch (error) {
    console.error('Error activating premium subscription:', error);
    return false;
  }
} 