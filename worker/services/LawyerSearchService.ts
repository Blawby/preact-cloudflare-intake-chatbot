import { Logger } from '../utils/logger';
import { QuotaExceededError, LawyerSearchError, LawyerSearchTimeoutError } from '../utils/lawyerSearchErrors';

export interface LawyerProfile {
  id: string;
  name: string;
  firm?: string;
  location: string;
  practiceAreas: string[];
  rating?: number;
  reviewCount?: number;
  phone?: string;
  email?: string;
  website?: string;
  bio?: string;
  experience?: string;
  languages?: string[];
  consultationFee?: number;
  availability?: string;
}

export interface LawyerSearchParams {
  state?: string;
  city?: string;
  practiceArea?: string;
  zipCode?: string;
  radius?: number;
  limit?: number;
}

export interface LawyerSearchResponse {
  lawyers: LawyerProfile[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export class LawyerSearchService {
  private static readonly BASE_URL = 'https://search.blawby.com';
  private static readonly DEFAULT_LIMIT = 10;
  private static readonly DEFAULT_RADIUS = 25; // miles

  /**
   * Search for lawyers based on criteria
   */
  static async searchLawyers(
    params: LawyerSearchParams,
    apiKey: string
  ): Promise<LawyerSearchResponse> {
    // Validate API key before making any network calls
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      throw new Error('Invalid API key: API key is required and must be a non-empty string');
    }

    try {
      Logger.debug('[LawyerSearchService] Searching lawyers with params:', params);

      // Build query parameters
      const queryParams = new URLSearchParams();
      
      if (params.state) queryParams.append('state', params.state);
      if (params.city) queryParams.append('city', params.city);
      if (params.practiceArea) queryParams.append('practiceArea', params.practiceArea);
      if (params.zipCode) queryParams.append('zipCode', params.zipCode);
      if (params.radius) queryParams.append('radius', params.radius.toString());
      
      const limit = params.limit || this.DEFAULT_LIMIT;
      queryParams.append('limit', limit.toString());

      const url = `${this.BASE_URL}/lawyers?${queryParams.toString()}`;
      
      Logger.debug('[LawyerSearchService] Making request to:', url);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Blawby-AI-Chatbot/1.0'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        Logger.error('[LawyerSearchService] API request failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        
        // Handle quota exceeded with friendly error
        if (response.status === 401) {
          try {
            const errorData = JSON.parse(errorText);
            if (errorData.error?.includes('quota exceeded') || errorData.error?.includes('Daily quota')) {
              throw new QuotaExceededError('Our lawyer search service is temporarily busy right now. Don\'t worry - this happens sometimes when lots of people are looking for legal help!');
            }
          } catch (parseError) {
            // If we can't parse the error, still check for quota-related text
            if (errorText.includes('quota exceeded') || errorText.includes('Daily quota')) {
              throw new QuotaExceededError('Our lawyer search service is temporarily busy right now. Don\'t worry - this happens sometimes when lots of people are looking for legal help!');
            }
          }
        }
        
        throw new LawyerSearchError(`Lawyer search service is temporarily unavailable. Please try again in a few minutes.`, response.status);
      }

      const data = await response.json() as any;
      Logger.debug('[LawyerSearchService] API response:', data);

      // Transform the response to match our interface
      const lawyers: LawyerProfile[] = (data.lawyers || []).map(this.mapToLawyerProfile.bind(this));

      const result: LawyerSearchResponse = {
        lawyers,
        total: data.total || lawyers.length,
        page: data.page || 1,
        limit: data.limit || limit,
        hasMore: data.has_more || data.hasMore || false
      };

      Logger.info('[LawyerSearchService] Search completed successfully:', {
        lawyersFound: lawyers.length,
        total: result.total
      });

      return result;

    } catch (error) {
      Logger.error('[LawyerSearchService] Search failed:', error);
      
      if (error.name === 'AbortError') {
        throw new LawyerSearchTimeoutError('Our lawyer search is taking longer than expected. This sometimes happens when the service is busy.');
      }
      
      // Re-throw our custom errors
      if (error instanceof QuotaExceededError || error instanceof LawyerSearchError || error instanceof LawyerSearchTimeoutError) {
        throw error;
      }
      
      throw new LawyerSearchError('We\'re having trouble connecting to our lawyer search service right now. Please try again in a few minutes.');
    }
  }

