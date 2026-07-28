import { Request } from 'firebase-functions/v2/https';
import { Response } from 'express';

// Manual trading/update triggers are gated by a shared secret. Scheduled
// runs call buy()/sell() directly and never pass through this check.
export const requireApiKey = (request: Request, response: Response): boolean => {
  const configured = process.env.FUNCTIONS_API_KEY;
  if (!configured) {
    response.status(503).send('Endpoint disabled: FUNCTIONS_API_KEY is not configured');
    return false;
  }
  if (request.get('x-api-key') !== configured) {
    response.status(401).send('Unauthorized');
    return false;
  }
  return true;
};
