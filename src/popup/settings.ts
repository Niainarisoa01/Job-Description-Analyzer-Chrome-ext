import { AuthStateMessage, ExtensionMessage, User, UserSubscription } from '../utils/types';
import supabaseService from '../api/supabase';
import stripeService from '../api/stripe';
import storageService from '../utils/storage';

// Bootstrap is loaded from the HTML file, but we need to declare it for TypeScript
declare const bootstrap: any;

/**
 * Initialize the settings page
 */
async function initialize() {
  console.log('Job Description Analyzer settings initialized');

  // Set up message listeners
  chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
    handleMessage(message);
  });

  // Set up UI event listeners
  setupEventListeners();

  // Load saved settings
  await loadSettings();

  // Handle email confirmation if present in URL hash
  await handleEmailConfirmation();

  // Check authentication state
  await checkAuthState();
  
  // Check if we should show the signup tab
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('signup')) {
    // Activate the signup tab
    const signupTab = document.getElementById('signup-tab');
    if (signupTab) {
      const tabInstance = new bootstrap.Tab(signupTab);
      tabInstance.show();
    }
  }
  
  // Activate the account tab if specified in the hash
  if (window.location.hash === '#account-tab') {
    const accountTab = document.getElementById('account-tab');
    if (accountTab) {
      const tabInstance = new bootstrap.Tab(accountTab);
      tabInstance.show();
    }
  }
}

/**
 * Set up event listeners for UI elements
 */
function setupEventListeners() {
  // API Keys form
  document.getElementById('api-keys-form')?.addEventListener('submit', handleApiKeysSubmit);
  document.getElementById('toggle-gemini-key')?.addEventListener('click', () => togglePasswordVisibility('gemini-api-key', 'toggle-gemini-key'));
  document.getElementById('toggle-supabase-key')?.addEventListener('click', () => togglePasswordVisibility('supabase-anon-key', 'toggle-supabase-key'));

  // Profile form
  document.getElementById('profile-form')?.addEventListener('submit', handleProfileSubmit);

  // Preferences form
  document.getElementById('preferences-form')?.addEventListener('submit', handlePreferencesSubmit);

  // Auth forms
  document.getElementById('login-form')?.addEventListener('submit', handleLoginSubmit);
  document.getElementById('signup-form')?.addEventListener('submit', handleSignupSubmit);
  document.getElementById('settings-logout-btn')?.addEventListener('click', handleLogoutClick);

  // Subscription buttons
  document.getElementById('upgrade-btn')?.addEventListener('click', handleUpgradeClick);
  document.getElementById('manage-subscription-btn')?.addEventListener('click', handleManageSubscriptionClick);
}

/**
 * Handle messages from other extension components
 * @param message The message to handle
 */
function handleMessage(message: ExtensionMessage) {
  console.log('Settings received message:', message.action);

  switch (message.action) {
    case 'authState':
      updateAuthUI(message as AuthStateMessage);
      break;
    
    default:
      break;
  }
}

/**
 * Load saved settings from storage
 */
