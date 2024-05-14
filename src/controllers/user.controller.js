import { asyncHandler } from "../utils/asyncHandler.js";     // ex: .js
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudnary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

const registerUser = asyncHandler( async (req, res) => {

  // by HCS
// 1. get user details from frontend 
// 2. validation - not empty 
// 3. check if user already exist : username, email 
// 4. check for image, check for avtar
// 5. upload them for cloudnary avtar 
// 6. create user object - create entry in db 
// 7. remove password and refresh token 
// 8. check for useer creation 
// 9. return response 

  // 1.
  const {fullName, email, username, password } = req.body     // destructure from json-formate
  console.log("email: ", email);


  // 2.
  if (
  [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All feilds are required")
  }


  // 3.
  const existedUser = await User.findOne({
    $or: [{ username }, { email }]
  })

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists")
  }

  // 4.
  const avatarLocarpath = req.files?.avatar[0]?.path;      // files provide by multer
  // const coverImageLocarpath = req.files?.coverImage[0]?.path;  

  let coverImageLocarpath;
  if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    coverImageLocarpath = req.files.coverImage[0].path
  }
  
  if (!avatarLocarpath) {
    throw new ApiError(400, "Avatar file is required")
  }
  
  // 5. 
  const avatar = await uploadOnCloudnary(avatarLocarpath)
  const coverImage = await uploadOnCloudnary(coverImageLocarpath)

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required")
  }

  // 6.
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase()
  })


  // 7. & 8.
  const createdUser = await User.findById(user._id).select("-password -refreshToken")    // weired syntax

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user")
  }


  // 9.
  return res.status(201).json(
    new ApiResponse(200, createdUser, "User registered Successfully")
  )





} )

export {registerUser}


// my steps for register user
// 1. userName
// 2. email id: unique, validation
// 3. phone no.: unique, validation
// 4. user id : unique
// 5. image


// 1. user detail
// 2. validation
// 3. existance
// 4. welcome


