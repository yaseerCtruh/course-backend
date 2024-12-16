import { connect } from "mongoose";
import { DB_NAME } from "../constant.js";

const MONGODB_URI = `${process.env.MONGODB_URI}/${DB_NAME}`;

const connectDB = async () => {
  try {
    const connectionInstance = await connect(MONGODB_URI);
    console.log(
      `\n Connected to MongoDB!! DB Host: ${connectionInstance.connection.host}`,
    );
  } catch (error) {
    console.log(`MONGODB Connection ERROR: ${error}`);
    process.exit(1);
  }
};
export default connectDB;
