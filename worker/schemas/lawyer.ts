// Lawyer search and profile type definitions

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
