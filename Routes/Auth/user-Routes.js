import express from "express";
import {
  checkAuthMiddleware,
  Login,
  logout,
  Register,
} from "../../Controllers/Auth/userController.js";

const Router = express.Router();

Router.route("/register").post(Register);
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
