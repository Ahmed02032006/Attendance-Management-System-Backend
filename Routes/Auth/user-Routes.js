import express from "express";
import {
  checkAuthMiddleware,
  DynamicRegisterUser,
  Login,
  logout,
  updateUserByEmail,
  Register,
} from "../../Controllers/Auth/userController.js";

const Router = express.Router();

Router.route("/register").post(Register);
Router.route("/dynamicRegisterUser").post(DynamicRegisterUser);
Router.route("/editUserDetails/:userEmail").put(updateUserByEmail);
Router.route("/login").post(Login);
Router.route("/logout").post(logout);
Router.get("/check-auth", checkAuthMiddleware, (req, res) => {
  const user = req.user;
  return res.status(200).json({
    success: true,
    status: "Success",
    message: "User Authenticated successfully",
    user: user,
  });
});

export default Router;
