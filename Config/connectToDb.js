import mongoose from "mongoose"
import dotenv from "dotenv";
dotenv.config();

const connectToDb = async () => {
    try {
        const connections = await mongoose.connect(process.env.CONNECTION_STRING);
        console.log(`Connected to MongoDB: ${connections.connection.host}`);
        console.log(`Connected to MongoDB: ${connections.connection.port}`);
    } catch (error) {
        console.error("Failed to connect to MongoDB", error.message);
        process.exit(1);
    }

}

export default connectToDb;
