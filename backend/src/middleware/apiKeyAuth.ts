import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/api.types';
import { apiKeyService } from '../services/apiKey.service';

/**
 * Middleware to authenticate requests via API Key.
 * Intended for external/system-to-system integrations (like ePOS).
 * Sets req.restaurantId based on the validated key.
 */
export const authenticateApiKey = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check custom x-api-key header or standard Authorization: Bearer
    let rawKey = req.headers['x-api-key'] as string;
    
    if (!rawKey && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      rawKey = req.headers.authorization.split(' ')[1];
    }

    if (!rawKey) {
      res.status(401).json({
        success: false,
        error: 'Authentication required. Please provide an X-Api-Key header.',
      });
      return;
    }

    // Validate the key against the database
    const validationResult = await apiKeyService.validate(rawKey);

    if (!validationResult) {
      res.status(401).json({
        success: false,
        error: 'Invalid or revoked API Key.',
      });
      return;
    }

    // Attach the restaurant ID to the request object
    req.restaurantId = validationResult.restaurantId;
    
    // Add a synthetic user object to ensure compatibility with downstream
    // services or logs that might assume req.user exists
    req.user = {
      sub: validationResult.keyId,
      email: 'api-key@system',
      role: 'external_integration' as any,
      restaurantId: validationResult.restaurantId
    };

    next();
  } catch (error) {
    console.error('[API Key Auth Error]', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during API key authentication.',
    });
  }
};
