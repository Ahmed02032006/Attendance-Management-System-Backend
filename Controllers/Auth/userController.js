import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../../Models/userModel.js";

dotenv.config();

const Register = async (req, res) => {
  const { userName, userEmail, userPassword, userRole, profilePicture } = req.body;

  if (!userName || !userEmail || !userPassword) {
    return res
      .status(400)
      .json({ status: "Error", message: "Please provide all required fields" });
  }

  const userAvailability = await User.findOne({ userEmail });

  if (userAvailability) {
    return res
      .status(400)
      .json({ status: "Error", message: "Email already exists" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(userEmail)) {
    return res
      .status(400)
      .json({ status: "Error", message: "Invalid email format" });
  }

  const hashedPassword = await bcrypt.hash(userPassword, 10);

  const user = await User.create({
    userName,
    userEmail,
    userPassword: hashedPassword,
    userRole,
    profilePicture,
    status: "Inactive",
  });

  if (!user) {
    res.status(400).json({
      status: "Error",
      message: "Something went wrong while registering user",
    });
  }

  res
    .status(201)
    .json({ status: "Success", message: "User registered successfully" });
};

const Login = async (req, res) => {
  const { userEmail, userPassword } = req.body;

  if (!userEmail || !userPassword) {
    return res.status(400).json({
      status: "Error",
      message: "Please provide both email and password",
    });
  }

  const user = await User.findOne({ userEmail });

  if (!user) {
    return res
      .status(401)
      .json({ status: "Error", message: "Invalid email or password" });
  }

  const isMatch = await bcrypt.compare(userPassword, user.userPassword);

  if (!isMatch) {
    return res
      .status(401)
      .json({ status: "Error", message: "Invalid email or password" });
  }

  const token = jwt.sign(
    {
      user: {
        id: user._id,
        userName: user.userName,
        userEmail: user.userEmail,
        userRole: user.userRole,
        profilePicture: user.profilePicture,
        status: user.status,
      },
    },
    process.env.JWT_SECRET_KEY,
    {
      expiresIn: "24h",
    }
  );

  return res
    .cookie("access_token", token, {
      httpOnly: true,
      secure: true, // must be true for Vercel (HTTPS)
      sameSite: "none", // allow cross-site cookie
      path: "/", // ensures cookie is sent to all routes
    })
    .json({
      status: "Success",
      success: true,
      message: "User Logged in successfully",
      user: {
        id: user._id,
        userName: user.userName,
        userEmail: user.userEmail,
        userRole: user.userRole,
        profilePicture: user.profilePicture,
        status: user.status,
      },
    });
};

const logout = async (req, res) => {
  res.clearCookie("access_token", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
  });
  return res.status(200).json({
    success: true,
    status: "Success",
    message: "User logged out successfully",
  });
};

const checkAuthMiddleware = async (req, res, next) => {
  let token = req.cookies.access_token;

  if (!token) {
    return res
      .status(401)
      .json({ success: false, status: "Error", message: "Unauthorized User" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    req.user = decoded.user;
    next();
  } catch (error) {
    console.log(error);
    return res.status(401).json({
      success: false,
      status: "Error",
      message: "Access denied. Please log in",
    });
  }
};

export { Register, Login, logout, checkAuthMiddleware };
