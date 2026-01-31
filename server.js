import express from "express";
import dotenv from "dotenv";
import connectToDb from "./Config/connectToDb.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import fetch from 'node-fetch';
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
// =============
app.post("/api/v1/ai/query", async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        message: "Query is required and must be a string"
      });
    }

    console.log('Forwarding AI query:', query.substring(0, 100));
    
    // Forward the request to the external AI API
    const aiResponse = await fetch('https://api-api-rosy.vercel.app/api/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        query: query,
        context: 'teacher_dashboard_attendance_system' // Optional context
      }),
      timeout: 10000 // 10 second timeout
    });
    
    if (!aiResponse.ok) {
      throw new Error(`AI service responded with status: ${aiResponse.status}`);
    }
    
    const data = await aiResponse.json();
    
    // Format the response for your frontend
    res.json({
      success: true,
      response: data.response || data.message || "I received your query but got an empty response.",
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('AI Proxy Error:', error.message);
    
    // Provide helpful fallback responses
    let fallbackResponse = "I'm experiencing technical difficulties. ";
    
    const lowerQuery = req.body.query?.toLowerCase() || '';
    if (lowerQuery.includes('attendance')) {
      fallbackResponse += "For attendance-related queries, you can navigate to the Attendance section from the main menu.";
    } else if (lowerQuery.includes('dashboard')) {
      fallbackResponse += "The dashboard shows your subjects and attendance records. Select a subject to view details.";
    } else {
      fallbackResponse += "Please try again later or contact support.";
    }
    
    res.status(200).json({
      success: false,
      response: fallbackResponse,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  }
});
// =============

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