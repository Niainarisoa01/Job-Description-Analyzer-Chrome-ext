import { JobAnalysis, User, UserSubscription } from './types';

/**
 * Utility class for Chrome extension storage operations
 */
class StorageService {
  private static instance: StorageService;

  private constructor() {}

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * Save API keys to storage
   * @param keys Object containing API keys
   */
  async saveApiKeys(keys: { geminiApiKey?: string; supabaseUrl?: string; supabaseAnonKey?: string }): Promise<void> {
    await chrome.storage.local.set({
      apiKeys: keys,
    });
  }

  /**
   * Get API keys from storage
   * @returns Object containing API keys
   */
  async getApiKeys(): Promise<{ geminiApiKey?: string; supabaseUrl?: string; supabaseAnonKey?: string }> {
    const data = await chrome.storage.local.get('apiKeys');
    return data.apiKeys || {};
  }

  /**
   * Save user data to storage
   * @param user User object
   * @param subscription User subscription object
   */
  async saveUserData(user: User | null, subscription: UserSubscription | null): Promise<void> {
    await chrome.storage.local.set({
      user,
      subscription,
    });
  }

  /**
   * Get user data from storage
   * @returns Object containing user and subscription
   */
  async getUserData(): Promise<{ user: User | null; subscription: UserSubscription | null }> {
    const data = await chrome.storage.local.get(['user', 'subscription']);
    return {
      user: data.user || null,
      subscription: data.subscription || null,
    };
  }

  /**
   * Save job analysis to storage
   * @param analysis Job analysis object
   */
  async saveJobAnalysis(analysis: JobAnalysis): Promise<void> {
    // Get existing analyses
    const data = await chrome.storage.local.get('analyses');
    const analyses = data.analyses || [];

    // Add new analysis to the beginning of the array (most recent first)
    analyses.unshift(analysis);

    // Keep only the 10 most recent analyses
    const recentAnalyses = analyses.slice(0, 10);

    await chrome.storage.local.set({
      analyses: recentAnalyses,
      currentAnalysis: analysis,
    });
  }

  /**
   * Get current job analysis from storage
   * @returns Current job analysis
   */
  async getCurrentAnalysis(): Promise<JobAnalysis | null> {
    const data = await chrome.storage.local.get('currentAnalysis');
    return data.currentAnalysis || null;
  }

  /**
   * Get recent job analyses from storage
   * @returns Array of recent job analyses
   */
  async getRecentAnalyses(): Promise<JobAnalysis[]> {
    const data = await chrome.storage.local.get('analyses');
    return data.analyses || [];
  }

  /**
   * Clear current job analysis from storage
   */
  async clearCurrentAnalysis(): Promise<void> {
    await chrome.storage.local.remove('currentAnalysis');
  }

  /**
   * Clear all user data from storage (for logout)
   */
  async clearUserData(): Promise<void> {
    await chrome.storage.local.remove(['user', 'subscription']);
  }
}

export default StorageService.getInstance(); 