import mongoose from "mongoose";

const schoolSchema = mongoose.Schema({
    schoolLogo: {
        type: String,
        required: [true, "Please upload your school logo"],
    },
    schoolName: {
        type: String,
        required: [true, "Please enter your school name"],
    },
    establishedYear: {
        type: String,
        required: [true, "Please enter the year your school was established"],
    },
    phone: {
        type: String,
        required: [true, "Please enter your school's phone number"],
    },
    address: {
        type: String,
        required: [true, "Please enter your school address"],
    },
    city: {
        type: String,
        required: [true, "Please enter your school city"],
    },
    state: {
        type: String,
        required: [true, "Please enter your school state"],
    },
    country: {
        type: String,
        required: [true, "Please enter your school country"],
    },
    about: {
        type: String,
        required: [true, "Please enter information about your school"],
    },
    website: {
        type: String,
        required: [true, "Please enter your school website URL"],
    },
    noOfStudent: {
        type: String,
        required: [true, "Please enter the number of students"],
    },
    noOfTeacher: {
        type: String,
        required: [true, "Please enter the number of teachers"],
    },
    verificationStatus: {
        type: String,
        enum: ['Pending', 'Verified', 'Rejected'],
        default: 'Pending',
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "Please specify the user who created the school"],
    },
}, { timestamps: true });

const School = mongoose.model("School", schoolSchema);

export default School;
