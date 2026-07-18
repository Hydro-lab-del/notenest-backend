import { Schema, model } from "mongoose";
import bcrypt from 'bcrypt';
import jwt from "jsonwebtoken";
import crypto from 'crypto';

const userSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true

        }, email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            unique: true

        }, password: {
            type: String,
            required: true

        }, role: {
            type: String,
            enum: ['user', 'admin'],
            default: "user"

        }, isEmailVerified: {
            type: Boolean,
            default: false

        }, twoFactorEnabled: {
            type: Boolean,
            default: false

        }, twoFactorSecret: {
            type: String,
            default: undefined

        }, tokenVersion: {
            type: Number,
            default: 0

        }, resetPasswordToken: {
            type: String,
            default: undefined

        }, resetPasswordExpire: {
            type: Date,
            default: undefined

        }

    }, { timestamps: true }
);

userSchema.pre("save", async function () {
    if (!this.isModified("password")) return
    this.password = await bcrypt.hash(this.password, 10)
});

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password)
};

userSchema.methods.generateAccessToken = async function (role, tokenVersion) {
    return jwt.sign(
        {
            id: this._id,
            role: role || this.role,
            tokenVersion: tokenVersion || this.tokenVersion
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
};
userSchema.methods.generateRefreshToken = async function (tokenVersion) {
    return jwt.sign(
        {
            id: this._id,
            tokenVersion: tokenVersion || this.tokenVersion
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
};

userSchema.methods.generateTemporaryToken = async function () {
    return jwt.sign(
        { id: this._id },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "15m" }
    );
};

userSchema.methods.generatePasswordResetToken = async function () {

    const resetToken = crypto.randomBytes(32).toString('hex');

    this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest("hex");

    this.resetPasswordExpire = new Date(Date.now() + 15 * 60 * 1000) //15minutes

    return resetToken;
}



export const User = model("User", userSchema);