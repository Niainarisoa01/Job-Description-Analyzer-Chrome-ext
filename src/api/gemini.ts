import { GeminiRequest, GeminiResponse, JobAnalysis, KeywordCategory } from '../utils/types';
import storageService from '../utils/storage';

// This would be set in environment variables in a production app
// For a Chrome extension, it can be stored in the extension's storage
const GEMINI_API_KEY = 'AIzaSyASoMIdhab8J-93vce3i4nFzEo-VvfDjLs';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

class GeminiService {
  private static instance: GeminiService;

  private constructor() {}

  public static getInstance(): GeminiService {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService();
    }
    return GeminiService.instance;
  }

  /**
   * Get the Gemini API key from storage
   * @returns The API key or null if not set
   */
  private async getApiKey(): Promise<string | undefined> {
    const apiKeys = await storageService.getApiKeys();
    return apiKeys.geminiApiKey;
  }

  /**
   * Analyze a job description using Gemini AI
   * @param jobText The job description text
   * @param isPremium Whether the user has premium features
   * @returns The analysis result
   */
  async analyzeJobDescription(jobText: string, isPremium: boolean = false): Promise<JobAnalysis> {
    try {
      // Vérifier si la clé API est configurée dans le stockage
      const storedApiKey = await this.getApiKey();
      
      // Utiliser la clé stockée ou la clé par défaut
      const apiKey = storedApiKey || GEMINI_API_KEY;
      
      const prompt = this.createAnalysisPrompt(jobText, isPremium);
      const response = await this.callGeminiAPI(prompt, apiKey);
      
      return this.parseGeminiResponse(response);
    } catch (error: unknown) {
      console.error('Gemini API error:', error);
      
      // Améliorer le message d'erreur pour l'utilisateur
      if (error instanceof Error) {
        if (error.message.includes('API key not valid') || error.message.includes('INVALID_ARGUMENT')) {
          throw new Error('Your Gemini API key is invalid. Please go to Settings and update it with a valid key from Google AI Studio.');
        } else if (!error.message.includes('API key is not configured')) {
          // Si ce n'est pas déjà notre message personnalisé
          throw new Error(`Gemini API error: ${error.message}`);
        } else {
          throw error; // Rethrow our custom error
        }
      } else {
        throw new Error('Unknown error occurred while analyzing job description');
      }
    }
  }

  /**
   * Create a prompt for Gemini AI to analyze a job description
   * @param jobText The job description text
   * @param isPremium Whether to include premium features
   * @returns The prompt text
   */
  private createAnalysisPrompt(jobText: string, isPremium: boolean): string {
    const basePrompt = `
      Analyze the following job description and provide:
      1. A concise summary (max 3 sentences)
      2. Key skills mentioned (technical and soft skills)
      3. Required qualifications (education, experience, certifications)
      4. Responsibilities and duties

      Format your response as JSON with the following structure:
      {
        "summary": "Concise summary here",
        "keywordCategories": [
          {
            "name": "Technical Skills",
            "keywords": ["skill1", "skill2", ...]
          },
          {
            "name": "Soft Skills",
            "keywords": ["skill1", "skill2", ...]
          },
          {
            "name": "Qualifications",
            "keywords": ["qualification1", "qualification2", ...]
          },
          {
            "name": "Responsibilities",
            "keywords": ["responsibility1", "responsibility2", ...]
          }
        ]
      }

      Job Description:
      ${jobText}
    `;

    // Add premium features to the prompt if the user has premium
    if (isPremium) {
      return `
        ${basePrompt}
        
        Additionally, as this is a premium analysis, please also include:
        5. Company culture insights based on language and requirements
        6. Potential red flags or warning signs in the job description
        7. Salary range estimate based on responsibilities and requirements
        8. Career growth potential based on the role description
        
        Add these additional categories to the keywordCategories array:
        {
          "name": "Company Culture",
          "keywords": ["culture1", "culture2", ...]
        },
        {
          "name": "Potential Red Flags",
          "keywords": ["flag1", "flag2", ...]
        },
        {
          "name": "Career Growth",
          "keywords": ["growth1", "growth2", ...]
        }
        
        Also add a "salaryEstimate" field to the root of the JSON object with a string value.
      `;
    }

    return basePrompt;
  }

  /**
   * Call the Gemini API with a prompt
   * @param prompt The prompt text
   * @param apiKey The Gemini API key (optional, will use default if not provided)
   * @returns The API response
   */
  private async callGeminiAPI(prompt: string, apiKey?: string): Promise<GeminiResponse> {
    const request: GeminiRequest = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 1024,
      },
    };

    // Use the provided API key or fall back to the default one
    const keyToUse = apiKey || GEMINI_API_KEY;

    const response = await fetch(`${GEMINI_API_URL}?key=${keyToUse}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Parse the Gemini API response into a JobAnalysis object
   * @param response The API response
   * @returns The parsed job analysis
   */
  private parseGeminiResponse(response: GeminiResponse): JobAnalysis {
    try {
      const text = response.candidates[0].content.parts[0].text;
      
      // Extract the JSON part from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not extract JSON from Gemini response');
      }
      
      const analysisData = JSON.parse(jsonMatch[0]);
      
      return {
        summary: analysisData.summary || 'No summary available',
        keywordCategories: analysisData.keywordCategories || [],
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('Error parsing Gemini response:', error);
      throw new Error('Failed to parse AI response. Please try again.');
    }
  }
}

export default GeminiService.getInstance(); 