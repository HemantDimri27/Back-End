import { asyncHandler } from "../utils/asyncHandler.js";     // ex: .js
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudnary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

const generateAccessAndRefreshTokens = async(userId) => {
  try {
    const user = await User.findById(userId)
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()

    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave: false })

    return {accessToken, refreshToken}

  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating refresh and access token")
  }
}

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

const loginUser = asyncHandler( async (req, res) => {
  // by HCS 
  // 1. req body -> data
  // 2. username or email
  // 3. find user
  // 4. password check
  // 6. access and fresh token
  // 7. send cookie

  //step 1
  const  {email, username, password} = req.body

  // step 2
  if(!username || !email) {
    throw new ApiError(400, "username or email is required")
  }

  // step 3
  const user = await User.findOne({
    $or: [{username}, {email}]          // $or is a mongodb oprator
  })

  if(!user) {
    throw new ApiError(404, "User does not exist")
  }

  // step 4
  const isPassworldValid = await user.isPasswordCorrect(password)

  if(!isPassworldValid) {
    throw new ApiError(401, "Invalid user credentials")
  }

  //step 5
  const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

  // optional, to update user within data
  const loggedUser = await User.findById(user._id).select("-password -refreshToken") // User belogs to database, user belongs to local variable, here we filter some value to pass further


  // step 6

  const options = { 
    httpOnly: true,       // edit by server only
    secure: true
  }


  return res
  .status(200)
  .cookie("accessToken", accessToken, options)
  .cookie("refreshToken", refreshToken, options)
  .json(
    new ApiResponse(
      200,
      {
        user: loggedInUser, accessToken, refreshToken
      },
      "User logged in Successfully"
    )
  )


})

const logoutUser = asyncHandler(async(req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined
      }
    },
    {
      new: true
    }
  )

  const options = { 
    httpOnly: true,       // edit by server only
    secure: true
  }

  return res
  .status(200)
  .clearCookie("accessToken", options)
  .clearCookie("refreshToken", options)
  .json(new ApiResponse(200, {}, "User logged Out"))

})

export {
  registerUser, 
  loginUser,
  logoutUser
}


// my steps for register user
// 1. userName
// 2. email id: unique, validation
// 3. phone no.: unique, validation
// 4. user id : unique
// 5. image

// some others:
// 1. user detail
// 2. validation
// 3. existance
// 4. welcome



// my steps for login user
// 1. username or email
// 2. password
// 3. provide access token


