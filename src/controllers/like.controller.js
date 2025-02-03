import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: toggle like on video
  if (!videoId) {
    throw new ApiError(400, "Video ID is required!");
  }

  const userId = req?.user?._id;
  if (!userId) {
    throw new ApiError(401, "Unauthorized");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found!");
  }

  const existingLike = await Like.findOne({
    $and: [{ video: videoId }, { likedBy: userId }],
  });

  if (existingLike) {
    try {
      const unLikeVideo = await Like.findByIdAndDelete({
        _id: existingLike?._id,
      });
      if (!unLikeVideo) {
        throw new ApiError(404, "Video not found");
      }
      video.likesCount -= 1;
      await video.save();
      const result = {
        video,
        unLikeVideo,
      };
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Video disliked successfully"));
    } catch (error) {
      throw new ApiError(500, "Failed to unlike video");
    }
  } else {
    try {
      const likeVideo = await Like.create({
        video: videoId,
        likedBy: userId,
      });
      if (!likeVideo) {
        throw new ApiError(400, "Failed to like video");
      }

      video.likesCount += 1;
      await video.save();

      const result = {
        video,
        likeVideo,
      };
      return res.status(200).json(new ApiResponse(200, result, "Liked video"));
    } catch (error) {
      throw new ApiError(500, "Failed to like video");
    }
  }
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  //TODO: toggle like on comment
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  //TODO: toggle like on tweet
});

const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
