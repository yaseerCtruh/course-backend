import mongoose, { isValidObjectId, Types } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (!title) {
    throw new ApiError(400, "Title is required");
  }
  if (!description) {
    throw new ApiError(400, "Title is required");
  }

  const videoLocalPath = req.files?.videoFile[0]?.path;
  if (!videoLocalPath) {
    throw new ApiError(400, "Video file is required");
  }

  const video = await uploadOnCloudinary(videoLocalPath);
  if (!video) {
    throw new ApiError(500, "Failed to upload video");
  }

  const thumbnailLocalPath = req?.files?.thumbnail[0]?.path;
  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Thumbnail is required");
  }

  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
  if (!thumbnail) {
    throw new ApiError(500, "Failed to upload thumbnail");
  }

  const saveVideo = await Video.create({
    videoFile: video?.url,
    thumbnail: thumbnail?.url,
    title,
    description,
    duration: video?.duration,
    owner: req.user._id,
  });
  if (!saveVideo) {
    throw new ApiError(500, "Failed to publish video");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, saveVideo, "Video published successfully :)"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(400, "Video ID is required!");
  }
  // Mongoose Query
  // const video = await Video.findById(videoId);

  // Aggregation Pipeline
  const video = await Video.aggregate([
    {
      $match: {
        _id: new Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "uploader",
      },
    },
    {
      $unwind: "$uploader",
    },
    {
      $project: {
        "uploader.password": 0,
        "uploader.refreshToken": 0,
        "uploader.watchHistory": 0,
        "uploader.createdAt": 0,
        "uploader.updatedAt": 0,
        "uploader.coverImage": 0,
      },
    },
  ]);

  if (!video) {
    throw new ApiError(404, "Video not found!");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched successfully!"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: update video details like title, description, thumbnail
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
