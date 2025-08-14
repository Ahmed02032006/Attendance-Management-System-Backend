import User from "../../Models/userModel.js";

const getAllUser = async (req, res) => {
  try {
    const users = await User.find();

    return res.status(200).json({
      status: "Success",
      count: users.length,
      data: users,
    });
  } catch (error) {
    return res.status(500).json({ status: "Error", message: error.message });
  }
};


export { getAllUser }