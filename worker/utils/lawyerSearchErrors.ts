/**
 * Custom error types for lawyer search functionality
 */

export class QuotaExceededError extends Error {
  constructor(message: string = 'Lawyer search service is temporarily busy') {
    super(message);
    this.name = 'QuotaExceededError';
  }
}

export class LawyerSearchError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'LawyerSearchError';
  }
}

export class LawyerSearchTimeoutError extends Error {
  constructor(message: string = 'Lawyer search is taking longer than expected') {
    super(message);
    this.name = 'LawyerSearchTimeoutError';
  }
}
