import { forbidden } from '../utils/apiResponse.js';

export const requireEmailVerified = (req, res, next) => {
  if (!req.user?.emailVerified) {
    return forbidden(res, 'Please verify your email before accessing this feature.');
  }
  next();
};
