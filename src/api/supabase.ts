import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User, UserSubscription, JobAnalysis } from '../utils/types';

// These would be set in environment variables in a production app
// For a Chrome extension, they can be stored in the extension's storage
const SUPABASE_URL = 'https://bpuetxlloxxgtldwodeh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwdWV0eGxsb3h4Z3RsZHdvZGVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwNjU2NTMsImV4cCI6MjA1NzY0MTY1M30.JcKZ1Ii3Ffr-BiYmOInnvTs9CiRZzS755Kpny7SwZGs';

// Bootstrap is loaded from the HTML file, but we need to declare it for TypeScript
declare const bootstrap: any;

class SupabaseService {
  private supabase: SupabaseClient | null = null;
  private supabaseUrl: string | null = null;
  private supabaseAnonKey: string | null = null;
  private static instance: SupabaseService;
  private currentUrl: string = SUPABASE_URL;
  private currentKey: string = SUPABASE_ANON_KEY;

  private constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  public static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }

  /**
   * Initialize Supabase with stored credentials
   * @param url Supabase URL
   * @param anonKey Supabase anon key
   */
  initialize(url: string, anonKey: string) {
    if (!this.supabase || url !== this.supabaseUrl || anonKey !== this.supabaseAnonKey) {
      this.supabaseUrl = url;
      this.supabaseAnonKey = anonKey;
      
      // Dynamically import Supabase client
      import('@supabase/supabase-js').then(({ createClient }) => {
        this.supabase = createClient(url, anonKey, {
          auth: {
            // Disable auto refresh token to avoid issues with Chrome extension
            autoRefreshToken: false
          }
        });
        
        // Set up auth state change listener
        this.setupAuthListener();
      });
    }
  }

  /**
   * Set up auth state change listener
   */
  private setupAuthListener() {
    if (!this.supabase) return;
    
    this.supabase.auth.onAuthStateChange(async (event: string, session: any) => {
      console.log('Auth state changed:', event);
      
      // Handle auth events
      if (event === 'SIGNED_IN' && session?.user) {
        // Get user subscription
        const subscription = await this.getUserSubscription(session.user.id);
        
        // Save user data to storage
        await chrome.storage.local.set({
          user: session.user,
          subscription
        });
        
        // Broadcast auth state
        chrome.runtime.sendMessage({
          action: 'authState',
          isLoggedIn: true,
          user: session.user,
          subscription
        });
      } else if (event === 'SIGNED_OUT') {
        // Clear user data from storage
        await chrome.storage.local.remove(['user', 'subscription']);
        
        // Broadcast auth state
        chrome.runtime.sendMessage({
          action: 'authState',
          isLoggedIn: false
        });
      }
    });
  }

  /**
   * Handle email confirmation for Chrome extension
   * This should be called when the extension is loaded to check for confirmation parameters
   */
  public async handleEmailConfirmation(accessToken: string, refreshToken: string) {
    if (!this.supabase) {
      return { user: null, error: new Error('Supabase not initialized') };
    }
    
    try {
      // Set the session manually
      const { data, error } = await this.supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });
      
      if (error) {
        console.error('Error setting session:', error);
        return { user: null, error };
      }
      
      console.log('Session set successfully');
      return { user: data?.user || null, error: null };
    } catch (error) {
      console.error('Error handling email confirmation:', error);
      return { user: null, error };
    }
  }

  /**
   * Sign up a new user
   * @param email User email
   * @param password User password
   * @returns The user object and any error
   */
  async signUp(email: string, password: string) {
    if (!this.supabase) {
      return { user: null, error: new Error('Supabase not initialized') };
    }

    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          // Set the redirect URL to the extension's settings page
          emailRedirectTo: chrome.runtime.getURL('settings.html')
        }
      });

      if (error) {
        return { user: null, error };
      }

      // A trigger will automatically create a profile, free subscription, and empty API key record
      
      return { user: data.user, error: null };
    } catch (error) {
      console.error('Error signing up:', error);
      return { user: null, error };
    }
  }

  /**
   * Sign in an existing user
   * @param email User email
   * @param password User password
   * @returns User object or error
   */
  async signIn(email: string, password: string): Promise<{ user: User | null; error: Error | null }> {
    if (!this.supabase) {
      return { user: null, error: new Error('Supabase not initialized') };
    }

    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { user: data.user as User, error };
  }

  /**
   * Sign out the current user
   * @returns Error if any
   */
  async signOut(): Promise<{ error: Error | null }> {
    if (!this.supabase) {
      return { error: new Error('Supabase not initialized') };
    }

    const { error } = await this.supabase.auth.signOut();
    return { error };
  }

  /**
   * Get the current user
   * @returns User object or null
   */
  async getCurrentUser(): Promise<User | null> {
    if (!this.supabase) {
      return null;
    }

    const { data } = await this.supabase.auth.getUser();
    return data.user as User;
  }

  /**
   * Get user profile
   * @param userId User ID
   * @returns User profile or null
   */
  async getUserProfile(userId: string): Promise<any | null> {
    if (!this.supabase) {
      return null;
    }

    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }

  /**
   * Update user profile
   * @param userId User ID
   * @param profile Profile data to update
   * @returns Updated profile or error
   */
  async updateUserProfile(userId: string, profile: { full_name?: string; avatar_url?: string }): Promise<any> {
    if (!this.supabase) {
      console.error('Supabase client is null in updateUserProfile');
      throw new Error('Supabase not initialized');
    }

    try {
      console.log('Updating profile for user:', userId);
      console.log('Profile data:', profile);
      console.log('Supabase URL:', this.supabaseUrl);
      console.log('Supabase client initialized:', !!this.supabase);
      
      // First check if the profile exists
      console.log('Checking if profile exists...');
      try {
        const { data: existingProfile, error: fetchError } = await this.supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (fetchError) {
          console.error('Error fetching existing profile:', fetchError);
          console.error('Error details:', JSON.stringify(fetchError, null, 2));
          
          // If the profile doesn't exist, create it
          if (fetchError.code === 'PGRST116') { // PostgreSQL error for no rows returned
            console.log('Profile not found, creating new profile');
            try {
              const { data: newProfile, error: insertError } = await this.supabase
                .from('profiles')
                .insert({
                  id: userId,
                  ...profile,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .select()
                .single();
              
              if (insertError) {
                console.error('Error creating profile:', insertError);
                console.error('Insert error details:', JSON.stringify(insertError, null, 2));
                throw insertError;
              }
              
              console.log('New profile created successfully:', newProfile);
              return newProfile;
            } catch (insertCatchError) {
              console.error('Exception during profile creation:', insertCatchError);
              throw insertCatchError;
            }
          } else {
            throw fetchError;
          }
        }
        
        // If profile exists, update it
        console.log('Existing profile found, updating:', existingProfile);
        try {
          const { data, error } = await this.supabase
            .from('profiles')
            .update({
              ...profile,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId)
            .select()
            .single();

          if (error) {
            console.error('Error updating profile:', error);
            console.error('Update error details:', JSON.stringify(error, null, 2));
            throw error;
          }

          console.log('Profile updated successfully:', data);
          return data;
        } catch (updateCatchError) {
          console.error('Exception during profile update:', updateCatchError);
          throw updateCatchError;
        }
      } catch (dbOperationError) {
        console.error('Database operation error:', dbOperationError);
        throw dbOperationError;
      }
    } catch (error) {
      console.error('Exception in updateUserProfile:', error);
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      } else {
        console.error('Unknown error type:', typeof error);
      }
      throw error;
    }
  }

  /**
   * Get user subscription
   * @param userId User ID
   * @returns Subscription object or null
   */
  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    if (!this.supabase) {
      return null;
    }

    const { data, error } = await this.supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      user_id: data.user_id,
      status: data.status,
      plan: data.plan,
      current_period_end: data.current_period_end,
    } as UserSubscription;
  }

  /**
   * Update user subscription
   * @param subscriptionId Subscription ID
   * @param status Subscription status
   * @param plan Subscription plan
   * @param endDate Subscription end date
   */
  async updateUserSubscription(
    subscriptionId: string, 
    status: string, 
    plan: string, 
    endDate: string,
    stripeData?: { customerId?: string; subscriptionId?: string }
  ): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase not initialized');
    }

    await this.supabase
      .from('subscriptions')
      .update({
        status,
        plan,
        current_period_end: endDate,
        updated_at: new Date().toISOString(),
        ...(stripeData?.customerId && { stripe_customer_id: stripeData.customerId }),
        ...(stripeData?.subscriptionId && { stripe_subscription_id: stripeData.subscriptionId }),
      })
      .eq('id', subscriptionId);
  }

  /**
   * Save Gemini API key
   * @param userId User ID
   * @param apiKey Gemini API key
   */
  async saveGeminiApiKey(userId: string, apiKey: string): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase not initialized');
    }

    await this.supabase
      .from('api_keys')
      .update({
        gemini_api_key: apiKey,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
  }

  /**
   * Get Gemini API key
   * @param userId User ID
   * @returns API key or null
   */
  async getGeminiApiKey(userId: string): Promise<string | null> {
    if (!this.supabase) {
      return null;
    }

    const { data, error } = await this.supabase
      .from('api_keys')
      .select('gemini_api_key')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return data.gemini_api_key;
  }

  /**
   * Save job analysis
   * @param userId User ID
   * @param analysis Job analysis data
   * @param metadata Optional metadata about the job
   */
  async saveJobAnalysis(
    userId: string, 
    analysis: JobAnalysis, 
    metadata?: { jobTitle?: string; companyName?: string; url?: string }
  ): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase not initialized');
    }

    await this.supabase
      .from('job_analyses')
      .insert({
        user_id: userId,
        summary: analysis.summary,
        keyword_categories: analysis.keywordCategories,
        job_title: metadata?.jobTitle || null,
        company_name: metadata?.companyName || null,
        url: metadata?.url || null,
      });
  }

  /**
   * Get job analyses for a user
   * @param userId User ID
   * @param limit Number of analyses to return (default 10)
   * @returns Array of job analyses
   */
  async getJobAnalyses(userId: string, limit: number = 10): Promise<any[]> {
    if (!this.supabase) {
      return [];
    }

    const { data, error } = await this.supabase
      .from('job_analyses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return data;
  }

  /**
   * Delete a job analysis
   * @param analysisId Analysis ID
   */
  async deleteJobAnalysis(analysisId: string): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase not initialized');
    }

    await this.supabase
      .from('job_analyses')
      .delete()
      .eq('id', analysisId);
  }

  /**
   * Check if the profiles table exists and create it if it doesn't
   * This is a utility method to help diagnose and fix profile update issues
   */
  async checkAndCreateProfilesTable(): Promise<void> {
    if (!this.supabase) {
      console.error('Supabase client is null in checkAndCreateProfilesTable');
      throw new Error('Supabase not initialized');
    }

    try {
      console.log('Checking if profiles table exists...');
      
      // First, try to query the profiles table
      const { data, error } = await this.supabase
        .from('profiles')
        .select('count(*)')
        .limit(1);
        
      if (error) {
        console.error('Error checking profiles table:', error);
        
        // If the table doesn't exist, try to create it
        if (error.code === '42P01') { // PostgreSQL error for undefined_table
          console.log('Profiles table does not exist, creating it...');
          
          // Create the profiles table using SQL
          const { error: createError } = await this.supabase.rpc('create_profiles_table');
          
          if (createError) {
            console.error('Error creating profiles table:', createError);
            throw createError;
          }
          
          console.log('Profiles table created successfully');
        } else {
          throw error;
        }
      } else {
        console.log('Profiles table exists, count result:', data);
      }
    } catch (error) {
      console.error('Exception in checkAndCreateProfilesTable:', error);
      throw error;
    }
  }

  /**
   * Direct insert of a profile
   * @param userId User ID
   * @param profile Profile data to insert
   * @returns Inserted profile or error
   */
  async directInsertProfile(userId: string, profile: { full_name?: string; avatar_url?: string }): Promise<any> {
    if (!this.supabase) {
      console.error('Supabase client is null in directInsertProfile');
      throw new Error('Supabase not initialized');
    }

    try {
      console.log('Attempting direct profile insert...');
      const { data, error } = await this.supabase
        .from('profiles')
        .insert({
          id: userId,
          ...profile,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();
        
      if (error) {
        console.error('Error inserting profile:', error);
        throw error;
      }
      
      console.log('Profile inserted successfully:', data);
      return { data, error: null };
    } catch (error) {
      console.error('Exception in directInsertProfile:', error);
      return { data: null, error };
    }
  }

  /**
   * Upsert profile using RPC
   * @param userId User ID
   * @param fullName User's full name
   * @returns Success or error
   */
  async upsertProfileViaRPC(userId: string, fullName: string): Promise<any> {
    if (!this.supabase) {
      console.error('Supabase client is null in upsertProfileViaRPC');
      throw new Error('Supabase not initialized');
    }

    try {
      console.log('Attempting profile upsert via RPC...');
      const { data, error } = await this.supabase.rpc('upsert_profile', { 
        p_user_id: userId,
        p_full_name: fullName
      });
      
      if (error) {
        console.error('Error upserting profile via RPC:', error);
        throw error;
      }
      
      console.log('Profile upserted successfully via RPC:', data);
      return { success: true, error: null };
    } catch (error) {
      console.error('Exception in upsertProfileViaRPC:', error);
      return { success: false, error };
    }
  }
}

export default SupabaseService.getInstance(); 