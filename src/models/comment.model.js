import { Schema, model } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const commentSchema = new Schema(
  {
    content: { type: String, required: true },
    video: {
      type: Schema.Types.ObjectId,
      ref: "Video",
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    likesCount: { type: Number, default: 0 },
    isLikedByUser: { type: Boolean, default: false },
  },
  { timestamps: true },
);

commentSchema.plugin(mongooseAggregatePaginate);
export const Comment = model("Comment", commentSchema);
