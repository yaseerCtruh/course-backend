import { Schema } from "mongoose";

const tweetSchema = new Schema(
  {},
  {
    timestamps: true,
  },
);

export const Tweet = model("Tweet", tweetSchema);
