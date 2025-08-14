import express from "express";
import dotenv from "dotenv";
import connectToDb from "./Config/connectToDb.js";
import cors from "cors";
import cookieParser from "cookie-parser";
// =================================================
import userRouter from "./Routes/Auth/user-Routes.js";
// =================================================
import uploadRouter from "./Routes/Media/upload-Routes.js";
// =================================================
import adminSchoolRouter from "./Routes/Admin/school-Routes.js";
import adminTeacherRouter from "./Routes/Admin/teacher-Routes.js";
import adminClassRouter from "./Routes/Admin/class-Routes.js";
import adminSubjectRouter from "./Routes/Admin/subject-Routes.js";
import adminAdmissionRouter from "./Routes/Admin/admission-Routes.js";
import adminStudentRouter from "./Routes/Admin/students-Routes.js";
import adminParentRouter from "./Routes/Admin/parent-Routes.js";
import adminTimeTableRouter from "./Routes/Admin/timeTable-Routes.js";
import adminOtherUserRouter from "./Routes/Admin/otherUser-Routes.js";
// =================================================
import superAdminSchoolRouter from "./Routes/Super_Admin/school-Routes.js";
import superAdminUserRouter from "./Routes/Super_Admin/user-Routes.js";
// =================================================
import teacherSchoolRouter from "./Routes/Teacher/school-Routes.js";

dotenv.config();
const port = process.env.PORT || 5001;

connectToDb();

const app = express();

app.use(cookieParser());

app.use(
  cors({
    origin: "http://localhost:5173",
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
app.use("/api/v1/media", uploadRouter);
// =============
app.use("/api/v1/admin/school", adminSchoolRouter);
app.use("/api/v1/admin/teacher", adminTeacherRouter);
app.use("/api/v1/admin/class", adminClassRouter);
app.use("/api/v1/admin/subject", adminSubjectRouter);
app.use("/api/v1/admin/admission", adminAdmissionRouter);
app.use("/api/v1/admin/student", adminStudentRouter);
app.use("/api/v1/admin/parent", adminParentRouter);
app.use("/api/v1/admin/timeTable", adminTimeTableRouter);
app.use("/api/v1/admin/otherUser", adminOtherUserRouter);
// =============
app.use("/api/v1/superAdmin/school", superAdminSchoolRouter);
app.use("/api/v1/superAdmin/user", superAdminUserRouter);
// =============
app.use("/api/v1/teacher/school", teacherSchoolRouter);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
