import mongoose from 'mongoose';
import Trash from '../../Models/trashModel.js';
import Subject from '../../Models/subjectModel.js';
import Attendance from '../../Models/attendanceModel.js';
import User from '../../Models/userModel.js';

export const moveToTrash = async (req, res) => {
    try {
        const { subjectId } = req.params;
        const { userId, deletedFrom } = req.body;

        // Validate inputs
        if (!mongoose.Types.ObjectId.isValid(subjectId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid subject ID'
            });
        }

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        if (!deletedFrom || !['Teacher', 'Admin'].includes(deletedFrom)) {
            return res.status(400).json({
                success: false,
                message: 'deletedFrom must be either "Teacher" or "Admin"'
            });
        }

        // Check if subject exists
        const subject = await Subject.findById(subjectId);
        if (!subject) {
            return res.status(404).json({
                success: false,
                message: 'Subject not found'
            });
        }

        // Check if already in trash
        const existingInTrash = await Trash.findOne({
            originalSubjectId: subjectId,
            isRecovered: false
        });

        if (existingInTrash) {
            return res.status(400).json({
                success: false,
                message: 'Subject already exists in trash'
            });
        }

        // Fetch all attendance records for this subject
        const attendanceRecords = await Attendance.find({ subjectId });

        // Prepare attendance records for trash
        const formattedAttendanceRecords = attendanceRecords.map(record => ({
            studentName: record.studentName,
            rollNo: record.rollNo,
            discipline: record.discipline,
            time: record.time,
            scheduleId: record.scheduleId,
            date: record.date,
            ipAddress: record.ipAddress,
            originalAttendanceId: record._id
        }));

        // Set expiry date (5 years from now)
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 1800);

        // Create trash entry
        const trashEntry = new Trash({
            originalSubjectId: subjectId,
            subjectDetails: {
                subjectTitle: subject.subjectTitle,
                departmentOffering: subject.departmentOffering,
                subjectCode: subject.subjectCode,
                creditHours: subject.creditHours,
                session: subject.session,
                status: subject.status,
                semester: subject.semester,
                classSchedule: subject.classSchedule || [],
                createdDate: subject.createdDate,
                userId: subject.userId,
                registeredStudents: subject.registeredStudents || []
            },
            attendanceRecords: formattedAttendanceRecords,
            deletedBy: userId,
            deletedFrom: deletedFrom,
            expiresAt: expiryDate
        });

        await trashEntry.save();

        // Delete original subject and its attendance
        await Subject.findByIdAndDelete(subjectId);
        if (attendanceRecords.length > 0) {
            await Attendance.deleteMany({ subjectId });
        }

        // Get user details for response
        const user = await User.findById(userId).select('userName userEmail userRole');

        res.status(200).json({
            success: true,
            message: 'Subject moved to trash successfully',
            data: {
                trashId: trashEntry._id,
                subject: {
                    title: subject.subjectTitle,
                    code: subject.subjectCode,
                    semester: subject.semester
                },
                statistics: {
                    attendanceRecords: formattedAttendanceRecords.length,
                    registeredStudents: subject.registeredStudents?.length || 0,
                    classSchedules: subject.classSchedule?.length || 0
                },
                deletedBy: {
                    id: user?._id,
                    name: user?.userName,
                    role: user?.userRole
                },
                deletedAt: trashEntry.deletedAt,
                expiresAt: expiryDate,
                daysRemaining: 30
            }
        });

    } catch (error) {
        console.error('Error moving to trash:', error);
        res.status(500).json({
            success: false,
            message: 'Error moving subject to trash',
            error: error.message
        });
    }
};

