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
    return res
      .status(400)
      .json(new ApiError(400, null, "Video ID is required"));
  }

  const userId = req?.user?._id;
  if (!userId) {
    return res.status(400).json(new ApiError(400, null, "User ID is required"));
  }

  const video = await Video.findById(videoId);
  if (!video) {
    return res.status(404).json(new ApiError(404, null, "Video not found"));
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
        return res
          .status(500)
          .json(new ApiError(500, null, "Failed to dislike video"));
      }
      video.likesCount -= 1;
      video.isLikedByLoggedInUser = false;
      await video.save();
      return res
        .status(200)
        .json(
          new ApiResponse(200, unLikeVideo, "Video disliked successfully!"),
        );
    } catch (error) {
      return res.status(500).json(new ApiError(500, null, "Failed to dislike"));
    }
  } else {
    try {
      const likeVideo = await Like.create({
        video: videoId,
        likedBy: userId,
      });
      if (!likeVideo) {
        return res
          .status(500)
          .json(new ApiError(500, null, "Failed to like video"));
      }

      video.likesCount += 1;
      video.isLikedByLoggedInUser = true;
      await video.save();

      return res
        .status(200)
        .json(new ApiResponse(200, likeVideo, "Video liked successfully!"));
    } catch (error) {
      return res
        .status(500)
        .json(new ApiError(500, null, "Failed to like video"));
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
