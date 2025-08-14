import multer from "multer";
import cloudinary from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

const cloud_name = process.env.CLOUDINARY_NAME;
const api_key = process.env.CLOUDINARY_API_KEY;
const api_secret = process.env.CLOUDINARY_SECRET_KEY;

cloudinary.v2.config({
	cloud_name: cloud_name,
	api_key: api_key,
	api_secret: api_secret
});

const storage = new multer.memoryStorage();

const imageUploadUtil = async(file)=>{
	const result = await cloudinary.uploader.upload(file,{
		resource_type:"auto",
	});
	return result;
};

const upload = multer({storage});

export {upload,imageUploadUtil};
