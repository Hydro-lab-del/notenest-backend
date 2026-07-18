import { Router } from "express";
import {
  checkVerificationStatus,
  forgotPassword,
  loginUser,
  logoutUser,
  refreshHandler,
  registerUser,
  resendVerificationEmail,
  resetPassword,
  verifyEmail,
} from "../controllers/auth.controller.js";
import { authLimiter } from "../middlewares/rateLimiter.middleware.js";

import validate from "../middlewares/validate.middleware.js";
import { loginSchema, registerSchema } from "../controllers/auth/registerSchema.js";

const router = Router();

// Public Routes
router.route("/register").post( validate(registerSchema) ,registerUser);
router.route("/verify-email").get(verifyEmail);
router.route('/status/:userId').get(checkVerificationStatus);
router.route("/refresh").post(refreshHandler);

// Protected/Sensitive Routes (Limited)
router.route("/resend-verification").post(authLimiter, resendVerificationEmail)
router.route("/login").post(authLimiter, validate(loginSchema), loginUser);
router.route("/forgot-password").post(authLimiter, forgotPassword); 
router.route("/reset-password").post(authLimiter, resetPassword);

// Session Routes
router.route("/logout").post(logoutUser);

export default router;
