// Script pour la page de gestion des abonnements

document.addEventListener('DOMContentLoaded', async () => {
  // Récupérer les paramètres de l'URL
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get('userId');
  
  console.log('Subscription management page initialized for user:', userId);
  
  // Récupérer les informations d'abonnement
  const subscription = await getUserSubscription();
  if (subscription) {
    updateSubscriptionUI(subscription);
  }
  
  // Initialiser le modal de confirmation
  const cancelModal = new bootstrap.Modal(document.getElementById('confirm-cancel-modal'));
  
  // Gérer le bouton d'annulation
  const cancelBtn = document.getElementById('cancel-subscription-btn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      // Afficher le modal de confirmation
      cancelModal.show();
    });
  }
  
  // Gérer le bouton de confirmation d'annulation
  const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
  if (confirmCancelBtn) {
    confirmCancelBtn.addEventListener('click', async () => {
      // Fermer le modal
      cancelModal.hide();
      
      // Annuler l'abonnement
      await cancelSubscription(userId);
      
      // Afficher le message de succès
      document.getElementById('subscription-management').style.display = 'none';
      document.getElementById('cancel-success').style.display = 'block';
    });
  }
});

/**
 * Récupérer les informations d'abonnement de l'utilisateur
 */
async function getUserSubscription() {
  try {
    const data = await chrome.storage.local.get(['userSubscription']);
    return data.userSubscription;
  } catch (error) {
    console.error('Error getting user subscription:', error);
    return null;
  }
}

/**
 * Mettre à jour l'interface utilisateur avec les informations d'abonnement
 * @param {Object} subscription - Les informations d'abonnement
 */
function updateSubscriptionUI(subscription) {
  // Mettre à jour le statut
  const statusElement = document.getElementById('subscription-status');
  if (statusElement) {
    statusElement.textContent = subscription.plan === 'premium' ? 'Premium' : 'Free';
  }
  
  // Mettre à jour le plan
  const planElement = document.getElementById('subscription-plan');
  if (planElement) {
    planElement.textContent = subscription.plan === 'premium' ? 'Premium Monthly' : 'Free Plan';
  }
  
  // Mettre à jour le statut actif
  const activeElement = document.getElementById('subscription-active');
  if (activeElement) {
    activeElement.textContent = subscription.status === 'active' ? 'Active' : 'Inactive';
  }
  
  // Mettre à jour la date de renouvellement
  const renewalElement = document.getElementById('subscription-renewal');
  if (renewalElement && subscription.current_period_end) {
    const renewalDate = new Date(subscription.current_period_end);
    renewalElement.textContent = renewalDate.toLocaleDateString();
  }
  
  // Mettre à jour le bouton d'annulation
  const cancelBtn = document.getElementById('cancel-subscription-btn');
  if (cancelBtn) {
    if (subscription.cancel_at_period_end) {
      cancelBtn.textContent = 'Subscription Cancelled';
      cancelBtn.disabled = true;
      cancelBtn.classList.remove('btn-danger');
      cancelBtn.classList.add('btn-secondary');
    } else {
      cancelBtn.textContent = 'Cancel Subscription';
      cancelBtn.disabled = false;
    }
  }
}

/**
 * Annuler l'abonnement de l'utilisateur
 * @param {string} userId - L'ID de l'utilisateur
 */
async function cancelSubscription(userId) {
  try {
    // Récupérer l'abonnement actuel
    const data = await chrome.storage.local.get(['userSubscription']);
    const subscription = data.userSubscription;
    
    if (subscription) {
      // Marquer l'abonnement comme annulé à la fin de la période
      subscription.cancel_at_period_end = true;
      
      // Mettre à jour le stockage
      await chrome.storage.local.set({ userSubscription: subscription });
      
      // Envoyer un message pour mettre à jour l'état d'abonnement
      chrome.runtime.sendMessage({
        action: 'subscriptionUpdated',
        subscription
      });
      
      console.log('Subscription cancelled for user:', userId);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return false;
  }
} 