  /**
   * Search for lawyers by matter type (maps to practice areas)
   */
  static async searchLawyersByMatterType(
    matterType: string,
    apiKey: string,
    location?: string
  ): Promise<LawyerSearchResponse> {
    const params: LawyerSearchParams = {
      practiceArea: this.mapMatterTypeToPracticeArea(matterType),
      limit: this.DEFAULT_LIMIT
    };

    // Parse location if provided
    if (location) {
      const locationParts = location.split(',').map(part => part.trim());
      if (locationParts.length >= 2) {
        params.state = locationParts[locationParts.length - 1];
        params.city = locationParts[0];
      } else {
        params.state = locationParts[0];
      }
    }

    return this.searchLawyers(params, apiKey);
  }

  /**
   * Map our matter types to lawyer search practice areas
   */
  private static mapMatterTypeToPracticeArea(matterType: string): string {
    const mapping: Record<string, string> = {
      'Family Law': 'Family Law',
      'Employment Law': 'Employment Law',
      'Landlord/Tenant': 'Real Estate Law',
      'Personal Injury': 'Personal Injury',
      'Business Law': 'Business Law',
      'Criminal Law': 'Criminal Law',
      'Civil Law': 'Civil Law',
      'Contract Review': 'Business Law',
      'Property Law': 'Real Estate Law',
      'Administrative Law': 'Administrative Law',
      'General Consultation': 'General Practice'
    };

    return mapping[matterType] || 'General Practice';
  }

  /**
   * Transform raw lawyer data to LawyerProfile interface with fallback mapping
   */
  private static mapToLawyerProfile(raw: any): LawyerProfile {
    return {
      id: raw.id || raw.lawyer_id,
      name: raw.name || raw.full_name,
      firm: raw.firm || raw.law_firm,
      location: raw.location || `${raw.city}, ${raw.state}`,
      practiceAreas: raw.practice_areas || raw.specialties || [],
      rating: raw.rating || raw.avg_rating,
      reviewCount: raw.review_count || raw.total_reviews,
      phone: raw.phone || raw.phone_number,
      email: raw.email || raw.email_address,
      website: raw.website || raw.firm_website,
      bio: raw.bio || raw.description,
      experience: raw.experience || raw.years_experience,
      languages: raw.languages || raw.spoken_languages,
      consultationFee: raw.consultation_fee || raw.hourly_rate,
      availability: raw.availability || raw.next_available
    };
  }

  /**
   * Get lawyer details by ID
   */
  static async getLawyerById(
    lawyerId: string,
    apiKey: string
  ): Promise<LawyerProfile | null> {
    // Validate API key before making any network calls
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      throw new Error('Invalid API key: API key is required and must be a non-empty string');
    }

    try {
      Logger.debug('[LawyerSearchService] Getting lawyer by ID:', lawyerId);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`${this.BASE_URL}/lawyers/${lawyerId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Blawby-AI-Chatbot/1.0'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          Logger.warn('[LawyerSearchService] Lawyer not found:', lawyerId);
          return null;
        }
        
        const errorText = await response.text();
        Logger.error('[LawyerSearchService] API request failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        
        throw new Error(`Lawyer details API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;
      Logger.debug('[LawyerSearchService] Lawyer details response:', data);

      // Transform the response
      const lawyer: LawyerProfile = this.mapToLawyerProfile(data);

      return lawyer;

    } catch (error) {
      Logger.error('[LawyerSearchService] Get lawyer by ID failed:', error);
      
      if (error.name === 'AbortError') {
        throw new LawyerSearchTimeoutError('Our lawyer search is taking longer than expected. This sometimes happens when the service is busy.');
      }
      
      // Re-throw our custom errors
      if (error instanceof LawyerSearchTimeoutError) {
        throw error;
      }
      
      throw new LawyerSearchError('We\'re having trouble connecting to our lawyer search service right now. Please try again in a few minutes.');
    }
  }
}
