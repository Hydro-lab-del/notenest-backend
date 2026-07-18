import {User} from "../models/user.model.js";
import jwt, { decode } from "jsonwebtoken";
import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";



// get token from the cookies and authorization header
// then decode the token
// find the user from the id in the decoded token and validate the user
// add the user on the req.user
const verifyJWT = asyncHandler(async (req, res, next) => {
    try {
        // Look for the header: "Bearer <token>"
        const token = req.header("Authorization")?.replace("Bearer ", "") || req.cookies?.accessToken;

        if (!token) {
            throw new ApiError(401, "Unauthorized request - No token found");
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user = await User.findById(decodedToken?.id).select("-password");

        if (!user) {
            throw new ApiError(401, "Invalid Access Token");
        }

        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token");
    }
})

export { verifyJWT };