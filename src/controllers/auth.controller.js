import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
// import { registerSchema, loginSchema } from "./auth/registerSchema.js";
import { sendEmail } from "../utils/email.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";

// ----------------------------
const isProd = process.env.NODE_ENV === "production";

const options = {
  httpOnly: true,
  secure: isProd,
  sameSite: "lax",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};
// ----------------------------
function getAppUrl() {
  return process.env.APP_URL || `http://localhost:${process.env.PORT}`;
}

const registerUser = asyncHandler(async (req, res) => {

  const { name, email, password } = req.body;

  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new ApiError(
      409,
      "Email is already in use, Please try with different email.",
    );
  }

  const newlyCreatedUser = await User.create({
    name,
    email: normalizedEmail,
    password,
    role: "user",
    isEmailVerified: false,
    twoFactorEnabled: false,
  });

  const verifyToken = await newlyCreatedUser.generateTemporaryToken();

  const verifyUrl = `${getAppUrl()}/verify-email?token=${verifyToken}`;

  await sendEmail(
    newlyCreatedUser.email,
    "Verify Your NoteNest Account",
    `
    <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; background-color: #f9fafb; padding: 40px 20px; color: #111827;">
      <div style="margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); text-align: center; max-width: 500px;">
          <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 16px; color: #000;">Verify your email</h1>
          <p style="font-size: 16px; color: #4b5563; margin-bottom: 32px; line-height: 1.5;">Welcome to NoteNest! Please confirm your email address to get started.</p>
          <a href="${verifyUrl}" style="display: inline-block; padding: 12px 32px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; letter-spacing: 0.5px;">Verify Email</a>
          <p style="font-size: 14px; color: #9ca3af; margin-top: 32px; margin-bottom: 0;">This link will expire in 15 minutes.</p>
          <p style="font-size: 12px; color: #9ca3af; margin-top: 8px;">If you didn't create an account, you can safely ignore this email.</p>
      </div>
    </div>
    `
  );

  const user = {
    id: newlyCreatedUser.id,
    email: newlyCreatedUser.email,
    role: newlyCreatedUser.role,
    isEmailVerified: newlyCreatedUser.isEmailVerified,
  };

  return res
    .status(201)
    .json(new ApiResponse(201, { user }, "User Registered!"));
});

const resendVerificationEmail = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found!")
  }

  if (user.isEmailVerified) {
    throw new ApiError(400, "Email is already verified")
  }
  const verifyToken = await user.generateTemporaryToken();

  const verifyUrl = `${getAppUrl()}/verify-email?token=${verifyToken}`;

  await sendEmail(
    user.email,
    "Verify Your NoteNest Account",
    `
    <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; background-color: #f9fafb; padding: 40px 20px; color: #111827;">
      <div style="margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); text-align: center; max-width: 500px;">
          <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 16px; color: #000;">Verify your email</h1>
          <p style="font-size: 16px; color: #4b5563; margin-bottom: 32px; line-height: 1.5;">Welcome to NoteNest! Please confirm your email address to get started.</p>
          <a href="${verifyUrl}" style="display: inline-block; padding: 12px 32px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; letter-spacing: 0.5px;">Verify Email</a>
          <p style="font-size: 14px; color: #9ca3af; margin-top: 32px; margin-bottom: 0;">This link will expire in 15 minutes.</p>
          <p style="font-size: 12px; color: #9ca3af; margin-top: 8px;">If you didn't create an account, you can safely ignore this email.</p>
      </div>
    </div>
    `
  );

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "New verification link sent!"));


});

const verifyEmail = asyncHandler(async (req, res) => {
  const token = req.query.token;
  if (!token) {
    throw new ApiError(
      400,
      "Invalid request: verification token is missing or empty",
    );
  }

  const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

  const user = await User.findById(payload.id);
  if (!user) {
    throw new ApiError(404, "User not found!");
  }
  if (user.isEmailVerified) {
    throw new ApiError(400, "Email address has already been verified.");
  }
  user.isEmailVerified = true;
  await user.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isEmailVerified: true },
        "Email successfully verified. You can now log in.",
      ),
    );
});

