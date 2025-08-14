import mongoose from "mongoose";

const parentSchema = new mongoose.Schema(
  {
    parentId: {
      type: String,
      required: [true, "Please enter the parent ID"],
      unique: true,
    },
    parentName: {
      type: String,
      required: [true, "Please enter the parent name"],
    },
    parentEmail: {
      type: String,
      required: [true, "Please enter the parent email"],
      unique: true,
    },
    parentPassword: {
      type: String,
      required: [true, "Please enter the parent password"],
    },
    phone: {
      type: String,
      required: [true, "Please enter the phone number"],
    },
    address: {
      type: String,
      required: [true, "Please enter the address"],
    },
    parentProfilePicture: {
      type: String,
      required: [true, "Please enter the profile picture"],
    },
    status: {
      type: String,
      default: "Active",
      enum: ["Active", "Inactive"],
      required: true,
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [true, "Please specify the school this student belongs to"],
    },
    children: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
      },
    ],
  },
  { timestamps: true }
);

const Parent = mongoose.model("Parent", parentSchema);
export default Parent;

// {
//   "parentId": "PAR001",
//   "parentName": "Ahsan Malik",
//   "parentEmail": "ahsan@example.com",
//   "parentPassword": "secure1234",
//   "phone": "03001234567",
//   "address": "House 123, Street 45, Lahore",
//   "status": "Active"
// }
