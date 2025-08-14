import express from "express";
import { handleImageUpload } from "../../Controllers/Media/uploadController.js";
import { upload } from "../../Helpers/Cloudinary.js";


const Router = express.Router();

Router.post("/upload-image", upload.single("file"), handleImageUpload);

export default Router;
