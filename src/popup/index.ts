import { AuthStateMessage, ClearAnalysisMessage, ExtensionMessage, User, UserSubscription } from '../utils/types';
import supabaseService from '../api/supabase';
import stripeService from '../api/stripe';
import storageService from '../utils/storage';

/**
 * Initialize the popup
 */
async function initialize() {
  console.log('Job Description Analyzer popup initialized');

  // Set up message listeners
  chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
    handleMessage(message);
  });

  // Set up UI event listeners
  setupEventListeners();

  // Check authentication state
  await checkAuthState();
}

/**
 * Set up event listeners for UI elements
 */
function setupEventListeners() {
  // Analyze button
  document.getElementById('analyze-btn')?.addEventListener('click', handleAnalyzeClick);

  // Clear button
  document.getElementById('clear-btn')?.addEventListener('click', handleClearClick);

  // Login button
  document.getElementById('login-btn')?.addEventListener('click', handleLoginClick);

  // Signup button
  document.getElementById('signup-btn')?.addEventListener('click', handleSignupClick);

  // Logout button
  document.getElementById('logout-btn')?.addEventListener('click', handleLogoutClick);

  // Upgrade link
  document.getElementById('upgrade-link')?.addEventListener('click', handleUpgradeClick);
}

/**
 * Handle messages from other extension components
 * @param message The message to handle
 */
function handleMessage(message: ExtensionMessage) {
  console.log('Popup received message:', message.action);

  switch (message.action) {
    case 'authState':
      updateAuthUI(message as AuthStateMessage);
      break;
    
    case 'analyzeResult':
      updateStatusUI('Analysis complete! View results in the floating panel.');
      break;
    
    default:
      break;
  }
}

/**
 * Handle analyze button click
 */
async function handleAnalyzeClick() {
  try {
    // Afficher un message de chargement
    updateStatusUI('Analyzing job description...', 'info');
    
    // Récupérer le texte de la description de poste
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.id) {
      throw new Error('No active tab found');
    }
    
    // Vérifier si nous sommes sur une page chrome:// ou une autre page restreinte
    if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:'))) {
      updateStatusUI('This extension cannot run on browser system pages. Please navigate to a regular website to analyze job descriptions.', 'warning');
      return;
    }
    
    // Stocker l'ID de l'onglet dans une variable locale pour éviter les erreurs de type
    const tabId = tab.id;

    // Vérifier si nous pouvons exécuter des scripts dans cet onglet
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: () => true,
      });
    } catch (error) {
      console.error('Cannot execute scripts in this tab:', error);
      
      // Message plus clair pour les utilisateurs
      if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:'))) {
        updateStatusUI('This extension cannot run on browser system pages. Please navigate to a regular website to analyze job descriptions.', 'warning');
      } else if (tab.url && tab.url.startsWith('file://')) {
        updateStatusUI('This extension cannot run on local files. Please navigate to a website to analyze job descriptions.', 'warning');
      } else {
        updateStatusUI('Cannot analyze this page. Please try a different page or refresh the current page.', 'error');
      }
      return;
    }
    
    // Envoyer un message au content script pour extraire le texte
    try {
      chrome.tabs.sendMessage(tabId, { action: 'extractJobDescription' }, async (response) => {
        if (chrome.runtime.lastError) {
          // Gérer l'erreur de communication avec le content script
          console.error('Error communicating with content script:', chrome.runtime.lastError);
          
          // Essayer d'injecter le content script manuellement
          try {
            await chrome.scripting.executeScript({
              target: { tabId },
              files: ['content.js']
            });
            
            // Attendre un peu pour que le script s'initialise
            setTimeout(() => {
              // Réessayer d'envoyer le message
              chrome.tabs.sendMessage(tabId, { action: 'extractJobDescription' }, async (retryResponse) => {
                if (chrome.runtime.lastError) {
                  console.error('Still cannot communicate with content script after injection:', chrome.runtime.lastError);
                  updateStatusUI('Error: Could not extract job description. Please refresh the page and try again.', 'error');
                  return;
                }
                
                // Traiter la réponse comme d'habitude
                processExtractedJobText(retryResponse, tabId);
              });
            }, 500);
          } catch (injectionError) {
            console.error('Failed to inject content script:', injectionError);
            updateStatusUI('Error: Could not analyze this page. Please try a different page.', 'error');
          }
          return;
        }
        
        // Traiter la réponse normalement
        processExtractedJobText(response, tabId);
      });
    } catch (sendError) {
      console.error('Error sending message to content script:', sendError);
      updateStatusUI('Error: Could not communicate with the page. Please refresh and try again.', 'error');
    }
  } catch (error) {
    console.error('Error in analyze handler:', error);
    updateStatusUI(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
  }
}

/**
 * Process the extracted job text
 * @param response The response from the content script
 * @param tabId The ID of the current tab
 */