export const recoverFromTrash = async (req, res) => {
    try {
        const { trashId } = req.params;
        const { userId } = req.body;

        if (!mongoose.Types.ObjectId.isValid(trashId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid trash ID'
            });
        }

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        // Find trash entry
        const trashEntry = await Trash.findOne({
            _id: trashId,
            isRecovered: false
        });

        if (!trashEntry) {
            return res.status(404).json({
                success: false,
                message: 'Trash entry not found or already recovered'
            });
        }

        // Check if subject with same code already exists
        const existingSubject = await Subject.findOne({
            subjectCode: trashEntry.subjectDetails.subjectCode
        });

        if (existingSubject) {
            return res.status(400).json({
                success: false,
                message: 'A subject with this code already exists. Please rename before recovering.'
            });
        }

        // Create new subject from trash data
        const recoveredSubject = new Subject({
            subjectTitle: trashEntry.subjectDetails.subjectTitle,
            departmentOffering: trashEntry.subjectDetails.departmentOffering,
            subjectCode: trashEntry.subjectDetails.subjectCode,
            creditHours: trashEntry.subjectDetails.creditHours,
            session: trashEntry.subjectDetails.session,
            status: trashEntry.subjectDetails.status,
            semester: trashEntry.subjectDetails.semester,
            classSchedule: trashEntry.subjectDetails.classSchedule,
            createdDate: trashEntry.subjectDetails.createdDate,
            userId: trashEntry.subjectDetails.userId,
            registeredStudents: trashEntry.subjectDetails.registeredStudents
        });

        await recoveredSubject.save();

        // Recover attendance records if any
        let recoveredAttendanceCount = 0;
        if (trashEntry.attendanceRecords.length > 0) {
            const attendanceToCreate = trashEntry.attendanceRecords.map(record => ({
                studentName: record.studentName,
                rollNo: record.rollNo,
                discipline: record.discipline,
                time: record.time,
                subjectId: recoveredSubject._id,
                scheduleId: record.scheduleId,
                date: record.date,
                ipAddress: record.ipAddress
            }));

            const recoveredAttendance = await Attendance.insertMany(attendanceToCreate);
            recoveredAttendanceCount = recoveredAttendance.length;
        }

        // Update trash entry as recovered
        trashEntry.isRecovered = true;
        trashEntry.recoveredAt = new Date();
        trashEntry.recoveredBy = userId;
        await trashEntry.save();

        // Get user details for response
        const user = await User.findById(userId).select('userName userEmail userRole');
        const teacher = await User.findById(trashEntry.subjectDetails.userId).select('userName userEmail');

        res.status(200).json({
            success: true,
            message: 'Subject recovered successfully',
            data: {
                recoveredSubject: {
                    id: recoveredSubject._id,
                    title: recoveredSubject.subjectTitle,
                    code: recoveredSubject.subjectCode,
                    semester: recoveredSubject.semester,
                    department: recoveredSubject.departmentOffering
                },
                teacher: {
                    id: teacher?._id,
                    name: teacher?.userName,
                    email: teacher?.userEmail
                },
                statistics: {
                    recoveredAttendance: recoveredAttendanceCount,
                    registeredStudents: trashEntry.subjectDetails.registeredStudents.length,
                    classSchedules: trashEntry.subjectDetails.classSchedule.length
                },
                recoveredBy: {
                    id: user?._id,
                    name: user?.userName,
                    role: user?.userRole
                },
                recoveredAt: trashEntry.recoveredAt
            }
        });

    } catch (error) {
        console.error('Error recovering from trash:', error);
        res.status(500).json({
            success: false,
            message: 'Error recovering subject from trash',
            error: error.message
        });
    }
};

