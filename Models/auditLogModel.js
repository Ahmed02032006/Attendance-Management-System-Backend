import mongoose from "mongoose";

const auditLogSchema = mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      "create", "edit", "delete", "register", "edit_schedule", 
      "create_qr", "export_attendance", "generate_report", "export_report"
    ]
  },
  heading: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ["success", "warning", "error"],
    default: "success"
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Index for faster queries
auditLogSchema.index({ userId: 1, timestamp: -1 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);
export default AuditLog;