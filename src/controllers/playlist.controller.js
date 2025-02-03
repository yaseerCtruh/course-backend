import { Types } from "mongoose";
import { Video } from "../models/video.model.js";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  console.log("🚀 ~ createPlaylist ~ req.body:", req.body);

  if (!name || !description) {
    return res
      .status(400)
      .json(new ApiError(400, null, "Name and description are required"));
  }

  const userId = req?.user?._id;
  if (!userId) {
    return res.status(400).json(new ApiError(401, null, "Unauthorized!"));
  }

  const playlist = await Playlist.create({
    name,
    description,
    owner: userId,
  });

  if (!playlist) {
    return res
      .status(400)
      .json(new ApiError(400, null, "Failed to create playlist"));
  }

  return res
    .status(201)
    .json(new ApiResponse(201, playlist, "Playlist created"));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  //TODO: get user playlists
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!playlistId || !Types.ObjectId.isValid(playlistId)) {
    return res
      .status(400)
      .json(new ApiError(400, null, "Valid playlist ID is required"));
  }

  const userId = req?.user?._id;
  if (!userId) {
    return res.status(400).json(new ApiError(401, null, "Unauthorized!"));
  }

  const playlist = await Playlist.aggregate([
    {
      $match: {
        _id: new Types.ObjectId(playlistId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
      },
    },
    {
      $unwind: "$owner",
    },
    {
      $project: {
        name: 1,
        description: 1,
        videos: 1,
        owner: {
          userName: "$owner.userName",
          avatar: "$owner.avatar",
          fullName: "$owner.fullName",
        },
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ]);
  if (!playlist || playlist?.length === 0) {
    return res
      .status(404)
      .json(new ApiError(404, null, "Playlist not found !"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist found!"));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  if (!playlistId.trim() || !Types.ObjectId.isValid(playlistId)) {
    return res.status(400).json(new ApiError(400, null, "Invalid playlist ID"));
  }

  if (!videoId?.trim() || !Types.ObjectId.isValid(videoId)) {
    return res.status(400).json(new ApiError(400, null, "Invalid video ID"));
  }

  const userId = req?.user?._id;
  if (!userId) {
    return res.status(400).json(new ApiError(401, null, "Unauthorized!"));
  }

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    return res.status(404).json(new ApiError(404, null, "Playlist not found"));
  }

  if (playlist.owner.toString() !== userId.toString()) {
    return res
      .status(401)
      .json(
        new ApiError(
          403,
          null,
          "Forbidden: You are not the owner of this playlist!",
        ),
      );
  }

  const video = await Video.findById(videoId);
  if (!video) {
    return res.status(400).json(new ApiError(400, null, "Video not found"));
  }
  if (playlist.videos.includes(videoId)) {
    return res
      .status(400)
      .json(new ApiError(400, null, "Video already exists in playlist"));
  }

  const addVideoToPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $addToSet: { videos: videoId },
    },
    {
      new: true,
    },
  );
  if (!addVideoToPlaylist) {
    return res
      .status(500)
      .json(new ApiError(500, null, "Failed to add video to playlist"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, addVideoToPlaylist, "Video added to playlist"));
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  // TODO: remove video from playlist
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  // TODO: delete playlist
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;
  //TODO: update playlist
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