export const getTrashItem = async (req, res) => {
    try {
        const {
            search,
            deletedFrom,
            teacherId,
            startDate,
            endDate,
            sortBy = 'deletedAt',
            sortOrder = 'desc'
        } = req.query;

        // Build query
        const query = { isRecovered: false };

        // Filter by who deleted (Teacher/Admin)
        if (deletedFrom) {
            query.deletedFrom = deletedFrom;
        }

        // Filter by specific teacher
        if (teacherId && mongoose.Types.ObjectId.isValid(teacherId)) {
            query['subjectDetails.userId'] = teacherId;
        }

        // Search by subject title or code
        if (search) {
            query.$or = [
                { 'subjectDetails.subjectTitle': { $regex: search, $options: 'i' } },
                { 'subjectDetails.subjectCode': { $regex: search, $options: 'i' } },
                { 'subjectDetails.semester': { $regex: search, $options: 'i' } }
            ];
        }

        // Date range filter
        if (startDate || endDate) {
            query.deletedAt = {};
            if (startDate) {
                query.deletedAt.$gte = new Date(startDate);
            }
            if (endDate) {
                query.deletedAt.$lte = new Date(endDate);
            }
        }

        // Sorting
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Execute query without pagination
        const trashItems = await Trash.find(query)
            .populate('deletedBy', 'userName userEmail userRole')
            .populate('subjectDetails.userId', 'userName userEmail')
            .sort(sort);

        // Format response
        const formattedItems = trashItems.map(item => {
            const daysRemaining = Math.ceil((item.expiresAt - new Date()) / (1000 * 60 * 60 * 24));

            return {
                id: item._id,
                originalSubjectId: item.originalSubjectId,
                subject: {
                    title: item.subjectDetails.subjectTitle,
                    code: item.subjectDetails.subjectCode,
                    department: item.subjectDetails.departmentOffering,
                    creditHours: item.subjectDetails.creditHours,
                    semester: item.subjectDetails.semester,
                    session: item.subjectDetails.session
                },
                teacher: {
                    id: item.subjectDetails.userId?._id,
                    name: item.subjectDetails.userId?.userName || 'Unknown',
                    email: item.subjectDetails.userId?.userEmail || 'Unknown'
                },
                statistics: {
                    registeredStudents: item.subjectDetails.registeredStudents.length,
                    attendanceRecords: item.attendanceRecords.length,
                    classSchedules: item.subjectDetails.classSchedule.length
                },
                deletion: {
                    deletedBy: {
                        id: item.deletedBy?._id,
                        name: item.deletedBy?.userName,
                        role: item.deletedBy?.userRole
                    },
                    deletedAt: item.deletedAt,
                    deletedFrom: item.deletedFrom,
                    expiresAt: item.expiresAt,
                    daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
                    isExpired: daysRemaining <= 0
                }
            };
        });

        // Calculate summary statistics
        const summary = {
            totalItems: formattedItems.length,
            totalAttendanceRecords: formattedItems.reduce((sum, item) => sum + item.statistics.attendanceRecords, 0),
            totalRegisteredStudents: formattedItems.reduce((sum, item) => sum + item.statistics.registeredStudents, 0),
            totalClassSchedules: formattedItems.reduce((sum, item) => sum + item.statistics.classSchedules, 0),
            byDeletionType: {
                teacher: formattedItems.filter(item => item.deletion.deletedFrom === 'Teacher').length,
                admin: formattedItems.filter(item => item.deletion.deletedFrom === 'Admin').length
            },
            expiredItems: formattedItems.filter(item => item.deletion.isExpired).length
        };

        res.status(200).json({
            success: true,
            message: 'Trash items fetched successfully',
            data: {
                items: formattedItems,
                summary: summary
            }
        });

    } catch (error) {
        console.error('Error fetching trash items:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching trash items',
            error: error.message
        });
    }
};

