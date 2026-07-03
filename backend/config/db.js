const mongoose = require('mongoose');

/**
 * Establishes connection to MongoDB database
 * Uses Mongoose connection pooling and handles connection errors
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[Database Error] Connection failed: ${error.message}`);
    // Exit process with failure code if unable to connect on startup
    process.exit(1);
  }
};

module.exports = connectDB;
