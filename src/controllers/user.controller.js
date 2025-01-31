import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import { v2 as cloudinary } from "cloudinary";
// generate access and refresh token
const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Something went wrong while generating tokens");
  }
};
// user registration controller
const registerUser = asyncHandler(async (req, res) => {
  const { userName, email, password, fullName } = req.body;
  if (
    [userName, email, password, fullName].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }
  const existedUser = await User.findOne({
    $or: [{ userName }, { email }],
  });
  if (existedUser) {
    throw new ApiError(409, "User with this email or username already exists!");
  }
  const avatarLocalPath = req.files?.avatar[0]?.path;
  console.log("avatarLocalPath", avatarLocalPath);
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  cloudinary.api
    .ping()
    .then((res) => console.log("Cloudinary Connected :white_tick:", res))
    .catch((err) => console.error("Cloudinary Connection Error :x:", err));
  if (!avatar) {
    throw new ApiError(400, "Avatar is required");
  }
  console.log("avatar", avatar);
  const user = await User.create({
    fullName,
    userName: userName.toLowerCase(),
    email,
    password,
    avatar: avatar?.secure_url,
    coverImage: coverImage?.secure_url || "",
  });
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );
  if (!createdUser) {
    throw new ApiError(400, "Something went wrong while registering user.");
  }
  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User registered successfully"));
});

// user login controller
const loginUser = asyncHandler(async (req, res) => {
  const { email, userName, password } = req.body;
  if (!userName && !email) {
    throw new ApiError(400, "Username or email is required");
  }
  const user = await User.findOne({ $or: [{ userName }, { email }] });
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Password is incorrect");
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id,
  );
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );
  const options = {
    http: true,
    secure: true,
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User logged in successfully",
      ),
    );
});

// user logout controller
const logoutUser = asyncHandler(async (req, res) => {
  const id = req.user._id;
  await User.findByIdAndUpdate(id, {
    $unset: { refreshToken: 1 },
  });
  const options = { http: true, secure: true };
  return res
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

// user refresh access token controller
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized Request");
  }
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid Refresh Token");
    }
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh Token is expired or invalid");
    }
    const options = {
      httpOnly: true,
      secure: true,
    };
    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshToken(user?._id);
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access Token Refreshed Successfully",
        ),
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Refresh Token");
  }
});

// user forgot password controller
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id);
  const isPasswordValid = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordValid) {
    throw new ApiError(401, "Old password is incorrect");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});
// get current user controller
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User found successfully"));
});

// update account details controller
const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;
  if (!email || !fullName) {
    throw new ApiError(400, "All fields are required");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { fullName, email },
    },
    { new: true },
  ).select("-password");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

// update user avatar controller
const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    new ApiError(400, "Avatar file is missing");
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar) {
    throw new ApiError(400, "Error while uploading avatar");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { avatar: avatar?.url } },
    { new: true },
  ).select("-password");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

// update user cover image controller
const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    new ApiError(400, "CoverImage file is missing");
  }
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!coverImage) {
    throw new ApiError(400, "Error while uploading coverImage");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { coverImage: coverImage?.url } },
    { new: true },
  ).select("-password");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover Image updated successfully"));
});

// get user channel profile controller
const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { userName } = req.params;
  if (userName?.trim() === "") {
    throw new ApiError(400, "Username is required");
  }
  const channel = await User.aggregate([
    {
      $match: {
        userName: userName.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscriberTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscriberTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        userName: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);
  console.log(":rocket: ~ getUserChannelProfile ~ channel:", channel);
  if (!channel?.length) {
    throw new ApiError(404, "Channel does not exist");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel fetched successfully"),
    );
});

// get watch history controller
const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    userName: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: { $first: "$owner" },
            },
          },
        ],
      },
    },
  ]);
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "Watch history fetched successfully",
      ),
    );
});

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
  getUserChannelProfile,
  getWatchHistory,
};