async function loadSettings() {
  try {
    // Load API keys
    const apiKeys = await storageService.getApiKeys();
    
    if (apiKeys.geminiApiKey) {
      (document.getElementById('gemini-api-key') as HTMLInputElement).value = apiKeys.geminiApiKey;
    }
    
    // Set Supabase URL (use stored value or default)
    const supabaseUrl = apiKeys.supabaseUrl || 'https://bpuetxlloxxgtldwodeh.supabase.co';
    (document.getElementById('supabase-url') as HTMLInputElement).value = supabaseUrl;
    
    // Set Supabase anon key (use stored value or default)
    const supabaseAnonKey = apiKeys.supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwdWV0eGxsb3h4Z3RsZHdvZGVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwNjU2NTMsImV4cCI6MjA1NzY0MTY1M30.JcKZ1Ii3Ffr-BiYmOInnvTs9CiRZzS755Kpny7SwZGs';
    (document.getElementById('supabase-anon-key') as HTMLInputElement).value = supabaseAnonKey;

    // Initialize Supabase with the credentials if not already initialized
    if (supabaseUrl && supabaseAnonKey) {
      supabaseService.initialize(supabaseUrl, supabaseAnonKey);
    }

    // Load preferences
    const preferences = await chrome.storage.sync.get({
      highlightKeywords: true,
      panelPosition: 'top-right',
      theme: 'light'
    });

    (document.getElementById('highlight-keywords') as HTMLInputElement).checked = preferences.highlightKeywords;
    (document.getElementById('panel-position') as HTMLSelectElement).value = preferences.panelPosition;
    (document.getElementById('theme-select') as HTMLSelectElement).value = preferences.theme;
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

/**
 * Handle API keys form submission
 * @param e Form submit event
 */
async function handleApiKeysSubmit(e: Event) {
  e.preventDefault();
  
  try {
    const geminiApiKey = (document.getElementById('gemini-api-key') as HTMLInputElement).value;
    const supabaseUrl = (document.getElementById('supabase-url') as HTMLInputElement).value;
    const supabaseAnonKey = (document.getElementById('supabase-anon-key') as HTMLInputElement).value;
    
    // Save API keys to storage
    await storageService.saveApiKeys({
      geminiApiKey,
      supabaseUrl,
      supabaseAnonKey
    });

    // Initialize Supabase with the new credentials
    if (supabaseUrl && supabaseAnonKey) {
      supabaseService.initialize(supabaseUrl, supabaseAnonKey);
    }

    // Save Gemini API key to Supabase if user is logged in
    const { user } = await storageService.getUserData();
    if (user && geminiApiKey) {
      await supabaseService.saveGeminiApiKey(user.id, geminiApiKey);
    }
    
    showAlert('API keys saved successfully!', 'success');
  } catch (error) {
    console.error('Error saving API keys:', error);
    showAlert('Error saving API keys. Please try again.', 'danger');
  }
}

/**
 * Handle profile form submission
 * @param e Form submit event
 */
async function handleProfileSubmit(e: Event) {
  e.preventDefault();
  
  try {
    // Show loading state
    const submitButton = document.getElementById('save-profile') as HTMLButtonElement;
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
    }
    
    const fullName = (document.getElementById('full-name') as HTMLInputElement).value;
    console.log('Attempting to update profile with name:', fullName);
    
    // Get API keys to check Supabase initialization
    const apiKeys = await storageService.getApiKeys();
    console.log('Supabase URL from storage:', apiKeys.supabaseUrl);
    console.log('Supabase anon key exists:', !!apiKeys.supabaseAnonKey);
    
    // Get user data
    const { user } = await storageService.getUserData();
    console.log('Current user data:', JSON.stringify(user, null, 2));
    
    if (!user) {
      showAlert('You must be logged in to update your profile.', 'warning');
      return;
    }
    
    // Ensure Supabase is initialized
    if (apiKeys.supabaseUrl && apiKeys.supabaseAnonKey) {
      console.log('Reinitializing Supabase before profile update');
      supabaseService.initialize(apiKeys.supabaseUrl, apiKeys.supabaseAnonKey);
      
      // Wait a moment for initialization to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      console.error('Missing Supabase credentials');
      showAlert('Missing Supabase credentials. Please configure API keys first.', 'danger');
      return;
    }
    
    // Create a simple profile object with just the full name
    const profileData = { full_name: fullName };
    
    console.log('Attempting to update profile for user ID:', user.id);
    try {
      // First, try to directly insert the profile (this will fail if the profile already exists)
      try {
        console.log('Attempting direct profile insert first...');
        const { data, error } = await supabaseService.directInsertProfile(user.id, profileData);
          
        if (!error && data) {
          console.log('Profile created successfully via direct insert:', data);
          showAlert('Profile created successfully!', 'success');
          return;
        } else {
          console.log('Direct insert failed (likely profile already exists):', error);
          // Continue to update flow
        }
      } catch (insertError) {
        console.log('Direct insert attempt failed:', insertError);
        // Continue to update flow
      }
      
      // If insert failed, try update
      console.log('Attempting profile update...');
      const result = await supabaseService.updateUserProfile(user.id, profileData);
      console.log('Profile update result:', result);
      showAlert('Profile updated successfully!', 'success');
    } catch (updateError) {
      console.error('Error from updateUserProfile:', updateError);
      console.error('Error type:', typeof updateError);
      
      if (updateError instanceof Error) {
        console.error('Error name:', updateError.name);
        console.error('Error message:', updateError.message);
        console.error('Error stack:', updateError.stack);
      } else {
        console.error('Non-Error object thrown:', JSON.stringify(updateError, null, 2));
      }
      
      // Try a direct SQL approach as a last resort
      try {
        console.log('Attempting direct SQL approach as fallback...');
        const { success, error: rpcError } = await supabaseService.upsertProfileViaRPC(user.id, fullName);
        
        if (rpcError) {
          console.error('SQL fallback approach failed:', rpcError);
          throw rpcError;
        } else if (success) {
          console.log('Profile updated successfully via SQL fallback!');
          showAlert('Profile updated successfully!', 'success');
          return;
        }
      } catch (sqlError) {
        console.error('SQL fallback approach exception:', sqlError);
        // Continue to error handling
      }
      
      // Check if it's a connection error
      if (updateError instanceof Error && updateError.message.includes('network')) {
        showAlert('Network error. Please check your internet connection and try again.', 'danger');
      } else if (updateError instanceof Error && updateError.message.includes('permission')) {
        showAlert('Permission denied. You may not have access to update this profile.', 'danger');
      } else if (updateError instanceof Error && updateError.message.includes('not initialized')) {
        showAlert('Supabase client not initialized. Please reload the page and try again.', 'danger');
      } else {
        const errorMsg = updateError instanceof Error ? updateError.message : JSON.stringify(updateError);
        showAlert(`Error updating profile: ${errorMsg}`, 'danger');
      }
    }
  } catch (error) {
    console.error('Error in handleProfileSubmit:', error);
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    showAlert(`Error updating profile: ${error instanceof Error ? error.message : 'Unknown error'}`, 'danger');
  } finally {
    // Reset button state
    const submitButton = document.getElementById('save-profile') as HTMLButtonElement;
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = 'Save Profile';
    }
  }
}