async function processExtractedJobText(response: any, tabId: number) {
  if (!response || !response.jobText) {
    updateStatusUI('No job description found on this page. Please navigate to a page with a job description.', 'warning');
    return;
  }
  
  try {
    // Envoyer la description au background script pour analyse
    const result = await chrome.runtime.sendMessage({
      action: 'analyze',
      jobText: response.jobText
    });
    
    if (!result.success) {
      // Afficher un message d'erreur approprié
      if (result.error && result.error.includes('API key not configured')) {
        updateStatusUI('Error: Gemini API key not configured. Please go to Settings and add your API key.', 'error');
        showApiKeyPrompt();
      } else if (result.error && result.error.includes('API key is invalid')) {
        updateStatusUI('Error: Your Gemini API key is invalid. Please go to Settings and update it.', 'error');
        showApiKeyPrompt();
      } else {
        updateStatusUI(`Error: ${result.error || 'Unknown error'}`, 'error');
      }
      return;
    }
    
    // Traiter le résultat de l'analyse
    handleAnalysisResults(result.analysis);
    updateStatusUI('Analysis complete!', 'success');
  } catch (error) {
    console.error('Error during analysis:', error);
    updateStatusUI(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
  }
}

/**
 * Update the status UI with a message
 * @param message The message to display
 * @param type The type of message (info, success, warning, error)
 */
function updateStatusUI(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
  const statusElement = document.getElementById('status');
  if (statusElement) {
    statusElement.textContent = message;
    
    // Reset classes
    statusElement.className = 'status';
    
    // Add appropriate class based on type
    switch (type) {
      case 'success':
        statusElement.classList.add('alert', 'alert-success');
        break;
      case 'warning':
        statusElement.classList.add('alert', 'alert-warning');
        break;
      case 'error':
        statusElement.classList.add('alert', 'alert-danger');
        break;
      default:
        statusElement.classList.add('alert', 'alert-info');
        break;
    }
  }
}

/**
 * Show a prompt to configure the API key
 */
function showApiKeyPrompt() {
  const apiKeyPrompt = document.createElement('div');
  apiKeyPrompt.className = 'mt-3 alert alert-warning';
  apiKeyPrompt.innerHTML = `
    <p>You need to configure your Gemini API key to use this extension.</p>
    <a href="settings.html" class="btn btn-primary btn-sm">Go to Settings</a>
    <a href="https://ai.google.dev/" target="_blank" class="btn btn-outline-secondary btn-sm ms-2">Get API Key</a>
  `;
  
  // Ajouter le prompt au DOM
  const statusElement = document.getElementById('status');
  if (statusElement) {
    statusElement.after(apiKeyPrompt);
  }
}

/**
 * Handle click on the clear button
 */
async function handleClearClick() {
  updateStatusUI('Clearing analysis...');

  // Send clear message to background
  const clearMessage: ClearAnalysisMessage = { action: 'clearAnalysis' };
  await chrome.runtime.sendMessage(clearMessage);

  // Send clear message to content script
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs[0];

  if (activeTab && activeTab.id) {
    chrome.tabs.sendMessage(activeTab.id, clearMessage);
  }

  updateStatusUI('Analysis cleared.');
}

/**
 * Handle click on the login button
 */
async function handleLoginClick() {
  // Redirect to settings page with login tab active
  chrome.tabs.create({ url: 'settings.html#account-tab' });
}

/**
 * Handle click on the signup button
 */
async function handleSignupClick() {
  // Redirect to settings page with signup tab active
  chrome.tabs.create({ url: 'settings.html#account-tab?signup=true' });
}

/**
 * Handle click on the logout button
 */
async function handleLogoutClick() {
  updateStatusUI('Logging out...');

  try {
    const { error } = await supabaseService.signOut();
    
    if (error) {
      updateStatusUI(`Logout failed: ${error.message}`);
      return;
    }

    await storageService.clearUserData();
    
    // Broadcast auth state
    broadcastAuthState(null, null);
    
    updateStatusUI('Logged out successfully!');
  } catch (error) {
    updateStatusUI(`Logout error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Handle click on the upgrade button
 */
async function handleUpgradeClick() {
  updateStatusUI('Preparing upgrade...', 'info');

  try {
    const { user } = await storageService.getUserData();
    
    if (!user) {
      updateStatusUI('Please log in to upgrade.', 'warning');
      return;
    }

    // Obtenir l'URL de paiement
    const checkoutUrl = await stripeService.createCheckoutSession(user);
    
    // Ouvrir l'URL dans un nouvel onglet
    chrome.tabs.create({ url: checkoutUrl });
    
    updateStatusUI('Payment page opened in a new tab.', 'success');
  } catch (error) {
    console.error('Error in upgrade handler:', error);
    updateStatusUI(`Upgrade error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
  }
}

/**
 * Check the current authentication state
 */
async function checkAuthState() {
  try {
    const { user, subscription } = await storageService.getUserData();
    
    if (user) {
      updateAuthUI({
        action: 'authState',
        isLoggedIn: true,
        user,
        subscription,
      });
    } else {
      updateAuthUI({
        action: 'authState',
        isLoggedIn: false,
      });
    }
  } catch (error) {
    console.error('Error checking auth state:', error);
    updateAuthUI({
      action: 'authState',
      isLoggedIn: false,
    });
  }
}

/**
 * Update the authentication UI based on the current state
 * @param authState The current authentication state
 */
function updateAuthUI(authState: AuthStateMessage) {
  const loggedOutSection = document.getElementById('logged-out');
  const loggedInSection = document.getElementById('logged-in');
  const userEmailElement = document.getElementById('user-email');
  const subscriptionStatusElement = document.getElementById('subscription-status');
  const upgradeLink = document.getElementById('upgrade-link');

  if (authState.isLoggedIn && authState.user) {
    // User is logged in
    if (loggedOutSection) loggedOutSection.style.display = 'none';
    if (loggedInSection) loggedInSection.style.display = 'block';
    
    // Update user email
    if (userEmailElement) userEmailElement.textContent = authState.user.email || 'No email provided';
    
    // Update subscription status
    if (subscriptionStatusElement && authState.subscription) {
      const isPremium = authState.subscription.plan === 'premium' && authState.subscription.status === 'active';
      subscriptionStatusElement.textContent = isPremium ? 'Premium Plan' : 'Free Plan';
      
      // Hide upgrade link if already premium
      if (upgradeLink) {
        upgradeLink.style.display = isPremium ? 'none' : 'inline-block';
      }
    }
  } else {
    // User is logged out
    if (loggedOutSection) loggedOutSection.style.display = 'block';
    if (loggedInSection) loggedInSection.style.display = 'none';
    
    // Show upgrade link (will prompt for login when clicked)
    if (upgradeLink) {
      upgradeLink.style.display = 'inline-block';
    }
  }
}

/**
 * Broadcast authentication state to all extension components
 * @param user The current user
 * @param subscription The user's subscription
 */
function broadcastAuthState(user: User | null, subscription: UserSubscription | null) {
  const message: AuthStateMessage = {
    action: 'authState',
    isLoggedIn: !!user,
    user: user || undefined,
    subscription: subscription || undefined,
  };

  chrome.runtime.sendMessage(message);
}

/**
 * Handle the analysis results
 * @param analysis The job analysis results
 */
function handleAnalysisResults(analysis: any) {
  // Cacher le message de statut
  const statusElement = document.getElementById('status');
  if (statusElement) {
    statusElement.style.display = 'none';
  }
  
  // Créer ou récupérer le conteneur de résultats
  let resultsContainer = document.getElementById('analysis-results');
  if (!resultsContainer) {
    resultsContainer = document.createElement('div');
    resultsContainer.id = 'analysis-results';
    resultsContainer.className = 'mt-3';
    document.body.appendChild(resultsContainer);
  } else {
    resultsContainer.innerHTML = '';
    resultsContainer.style.display = 'block';
  }
  
  // Afficher le résumé
  const summarySection = document.createElement('div');
  summarySection.className = 'card mb-3';
  summarySection.innerHTML = `
    <div class="card-header bg-primary text-white">
      <h5 class="card-title mb-0">Summary</h5>
    </div>
    <div class="card-body">
      <p>${analysis.summary}</p>
    </div>
  `;
  resultsContainer.appendChild(summarySection);
  
  // Afficher les catégories de mots-clés
  if (analysis.keywordCategories && analysis.keywordCategories.length > 0) {
    analysis.keywordCategories.forEach((category: any) => {
      const categorySection = document.createElement('div');
      categorySection.className = 'card mb-3';
      
      const keywords = category.keywords.map((keyword: string) => 
        `<span class="badge bg-light text-dark me-2 mb-2">${keyword}</span>`
      ).join('');
      
      categorySection.innerHTML = `
        <div class="card-header">
          <h5 class="card-title mb-0">${category.name}</h5>
        </div>
        <div class="card-body">
          <div class="d-flex flex-wrap">
            ${keywords}
          </div>
        </div>
      `;
      
      resultsContainer.appendChild(categorySection);
    });
  }
  
  // Afficher l'estimation de salaire si disponible (premium)
  if (analysis.salaryEstimate) {
    const salarySection = document.createElement('div');
    salarySection.className = 'card mb-3 border-warning';
    salarySection.innerHTML = `
      <div class="card-header bg-warning">
        <h5 class="card-title mb-0">Salary Estimate <span class="badge bg-warning text-dark">PREMIUM</span></h5>
      </div>
      <div class="card-body">
        <p>${analysis.salaryEstimate}</p>
      </div>
    `;
    resultsContainer.appendChild(salarySection);
  }
}

// Initialize the popup when the DOM is loaded
document.addEventListener('DOMContentLoaded', initialize); 