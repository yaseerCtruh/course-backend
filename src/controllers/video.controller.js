import mongoose, { Types } from "mongoose";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

  // Validate the userId if provided; throw an error if it's not a valid ObjectId
  if (userId && !Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid User ID");
  }

  // Define a constant for default pagination value
  const VALUE = 10;

  // Set up pagination options with default values
  const paginationOptions = {
    page: Math.max(parseInt(page, VALUE), 1), // Ensure page is at least 1
    limit: Math.max(parseInt(limit, VALUE), 1), // Ensure limit is at least 1
  };

  // Initialize an empty aggregation pipeline
  const pipeline = [];

  // Initialize an array to hold match conditions for the query
  const matchConditions = [];

  // Handle visibility (public/private)
  if (userId) {
    const isOwner = req.user?._id.toString() === userId;
    if (isOwner) {
      // Owner can see all their videos (public + private)
      matchConditions.push({ owner: new mongoose.Types.ObjectId(userId) });
    } else {
      // Non-owners can only see public videos of this user
      matchConditions.push({
        owner: new mongoose.Types.ObjectId(userId),
        isPublic: true,
      });
    }
  } else {
    // No userId: show all public videos
    matchConditions.push({ isPublic: true });
  }

  // Check if a search query is provided
  if (query) {
    // Create a case-insensitive regex for searching titles and descriptions
    const regex = new RegExp(query, "i");

    matchConditions.push({
      $or: [
        { title: { $regex: regex } }, // Match titles containing the query
        { description: { $regex: regex } }, // Match descriptions containing the query
      ],
    });
  }

  // If there are any match conditions, add them to the pipeline
  if (matchConditions.length > 0) {
    pipeline.push({
      $match: {
        $and: matchConditions,
      },
    });
  }

  // Check if sorting parameters are provided
  if (sortBy && sortType) {
    // Determine sort order based on sortType (ascending or descending)
    const sortOrder = sortType.toLowerCase() === "asc" ? 1 : -1;

    pipeline.push({
      $sort: { [sortBy]: sortOrder }, // Sort based on specified field and order
    });
  } else {
    // Default sorting by creation date in descending order if no sorting parameters are provided
    pipeline.push({ $sort: { createdAt: -1 } });
  }

  // Execute the aggregation pipeline with pagination options using aggregatePaginate method
  const result = await Video.aggregatePaginate(pipeline, paginationOptions);

  // Send a successful response with fetched videos and a message
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Videos fetched successfully!"));
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
  if (!videoId) {
    throw new ApiError(400, "Video ID is required!");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found!");
  }

  const videoOwner = video.owner.toString();
  const userId = req?.user?._id.toString();
  if (videoOwner !== userId) {
    throw new ApiError(403, "You are not authorized to update this video!");
  }

  const { newTitle, newDescription } = req.body;
  [newTitle, newDescription].some((field) => {
    if (!field) {
      throw new ApiError(400, "All fields are required!");
    }
  });

  const thumbnailLocalPath = req?.file?.path;
  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Thumbnail is required!");
  }

  const updatedThumbnail = await uploadOnCloudinary(thumbnailLocalPath);
  if (!updatedThumbnail) {
    throw new ApiError(500, "Failed to upload thumbnail!");
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title: newTitle,
        description: newDescription,
        thumbnail: updatedThumbnail?.secure_url,
      },
    },
    {
      new: true,
    },
  );
  if (!updatedVideo) {
    throw new ApiError(500, "Failed to update video!");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Video updated successfully!"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(400, "Video ID is required!");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found!");
  }

  const videoOwner = video.owner.toString();
  const userId = req?.user?._id.toString();
  if (videoOwner !== userId) {
    throw new ApiError(403, "You are not authorized to update this video!");
  }

  const updatedStatus = await Video.findByIdAndUpdate(
    videoId,
    { $set: { isPublic: !video?.isPublic } },
    { new: true },
  );
  if (!updatedStatus) {
    throw new ApiError(500, "Failed to update video status!");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedStatus,
        "Video publish status updated successfully!",
      ),
    );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
