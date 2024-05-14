import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js";


export const verifyJWT = asyncHandler(async(req, _, next) => {   // _ replaces res(coz of no use) in production
  try {
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
  
    if (!token) {
      throw new ApiError(401, "Unauthorized request")
    }
  
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
  
    const user = await User.findById(decodedToken?._id).select("-password -refreshtoken")
  
    if(!user) {
      // note: about frontend
      throw new ApiError(401, "Invalid Access Token")
    }
  
    req.user = user;
    next()
  } catch (error) {
    throw new ApiError(401, error?.message || "invalid access token")
  }

})