/**
 * Handle preferences form submission
 * @param e Form submit event
 */
async function handlePreferencesSubmit(e: Event) {
  e.preventDefault();
  
  try {
    const highlightKeywords = (document.getElementById('highlight-keywords') as HTMLInputElement).checked;
    const panelPosition = (document.getElementById('panel-position') as HTMLSelectElement).value;
    const theme = (document.getElementById('theme-select') as HTMLSelectElement).value;
    
    // Save preferences to storage
    await chrome.storage.sync.set({
      highlightKeywords,
      panelPosition,
      theme
    });
    
    showAlert('Preferences saved successfully!', 'success');
  } catch (error) {
    console.error('Error saving preferences:', error);
    showAlert('Error saving preferences. Please try again.', 'danger');
  }
}

/**
 * Handle login form submission
 * @param event The form submission event
 */
async function handleLoginSubmit(event: Event) {
  event.preventDefault();
  
  const emailInput = document.getElementById('login-email') as HTMLInputElement;
  const passwordInput = document.getElementById('login-password') as HTMLInputElement;
  const errorElement = document.getElementById('login-error');
  
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  
  if (!email || !password) {
    if (errorElement) {
      errorElement.textContent = 'Please enter both email and password.';
      errorElement.classList.remove('d-none');
    }
    return;
  }
  
  try {
    // Show loading state
    const submitButton = document.getElementById('login-submit-btn') as HTMLButtonElement;
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Logging in...';
    }
    
    // Hide previous error
    if (errorElement) {
      errorElement.classList.add('d-none');
    }
    
    const { user, error } = await supabaseService.signIn(email, password);
    
    if (error) {
      if (errorElement) {
        errorElement.textContent = `Login failed: ${error.message}`;
        errorElement.classList.remove('d-none');
      }
      return;
    }

    if (user) {
      const subscription = await supabaseService.getUserSubscription(user.id);
      await storageService.saveUserData(user, subscription);
      
      // Broadcast auth state
      broadcastAuthState(user, subscription);
      
      showAlert('Logged in successfully!', 'success');
      
      // Load user profile
      const profile = await supabaseService.getUserProfile(user.id);
      if (profile && profile.full_name) {
        (document.getElementById('full-name') as HTMLInputElement).value = profile.full_name;
      }
      
      // Load Gemini API key from Supabase
      const geminiApiKey = await supabaseService.getGeminiApiKey(user.id);
      if (geminiApiKey) {
        (document.getElementById('gemini-api-key') as HTMLInputElement).value = geminiApiKey;
      }
    }
  } catch (error) {
    console.error('Login error:', error);
    if (errorElement) {
      errorElement.textContent = `Login error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errorElement.classList.remove('d-none');
    }
  } finally {
    // Reset button state
    const submitButton = document.getElementById('login-submit-btn') as HTMLButtonElement;
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = 'Log In';
    }
  }
}

/**
 * Handle signup form submission
 * @param event The form submission event
 */
async function handleSignupSubmit(event: Event) {
  event.preventDefault();
  
  const emailInput = document.getElementById('signup-email') as HTMLInputElement;
  const passwordInput = document.getElementById('signup-password') as HTMLInputElement;
  const confirmPasswordInput = document.getElementById('signup-confirm-password') as HTMLInputElement;
  const errorElement = document.getElementById('signup-error');
  
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;
  
  if (!email || !password || !confirmPassword) {
    if (errorElement) {
      errorElement.textContent = 'Please fill in all fields.';
      errorElement.classList.remove('d-none');
    }
    return;
  }
  
  if (password !== confirmPassword) {
    if (errorElement) {
      errorElement.textContent = 'Passwords do not match.';
      errorElement.classList.remove('d-none');
    }
    return;
  }
  
  if (password.length < 6) {
    if (errorElement) {
      errorElement.textContent = 'Password must be at least 6 characters long.';
      errorElement.classList.remove('d-none');
    }
    return;
  }
  
  try {
    // Show loading state
    const submitButton = document.getElementById('signup-submit-btn') as HTMLButtonElement;
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Signing up...';
    }
    
    // Hide previous error
    if (errorElement) {
      errorElement.classList.add('d-none');
    }
    
    const { user, error } = await supabaseService.signUp(email, password);
    
    if (error) {
      if (errorElement) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errorElement.textContent = `Signup failed: ${errorMessage}`;
        errorElement.classList.remove('d-none');
      }
      return;
    }

    if (user) {
      const subscription = await supabaseService.getUserSubscription(user.id);
      await storageService.saveUserData(user, subscription);
      
      // Broadcast auth state
      broadcastAuthState(user, subscription);
      
      showAlert('Account created successfully! Please check your email for verification.', 'success');
    }
  } catch (error) {
    console.error('Signup error:', error);
    if (errorElement) {
      errorElement.textContent = `Signup error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errorElement.classList.remove('d-none');
    }
  } finally {
    // Reset button state
    const submitButton = document.getElementById('signup-submit-btn') as HTMLButtonElement;
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = 'Sign Up';
    }
  }
}

