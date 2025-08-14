import { imageUploadUtil } from "../../Helpers/Cloudinary.js";

const handleImageUpload = async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({ success: false, status: "Error", message: "No image file provided", });
		}

		const b64 = Buffer.from(req.file.buffer).toString("base64");
		const url = "data:" + req.file.mimetype + ";base64," + b64;
		const result = await imageUploadUtil(url);

		return res.json({ success: true, status: "Success", message: "Image Uploaded Successfully", result });
	} catch (error) {
		return res.json({ success: false, status: "Error", message: "Something went wrong while uploading the image", });
	}
}


export { handleImageUpload };
