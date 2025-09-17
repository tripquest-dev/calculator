//WOsakhJi6JmGXpHR
import mongoose from "mongoose";

export const connectDB = async () => {
  const conn = await mongoose.connect(process.env.MONGODB_URI);
  if (conn) {
    console.log("Connected to DB, host is", conn.connection.host);
  }
};
