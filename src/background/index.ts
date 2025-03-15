import { ExtensionMessage, AnalyzeRequest, AnalyzeResponse, AuthStateMessage } from '../utils/types';
import geminiService from '../api/gemini';
import supabaseService from '../api/supabase';
import storageService from '../utils/storage';

/**
 * Initialize the background service worker
 */
async function initialize() {
  console.log('Job Description Analyzer background service worker initialized');

  // Set up message listeners
  chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
    // We need to return true to indicate we will respond asynchronously
    handleMessage(message, sender).then(sendResponse);
    return true;
  });

  // Store Supabase credentials in storage if not already set
  const apiKeys = await storageService.getApiKeys();
  if (!apiKeys.supabaseUrl || !apiKeys.supabaseAnonKey) {
    await storageService.saveApiKeys({
      ...apiKeys,
      supabaseUrl: 'https://bpuetxlloxxgtldwodeh.supabase.co',
      supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwdWV0eGxsb3h4Z3RsZHdvZGVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwNjU2NTMsImV4cCI6MjA1NzY0MTY1M30.JcKZ1Ii3Ffr-BiYmOInnvTs9CiRZzS755Kpny7SwZGs'
    });
  }

  // Initialize Supabase with the credentials
  const updatedApiKeys = await storageService.getApiKeys();
  if (updatedApiKeys.supabaseUrl && updatedApiKeys.supabaseAnonKey) {
    supabaseService.initialize(updatedApiKeys.supabaseUrl, updatedApiKeys.supabaseAnonKey);
  }

  // Check for user authentication on startup
  try {
    const user = await supabaseService.getCurrentUser();
    if (user) {
      const subscription = await supabaseService.getUserSubscription(user.id);
      await storageService.saveUserData(user, subscription);
      
      // Broadcast auth state to all extension components
      broadcastAuthState(user, subscription);
    }
  } catch (error) {
    console.error('Error checking authentication on startup:', error);
  }
}

/**
 * Handle incoming messages from other extension components
 * @param message The message to handle
 * @param sender The sender of the message
 * @returns Response to the message
 */
async function handleMessage(message: ExtensionMessage, sender: chrome.runtime.MessageSender): Promise<any> {
  console.log('Background received message:', message.action);

  switch (message.action) {
    case 'analyze':
      return handleAnalyzeRequest(message as AnalyzeRequest);
    
    case 'authState':
      // Just rebroadcast the auth state to all components
      chrome.runtime.sendMessage(message);
      return { success: true };
    
    case 'clearAnalysis':
      await storageService.clearCurrentAnalysis();
      return { success: true };
    
    case 'subscriptionUpdated':
      // Mettre à jour les données utilisateur avec le nouvel abonnement
      const { user } = await storageService.getUserData();
      if (user) {
        await storageService.saveUserData(user, message.subscription);
        
        // Diffuser le nouvel état d'authentification
        broadcastAuthState(user, message.subscription);
      }
      return { success: true };
    
    default:
      console.warn('Unknown message action:', message.action);
      return { success: false, error: 'Unknown message action' };
  }
}

/**
 * Handle a request to analyze a job description
 * @param request The analyze request
 * @returns The analysis result
 */
async function handleAnalyzeRequest(request: AnalyzeRequest): Promise<AnalyzeResponse> {
  try {
    // Check if user is premium
    const { user, subscription } = await storageService.getUserData();
    const isPremium = subscription?.plan === 'premium' && subscription?.status === 'active';

    // Analyze the job description
    const analysis = await geminiService.analyzeJobDescription(request.jobText, isPremium);
    
    // Save the analysis to storage
    await storageService.saveJobAnalysis(analysis);

    return {
      action: 'analyzeResult',
      success: true,
      analysis,
    };
  } catch (error) {
    console.error('Error analyzing job description:', error);
    return {
      action: 'analyzeResult',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Broadcast authentication state to all extension components
 * @param user The current user
 * @param subscription The user's subscription
 */
function broadcastAuthState(user: any, subscription: any) {
  const message: AuthStateMessage = {
    action: 'authState',
    isLoggedIn: !!user,
    user: user || undefined,
    subscription: subscription || undefined,
  };

  // Add error handling for message sending
  try {
    chrome.runtime.sendMessage(message, (response) => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        console.log('Error sending auth state message:', lastError.message);
        // This is expected if no receivers are listening, so we can safely ignore it
      }
    });
  } catch (error) {
    console.log('Failed to broadcast auth state:', error);
  }
}

// Initialize the background service worker
initialize(); 