/**
 * Handle click on the logout button
 */
async function handleLogoutClick() {
  try {
    const { error } = await supabaseService.signOut();
    
    if (error) {
      showAlert(`Logout failed: ${error.message}`, 'danger');
      return;
    }

    await storageService.clearUserData();
    
    // Broadcast auth state
    broadcastAuthState(null, null);
    
    showAlert('Logged out successfully!', 'success');
    
    // Clear profile form
    (document.getElementById('full-name') as HTMLInputElement).value = '';
  } catch (error) {
    console.error('Logout error:', error);
    showAlert(`Logout error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'danger');
  }
}

/**
 * Handle click on the upgrade button
 */
async function handleUpgradeClick() {
  try {
    const { user } = await storageService.getUserData();
    
    if (!user) {
      showAlert('Please log in to upgrade.', 'warning');
      return;
    }

    const checkoutUrl = await stripeService.createCheckoutSession(user);
    
    // Open the checkout URL in a new tab
    chrome.tabs.create({ url: checkoutUrl });
  } catch (error) {
    console.error('Upgrade error:', error);
    showAlert(`Upgrade error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'danger');
  }
}

/**
 * Handle click on the manage subscription button
 */
async function handleManageSubscriptionClick() {
  try {
    const { user } = await storageService.getUserData();
    
    if (!user) {
      showAlert('Please log in to manage your subscription.', 'warning');
      return;
    }

    const portalUrl = await stripeService.createCustomerPortalSession(user);
    
    // Open the customer portal URL in a new tab
    chrome.tabs.create({ url: portalUrl });
  } catch (error) {
    console.error('Manage subscription error:', error);
    showAlert(`Manage subscription error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'danger');
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
  const accountLoggedOutSection = document.getElementById('account-logged-out');
  const accountLoggedInSection = document.getElementById('account-logged-in');
  const accountEmailElement = document.getElementById('account-email');
  const accountSubscriptionElement = document.getElementById('account-subscription');
  const freePlanSection = document.getElementById('free-plan-section');
  const premiumPlanSection = document.getElementById('premium-plan-section');

  if (authState.isLoggedIn && authState.user) {
    // User is logged in
    if (accountLoggedOutSection) accountLoggedOutSection.style.display = 'none';
    if (accountLoggedInSection) accountLoggedInSection.style.display = 'block';
    
    // Update user email
    if (accountEmailElement) accountEmailElement.textContent = authState.user.email || 'No email provided';
    
    // Update subscription status
    if (accountSubscriptionElement && authState.subscription) {
      const isPremium = authState.subscription.plan === 'premium' && authState.subscription.status === 'active';
      accountSubscriptionElement.textContent = isPremium ? 'Premium Plan' : 'Free Plan';
      
      // Show appropriate subscription section
      if (freePlanSection && premiumPlanSection) {
        freePlanSection.style.display = isPremium ? 'none' : 'block';
        premiumPlanSection.style.display = isPremium ? 'block' : 'none';
      }
    }
  } else {
    // User is logged out
    if (accountLoggedOutSection) accountLoggedOutSection.style.display = 'block';
    if (accountLoggedInSection) accountLoggedInSection.style.display = 'none';
  }
}

/**
 * Toggle password visibility for an input field
 * @param inputId The ID of the input field
 * @param buttonId The ID of the toggle button
 */
function togglePasswordVisibility(inputId: string, buttonId: string) {
  const input = document.getElementById(inputId) as HTMLInputElement;
  const button = document.getElementById(buttonId) as HTMLButtonElement;
  
  if (input.type === 'password') {
    input.type = 'text';
    button.textContent = 'Hide';
  } else {
    input.type = 'password';
    button.textContent = 'Show';
  }
}

/**
 * Show an alert message
 * @param message The message to show
 * @param type The alert type (success, danger, warning, info)
 */
function showAlert(message: string, type: 'success' | 'danger' | 'warning' | 'info') {
  // Remove any existing alerts
  const existingAlerts = document.querySelectorAll('.alert');
  existingAlerts.forEach(alert => alert.remove());
  
  // Create a new alert
  const alertElement = document.createElement('div');
  alertElement.className = `alert alert-${type} alert-dismissible fade show`;
  alertElement.role = 'alert';
  alertElement.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  
  // Insert the alert at the top of the page
  const firstChild = document.body.firstChild;
  document.body.insertBefore(alertElement, firstChild);
  
  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    alertElement.classList.remove('show');
    setTimeout(() => alertElement.remove(), 150);
  }, 5000);
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
 * Handle email confirmation from Supabase
 */
async function handleEmailConfirmation() {
  const hash = window.location.hash;
  if (hash && hash.includes('access_token')) {
    try {
      // Show loading message
      showAlert('Processing your email confirmation...', 'info');
      
      // Extract the hash parameters
      const hashParams = new URLSearchParams(hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      
      if (accessToken && refreshToken) {
        // Handle the confirmation
        const { user, error } = await supabaseService.handleEmailConfirmation(accessToken, refreshToken);
        
        if (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          showAlert(`Email confirmation failed: ${errorMessage}`, 'danger');
          return;
        }
        
        if (user) {
          // Get user subscription
          const subscription = await supabaseService.getUserSubscription(user.id);
          
          // Save user data
          await storageService.saveUserData(user, subscription);
          
          // Broadcast auth state
          broadcastAuthState(user, subscription);
          
          // Show success message
          const userEmail = user.email || 'your account';
          showAlert(`Email confirmed successfully! You are now logged in as ${userEmail}.`, 'success');
          
          // Clear the hash to avoid processing it again on refresh
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
          
          // Activate the account tab
          const accountTab = document.getElementById('account-tab');
          if (accountTab) {
            const tabInstance = new bootstrap.Tab(accountTab);
            tabInstance.show();
          }
        }
      }
    } catch (error) {
      console.error('Error handling email confirmation:', error);
      showAlert(`Error processing confirmation: ${error instanceof Error ? error.message : 'Unknown error'}`, 'danger');
    }
  }
}

// Initialize the settings page when the DOM is loaded
document.addEventListener('DOMContentLoaded', initialize); 