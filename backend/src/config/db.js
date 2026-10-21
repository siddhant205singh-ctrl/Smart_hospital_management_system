const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartcare');
    console.log(`[SmartCare DB] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[SmartCare DB] Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
