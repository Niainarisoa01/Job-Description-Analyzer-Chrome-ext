import { GeminiRequest, GeminiResponse, JobAnalysis, KeywordCategory } from '../utils/types';
import storageService from '../utils/storage';

// Ne jamais stocker de clés API directement dans le code source
// Utiliser uniquement la clé stockée dans le stockage local de l'extension
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
      const apiKey = await this.getApiKey();
      
      // Vérifier si une clé API est disponible
      if (!apiKey) {
        throw new Error('API key is not configured. Please go to Settings and add your Gemini API key.');
      }
      
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
        8. Advanced skills analysis with core skills vs nice-to-have skills
        9. Emerging trends in the industry related to this role
        10. Skill gap suggestions for candidates
        
        Add these additional categories to the keywordCategories array:
        {
          "name": "Company Culture",
          "keywords": ["culture1", "culture2", ...]
        },
        {
          "name": "Potential Red Flags",
          "keywords": ["flag1", "flag2", ...]
        }
        
        Also add these fields to the root of the JSON object:
        "salaryEstimate": "A detailed salary range estimate with justification based on the job requirements, location (if mentioned), and industry standards. Include both annual and hourly estimates if applicable.",
        "advancedSkillsAnalysis": {
          "coreSkills": ["core1", "core2", ...],
          "niceToHaveSkills": ["nice1", "nice2", ...],
          "emergingTrends": ["trend1", "trend2", ...],
          "skillGapSuggestions": ["suggestion1", "suggestion2", ...]
        }
      `;
    }

    return basePrompt;
  }

  /**
   * Call the Gemini API with a prompt
   * @param prompt The prompt text
   * @param apiKey The Gemini API key
   * @returns The API response
   */
  private async callGeminiAPI(prompt: string, apiKey: string): Promise<GeminiResponse> {
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

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
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
      
      // Construire l'objet JobAnalysis avec les données de base
      const jobAnalysis: JobAnalysis = {
        summary: analysisData.summary || 'No summary available',
        keywordCategories: analysisData.keywordCategories || [],
        timestamp: Date.now(),
      };
      
      // Ajouter les fonctionnalités premium si elles sont présentes
      if (analysisData.salaryEstimate) {
        jobAnalysis.salaryEstimate = analysisData.salaryEstimate;
      }
      
      if (analysisData.advancedSkillsAnalysis) {
        jobAnalysis.advancedSkillsAnalysis = {
          coreSkills: analysisData.advancedSkillsAnalysis.coreSkills || [],
          niceToHaveSkills: analysisData.advancedSkillsAnalysis.niceToHaveSkills || [],
          emergingTrends: analysisData.advancedSkillsAnalysis.emergingTrends || [],
          skillGapSuggestions: analysisData.advancedSkillsAnalysis.skillGapSuggestions || []
        };
      }
      
      return jobAnalysis;
    } catch (error) {
      console.error('Error parsing Gemini response:', error);
      throw new Error('Failed to parse AI response. Please try again.');
    }
  }
}

export default GeminiService.getInstance(); 