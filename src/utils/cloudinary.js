import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath || !fs.existsSync(localFilePath)) {
      console.error("Error: File does not exist at", localFilePath);
      return null;
    }
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    console.log("File uploaded successfully:", response.secure_url);
    // Delete local file after upload
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    console.error("Cloudinary Upload Error:", error.message);
    // If upload fails, remove local file
    fs.existsSync(localFilePath) && fs.unlinkSync(localFilePath);
    return null;
  }
};
export { uploadOnCloudinary };
