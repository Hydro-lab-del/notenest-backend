

import { rateLimit } from 'express-rate-limit';


export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  // Change the message to a JSON object
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      statusCode: 429,
      message: "Too many attempts, please try again in 15 minutes."
    });
  }
});