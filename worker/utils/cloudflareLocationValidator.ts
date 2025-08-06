// Cloudflare Location Validator
// Uses Cloudflare's built-in location headers for accurate geolocation

export interface CloudflareLocationInfo {
  country?: string;
  state?: string;
  city?: string;
  continent?: string;
  latitude?: number;
  longitude?: number;
  isValid: boolean;
  error?: string;
}

/**
 * Extracts location information from Cloudflare headers
 * @param request - The incoming request object
 * @returns CloudflareLocationInfo with location data
 */
export function getCloudflareLocation(request: Request): CloudflareLocationInfo {
  try {
    const headers = request.headers;
    
    const country = headers.get('CF-IPCountry');
    const state = headers.get('CF-IPState');
    const city = headers.get('CF-IPCity');
    const continent = headers.get('CF-IPContinent');
    const latitude = headers.get('CF-IPLatitude');
    const longitude = headers.get('CF-IPLongitude');
    
    // If we have at least a country, consider it valid
    if (country && country !== 'XX') {
      return {
        country,
        state: state || undefined,
        city: city || undefined,
        continent: continent || undefined,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        isValid: true
      };
    }
    
    return {
      isValid: false,
      error: 'No valid location data available from Cloudflare headers'
    };
  } catch (error) {
    return {
      isValid: false,
      error: `Failed to parse Cloudflare location headers: ${error}`
    };
  }
}

/**
 * Checks if a location is within supported jurisdictions using Cloudflare data
 * @param locationInfo - Location info from Cloudflare headers
 * @param supportedStates - Array of supported state codes
 * @param supportedCountries - Array of supported country codes
 * @returns boolean indicating if location is supported
 */
export function isCloudflareLocationSupported(
  locationInfo: CloudflareLocationInfo,
  supportedStates: string[] = [],
  supportedCountries: string[] = []
): boolean {
  if (!locationInfo.isValid) {
    return false;
  }

  // If 'all' is in supported states or countries, accept everything
  if (supportedStates.includes('all') || supportedCountries.includes('all')) {
    return true;
  }

  // Check if the location's country is supported
  if (locationInfo.country && supportedCountries.includes(locationInfo.country)) {
    return true;
  }

  // Check if the location's state is supported
  if (locationInfo.state && supportedStates.includes(locationInfo.state)) {
    return true;
  }

  return false;
}

/**
 * Gets a user-friendly location description from Cloudflare data
 * @param locationInfo - Location info from Cloudflare headers
 * @returns Human-readable location string
 */
export function getLocationDescription(locationInfo: CloudflareLocationInfo): string {
  if (!locationInfo.isValid) {
    return 'Unknown location';
  }

  const parts = [];
  
  if (locationInfo.city) {
    parts.push(locationInfo.city);
  }
  
  if (locationInfo.state) {
    parts.push(locationInfo.state);
  }
  
  if (locationInfo.country) {
    parts.push(locationInfo.country);
  }
  
  return parts.length > 0 ? parts.join(', ') : 'Unknown location';
} 