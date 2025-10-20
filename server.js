import express from "express";
import dotenv from "dotenv";
import connectToDb from "./Config/connectToDb.js";
import cors from "cors";
import cookieParser from "cookie-parser";
// =================================================
import userRouter from "./Routes/Auth/user-Routes.js";
// =================================================
import teacherSubjectRouter from "./Routes/Teacher/subject-Routes.js";
import teacherAttendanceRouter from "./Routes/Teacher/attendance-Routes.js";
import teacherDashbaordRouter from "./Routes/Teacher/dashboard-Routes.js";

dotenv.config();
const port = process.env.PORT || 5001;

connectToDb();

const app = express();

app.use(cookieParser());

// Update CORS for Vercel deployment
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "DELETE", "PUT"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Cache-Control",
      "Expires",
      "Pragma",
    ],
    credentials: true,
  })
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use("/api/v1/auth", userRouter);
// =============
app.use("/api/v1/teacher/subject", teacherSubjectRouter);
app.use("/api/v1/teacher/attendance", teacherAttendanceRouter);
app.use("/api/v1/teacher/dashboard", teacherDashbaordRouter);

// Health check route
app.get("/", (req, res) => {
  res.json({ message: "Server is running!" });
});

// Export the app for Vercel
export default app;

// Only listen when not in Vercel environment
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}