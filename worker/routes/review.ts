import type { Env } from '../types';
import { parseJsonBody } from '../utils';
import { ReviewService } from '../services/ReviewService';
import { HttpErrors, handleError, createSuccessResponse } from '../errorHandler';

export async function handleReview(request: Request, env: Env): Promise<Response> {
  if (request.method === 'GET') {
    return handleGetReviewMatters(request, env);
  } else if (request.method === 'POST') {
    return handleProcessReview(request, env);
  } else {
    throw HttpErrors.methodNotAllowed('Only GET and POST methods are allowed');
  }
}

async function handleGetReviewMatters(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url);
    const teamId = url.searchParams.get('teamId');

    if (!teamId) {
      throw HttpErrors.badRequest('Team ID is required');
    }

    const reviewService = new ReviewService(env);
    const matters = await reviewService.getReviewMatters(teamId);
    const stats = await reviewService.getReviewStats(teamId);

    return createSuccessResponse({
      matters,
      stats
    });
  } catch (error) {
    return handleError(error);
  }
}

async function handleProcessReview(request: Request, env: Env): Promise<Response> {
  try {
    const body = await parseJsonBody(request);
    const { matterId, action, notes } = body;

    if (!matterId) {
      throw HttpErrors.badRequest('Matter ID is required');
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      throw HttpErrors.badRequest('Action must be "approve" or "reject"');
    }

    const reviewService = new ReviewService(env);
    const success = await reviewService.processReview(matterId, action, notes);

    if (!success) {
      throw HttpErrors.internalServerError('Failed to process review');
    }

    return createSuccessResponse({
      success: true,
      message: `Matter ${action}ed successfully`
    });
  } catch (error) {
    return handleError(error);
  }
} 