// User-related types
export interface User {
  id: string;
  email?: string;
  created_at: string;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  plan: 'free' | 'premium';
  current_period_end: string;
  cancel_at_period_end: boolean;
}

// Analysis-related types
export interface JobAnalysis {
  summary: string;
  keywordCategories: KeywordCategory[];
  timestamp: number;
  salaryEstimate?: string;
  advancedSkillsAnalysis?: AdvancedSkillsAnalysis;
}

export interface KeywordCategory {
  name: string;
  keywords: string[];
}

export interface AdvancedSkillsAnalysis {
  coreSkills: string[];
  niceToHaveSkills: string[];
  emergingTrends: string[];
  skillGapSuggestions: string[];
}

// Message types for communication between extension components
export interface AnalyzeRequest {
  action: 'analyze';
  jobText: string;
}

export interface AnalyzeResponse {
  action: 'analyzeResult';
  success: boolean;
  analysis?: JobAnalysis;
  error?: string;
}

export interface AuthStateMessage {
  action: 'authState';
  isLoggedIn: boolean;
  user?: User;
  subscription?: UserSubscription | null;
}

export interface ClearAnalysisMessage {
  action: 'clearAnalysis';
}

export interface ExtractJobDescriptionMessage {
  action: 'extractJobDescription';
}

export interface SubscriptionUpdatedMessage {
  action: 'subscriptionUpdated';
  subscription: UserSubscription;
}

export type ExtensionMessage = 
  | AnalyzeRequest
  | AnalyzeResponse
  | AuthStateMessage
  | ClearAnalysisMessage
  | ExtractJobDescriptionMessage
  | SubscriptionUpdatedMessage;

// Gemini API types
export interface GeminiRequest {
  contents: {
    parts: {
      text: string;
    }[];
  }[];
  generationConfig: {
    temperature: number;
    topP: number;
    topK: number;
    maxOutputTokens: number;
  };
}

export interface GeminiResponse {
  candidates: {
    content: {
      parts: {
        text: string;
      }[];
    };
  }[];
} 