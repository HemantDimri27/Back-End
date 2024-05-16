import { asyncHandler } from "../utils/asyncHandler.js";     // ex: .js
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudnary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt  from "jsonwebtoken";

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
  console.log(email);

  // step 2
  if(!username && !email) {
    throw new ApiError(400, "username or email is required")
  }

  // alternative
  // if(!(username || email)) {
  //   throw new ApiError(400, "username or email is required")
  // }

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
  const loggedInUser = await User.findById(user._id).select("-password -refreshToken") // User belogs to database, user belongs to local variable, here we filter some value to pass further


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

const refreshAccessToken = asyncHandler(async(req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken 

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request")
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken, 
      process.env.REFRESH_TOKEN_SECRET
    )
  
    const user = await User.findById(decodedToken?._id)
  
    if (!user) {
      throw new ApiError(401, "Invalid Refresh token")
    }
  
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used")
    }
  
    const options = {
      httpOnly: true,
      secure: true 
    }
  
    const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
  
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(
      new ApiResponse(
        200,
        {accessToken, refreshToken: newRefreshToken},
        "Access token refreshed"
      )
    )
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token")
  }



})

const changeCurrentPassword = asyncHandler(async(req, res) => {
  const {oldPassword, newPassword} = req.body
  // const {oldPassword, newPassword, confPassword} = req.body

  // if(!(newPassword === confPassword)) {
  //   throw new ApiError(400, "Invalid match with new-password")
  // }

  const user = await User.findById(req.user?._id)
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

  if(!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password")
  }

  user.password = newPassword
  await user.save({validateBeforeSave: false})

  return res
  .status(200)
  .json(new ApiResponse(
    200,
    {},
    "Password changed successfully"
  ))
  
})

const getCurrentUser = asyncHandler(async(req, res) => {
  return res
  .status(200)
  .json( new ApiResponse(
    200,
    req.user,
    "user feched successfully"
  ))
})

const updateAccountDetails = asyncHandler(async(req, res) => {
  const {fullName, email} = req.body

  if(!fullName || !email) {
    throw new ApiError(400, "All fields are required")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,       //or fullName: fullName
        email: email
      }
    },
    {new: true}
  ).select("-password")

  return res
  .status(200)
  .json(new ApiResponse(200, user, "Account details updated successfully"))

})

const updateUserAvatar = asyncHandler(async(req, res) => {
  const avatarLocalPath = req.file?.path

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing")
  }

  const avatar = await uploadOnCloudnary(avatarLocalPath)

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading on avatar")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url
      }
    },
    {new: true} 
  ).select("-password")

  //todo: delete old images

  return res
  .status(200)
  .json(
    new ApiResponse(200, user, "Avatar updated successfully")
  )

})

const updateUserCoverImage = asyncHandler(async(req, res) => {
  const coverImageLocalPath = req.file?.path

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover image file is missing")
  }

  const coverImage = await uploadOnCloudnary(coverImageLocalPath)

  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading on cover image")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url
      }
    },
    {new: true} 
  ).select("-password")

  return res
  .status(200)
  .json(
    new ApiResponse(200, user, "Cover image updated successfully")
  )

})

const getUserChannelProfile = asyncHandler(async(req, res) => {
  const {username} = req.params

  if(!username?.trim()) {
    throw new ApiError(400, "username is missing")
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase()
      }
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "chennel",
        as: "subscriber"
      }
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo"
      }
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers"      // $ coz, now it is a field
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo"
        },
        isSubscribed: {
          $cond: {
            if: {$in: [req.user?._id, "$subscribers.subscriber"]},
            then: true,
            else: false
          }
        }
      }
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1
      }
    }
  ])

  if (!channel?.length) {
    throw new ApiError(404, "chennel does not exists")
  }

  return res
  .status(200)
  .json(
    new ApiResponse(200, channel[0], "User channel fetched")
  )

})

export {
  registerUser, 
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile
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