export const getTrashItemDetails = async (req, res) => {
    try {
        const { trashId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(trashId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid trash ID'
            });
        }

        const trashItem = await Trash.findById(trashId)
            .populate('deletedBy', 'userName userEmail userRole')
            .populate('recoveredBy', 'userName userEmail userRole')
            .populate('subjectDetails.userId', 'userName userEmail');

        if (!trashItem) {
            return res.status(404).json({
                success: false,
                message: 'Trash item not found'
            });
        }

        // Calculate days remaining
        const daysRemaining = Math.ceil((trashItem.expiresAt - new Date()) / (1000 * 60 * 60 * 24));

        // Group attendance records by date
        const attendanceByDate = {};
        trashItem.attendanceRecords.forEach(record => {
            const dateStr = new Date(record.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

            if (!attendanceByDate[dateStr]) {
                attendanceByDate[dateStr] = {
                    date: record.date,
                    count: 0,
                    students: []
                };
            }
            attendanceByDate[dateStr].count++;
            attendanceByDate[dateStr].students.push({
                name: record.studentName,
                rollNo: record.rollNo,
                time: record.time,
                discipline: record.discipline
            });
        });

        // Group attendance by student
        const attendanceByStudent = {};
        trashItem.attendanceRecords.forEach(record => {
            if (!attendanceByStudent[record.rollNo]) {
                attendanceByStudent[record.rollNo] = {
                    studentName: record.studentName,
                    rollNo: record.rollNo,
                    discipline: record.discipline,
                    totalAttendance: 0,
                    dates: []
                };
            }
            attendanceByStudent[record.rollNo].totalAttendance++;
            attendanceByStudent[record.rollNo].dates.push({
                date: record.date,
                time: record.time
            });
        });

        res.status(200).json({
            success: true,
            message: 'Trash item details fetched successfully',
            data: {
                id: trashItem._id,
                originalSubjectId: trashItem.originalSubjectId,
                subjectDetails: {
                    title: trashItem.subjectDetails.subjectTitle,
                    code: trashItem.subjectDetails.subjectCode,
                    department: trashItem.subjectDetails.departmentOffering,
                    creditHours: trashItem.subjectDetails.creditHours,
                    semester: trashItem.subjectDetails.semester,
                    session: trashItem.subjectDetails.session,
                    status: trashItem.subjectDetails.status,
                    createdDate: trashItem.subjectDetails.createdDate,
                    teacher: {
                        id: trashItem.subjectDetails.userId?._id,
                        name: trashItem.subjectDetails.userId?.userName,
                        email: trashItem.subjectDetails.userId?.userEmail
                    }
                },
                classSchedule: trashItem.subjectDetails.classSchedule.map(schedule => ({
                    day: schedule.day,
                    startTime: schedule.startTime,
                    endTime: schedule.endTime
                })),
                registeredStudents: trashItem.subjectDetails.registeredStudents.map(student => ({
                    id: student._id,
                    registrationNo: student.registrationNo,
                    studentName: student.studentName,
                    discipline: student.discipline
                })),
                attendanceOverview: {
                    totalRecords: trashItem.attendanceRecords.length,
                    uniqueDates: Object.keys(attendanceByDate).length,
                    uniqueStudents: Object.keys(attendanceByStudent).length,
                    byDate: attendanceByDate,
                    byStudent: Object.values(attendanceByStudent)
                },
                deletionInfo: {
                    deletedBy: {
                        id: trashItem.deletedBy?._id,
                        name: trashItem.deletedBy?.userName,
                        email: trashItem.deletedBy?.userEmail,
                        role: trashItem.deletedBy?.userRole
                    },
                    deletedAt: trashItem.deletedAt,
                    deletedFrom: trashItem.deletedFrom,
                    expiresAt: trashItem.expiresAt,
                    daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
                    isExpired: daysRemaining <= 0
                },
                recoveryInfo: trashItem.isRecovered ? {
                    recoveredAt: trashItem.recoveredAt,
                    recoveredBy: {
                        id: trashItem.recoveredBy?._id,
                        name: trashItem.recoveredBy?.userName,
                        email: trashItem.recoveredBy?.userEmail,
                        role: trashItem.recoveredBy?.userRole
                    }
                } : null
            }
        });

    } catch (error) {
        console.error('Error fetching trash item details:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching trash item details',
            error: error.message
        });
    }
};

export const permanentDeleteFromTrash = async (req, res) => {
    try {
        const { trashId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(trashId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid trash ID'
            });
        }

        const trashEntry = await Trash.findById(trashId);

        if (!trashEntry) {
            return res.status(404).json({
                success: false,
                message: 'Trash entry not found'
            });
        }

        // Store data for response before deletion
        const deletedData = {
            subjectTitle: trashEntry.subjectDetails.subjectTitle,
            subjectCode: trashEntry.subjectDetails.subjectCode,
            attendanceCount: trashEntry.attendanceRecords.length,
            studentCount: trashEntry.subjectDetails.registeredStudents.length,
            deletedAt: trashEntry.deletedAt
        };

        // Permanently delete from trash
        await Trash.findByIdAndDelete(trashId);

        res.status(200).json({
            success: true,
            message: 'Subject permanently deleted from trash',
            data: {
                permanentlyDeleted: {
                    subject: {
                        title: deletedData.subjectTitle,
                        code: deletedData.subjectCode
                    },
                    statistics: {
                        attendanceRecords: deletedData.attendanceCount,
                        registeredStudents: deletedData.studentCount
                    },
                    deletedAt: deletedData.deletedAt,
                    permanentlyDeletedAt: new Date()
                }
            }
        });

    } catch (error) {
        console.error('Error permanently deleting from trash:', error);
        res.status(500).json({
            success: false,
            message: 'Error permanently deleting from trash',
            error: error.message
        });
    }
};