const checkVerificationStatus = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  res.status(200).json({
    success: true,
    isVerified: user.isEmailVerified // Send just the true/false
  });
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password, twoFactorCode } = req.body;
  const normalizedEmail = email.toLocaleLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    throw new ApiError(400, "Invalid email or password!");
  }

  const isPasswordCorrect = await user.isPasswordCorrect(password);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid Password!");
  }

  if (!user.isEmailVerified) {
    throw new ApiError(403, "Please verify your email before logging in", {
      userId: user._id,
      email: user.email,
    });
  }

  if (user.twoFactorEnabled) {
    if (!twoFactorCode || typeof twoFactorCode !== "string") {
      throw new ApiError(400, "Two Factor code is required!");
    }
    if (!user.twoFactorSecret) {
      throw new ApiError(400, "Two Factor misconfiguration for this account");
    }

    const isValidCode = authenticator.check(
      twoFactorCode,
      user.twoFactorSecret,
    );

    if (!isValidCode) {
      throw new ApiError(400, "Invalid two factor code!");
    }
  }

  const accessToken = await user.generateAccessToken(
    user.role,
    user.tokenVersion,
  );
  const refreshToken = await user.generateRefreshToken(user.tokenVersion);

  const loggedInUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    twoFactorEnabled: user.twoFactorEnabled,
    createdAt: user.createdAt,
  };
  res.cookie("refreshToken", refreshToken, options);
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { accessToken, loggedInUser },
        "Login successfully done!",
      ),
    );
});

// verify JWT Token '//
function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
}

const refreshHandler = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;

  if (!token) {
    throw new ApiError(401, "Refresh Token missing!");
  }

  const payload = verifyRefreshToken(token);

  const user = await User.findById(payload.id);

  if (!user) {
    throw new ApiError(404, "User not found!");
  }

  if (user.tokenVersion !== payload.tokenVersion) {
    throw new ApiError(401, "Refresh Token Invalid!");
  }

  const newAccessToken = await user.generateAccessToken(
    user.role,
    user.tokenVersion,
  );
  const newRefreshToken = await user.generateRefreshToken(user.tokenVersion);

  const user2 = {
    id: user.id,
    email: user.email,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    twoFactorEnabled: user.twoFactorEnabled,
  };

  res.cookie("refreshToken", newRefreshToken, options);
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { accessToken: newAccessToken, user: user2 },
        "Token refresehed",
      ),
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  // 1. Manually check for a token if you want to increment version
  // We check cookies directly instead of relying on the middleware
  const refreshToken = req.cookies?.refreshToken;

  if (refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
      const user = await User.findById(decoded._id);
      if (user) {
        user.tokenVersion += 1; // Invalidate all existing tokens
        await user.save();
      }
    } catch (error) {
      // If token is invalid/expired, we don't care! 
      // We just proceed to clear the cookies anyway.
      console.log("Token already invalid, skipping version increment.");
    }
  }

  // 2. Clear Cookies (Notice your screenshot shows 'Expires: 1970' - that means it's working!)
  const { maxAge, ...clearOptions } = options;

  res.clearCookie("accessToken", clearOptions);
  res.clearCookie("refreshToken", clearOptions);

  return res.status(200).json(new ApiResponse(200, {}, "Logged out"));
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body || {};
  if (!email) {
    throw new ApiError(400, "Email is required!");
  }

  const normalizedEmail = email.toLocaleLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          "IF an account with email exists, you will recieve a reset link",
        ),
      );
  };

  const resetToken = await user.generatePasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${getAppUrl()}/auth/reset-password?token=${resetToken}`;

  await sendEmail(
    user.email,
    "Reset your NoteNest Password",
    `
    <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; background-color: #f9fafb; padding: 40px 20px; color: #111827;">
      <div style="margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); text-align: center; max-width: 500px;">
          <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 16px; color: #000;">Reset your password</h1>
          <p style="font-size: 16px; color: #4b5563; margin-bottom: 32px; line-height: 1.5;">We received a request to reset your NoteNest password. Click the button below to choose a new one.</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 32px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; letter-spacing: 0.5px;">Reset Password</a>
          <p style="font-size: 14px; color: #9ca3af; margin-top: 32px; margin-bottom: 0;">This link will expire in 15 minutes.</p>
          <p style="font-size: 12px; color: #9ca3af; margin-top: 8px;">If you didn't request a password reset, you can safely ignore this email.</p>
      </div>
    </div>
    `
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "If an account with email exists, we will send you a reset link!",
      ),
    );
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body || {};

  if (!token) {
    throw new ApiError(400, "Reset Token is missing!");
  }

  // Suggested Production Standard
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

  if (!password || !passwordRegex.test(password)) {
    throw new ApiError(
      400,
      "Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, and one number.",
    );
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    resetPasswordToken: tokenHash,
    resetPasswordExpire: { $gt: new Date() },
  });

  // CRITICAL: Check if user exists before modifying
  if (!user) {
    throw new ApiError(400, "Token is invalid or has expired.");
  }

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  user.tokenVersion = user.tokenVersion + 1;
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Passowrd Reset Successful!"));
});

export {
  registerUser,
  resendVerificationEmail,
  verifyEmail,
  checkVerificationStatus,
  loginUser,
  refreshHandler,
  logoutUser,
  forgotPassword,
  resetPassword
};
