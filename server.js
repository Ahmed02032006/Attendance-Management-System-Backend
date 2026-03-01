// In your main server file (index.js or server.js), add:
import express from "express";
import dotenv from "dotenv";
import connectToDb from "./Config/connectToDb.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import fetch from 'node-fetch'; // Install this: npm install node-fetch

// =================================================
import userRouter from "./Routes/Auth/user-Routes.js";
// =================================================
import teacherSubjectRouter from "./Routes/Teacher/subject-Routes.js";
import teacherAttendanceRouter from "./Routes/Teacher/attendance-Routes.js";
import teacherDashbaordRouter from "./Routes/Teacher/dashboard-Routes.js";
import teacherUserRouter from "./Routes/Teacher/user-Routes.js";
import teacherReportRouter from './Routes/Teacher/report-Routes.js';
// =================================================
import adminDashboardRouter from "./Routes/Admin/teachers-Routes.js";

dotenv.config();
const port = process.env.PORT || 5001;

connectToDb();

const app = express();

app.use(cookieParser());

// Update CORS for Vercel deployment
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "DELETE", "PUT", "OPTIONS"],
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

// ============= AI PROXY ENDPOINT =============
app.post("/api/v1/ai/query", async (req, res) => {
  try {
    const { query, userId, context } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        response: "Please provide a valid query.",
        timestamp: new Date().toISOString()
      });
    }

    console.log('AI Query received:', { 
      userId, 
      query: query.substring(0, 100),
      hasContext: !!context 
    });
    
    // Forward the request to the external AI API
    const aiResponse = await fetch('https://attendance-management-system-ai-cyo6oanbk.vercel.app/api/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        query: query
      }),
      timeout: 15000 // 15 second timeout
    });
    
    if (!aiResponse.ok) {
      console.error('AI service error:', aiResponse.status, aiResponse.statusText);
      throw new Error(`AI service responded with status: ${aiResponse.status}`);
    }
    
    const data = await aiResponse.json();
    
    // Format the response for your frontend
    res.json({
      success: true,
      response: data.response || data.message || "I received your query successfully.",
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('AI Proxy Error:', error.message);
    
    // Provide helpful fallback responses
    let fallbackResponse = "I'm currently experiencing technical difficulties. ";
    
    const query = req.body.query?.toLowerCase() || '';
    if (query.includes('attendance') && query.includes('add')) {
      fallbackResponse += "To add attendance, go to the Attendance page from the main menu, select a subject, and mark students.";
    } else if (query.includes('dashboard')) {
      fallbackResponse += "Your dashboard shows your subjects and their attendance records. Select a subject to view details.";
    } else if (query.includes('subject')) {
      fallbackResponse += "Your subjects are listed on the left side of the dashboard. Click on any to view attendance.";
    } else {
      fallbackResponse += "Please try again in a moment or contact support.";
    }
    
    res.status(200).json({
      success: false,
      response: fallbackResponse,
      timestamp: new Date().toISOString()
    });
  }
});

// ============= AUTH ROUTES =============
app.use("/api/v1/auth", userRouter);
// ============= TEACHERS ROUTES =============
app.use("/api/v1/teacher/subject", teacherSubjectRouter);
app.use("/api/v1/teacher/attendance", teacherAttendanceRouter);
app.use("/api/v1/teacher/dashboard", teacherDashbaordRouter);
app.use("/api/v1/teacher/user", teacherUserRouter);
app.use("/api/v1/teacher/reports", teacherReportRouter);
// ============= ADMIN ROUTES =============
app.use("/api/v1/admin/teachers", adminDashboardRouter);

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