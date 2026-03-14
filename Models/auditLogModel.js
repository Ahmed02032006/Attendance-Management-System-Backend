import mongoose from "mongoose";

const auditLogSchema = mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  userRole: {
    type: String,
    required: true,
    enum: ["Admin", "Teacher", "Student"]
  },
  action: {
    type: String,
    required: true
  },
  actionType: {
    type: String,
    required: true
  },
  heading: {
    type: String,
    required: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'entityModel'
  },
  entityModel: {
    type: String,
    required: true
  },
  entityName: {
    type: String,
    required: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
    default: "success"
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ entityId: 1, entityModel: 1 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);
export default AuditLog;