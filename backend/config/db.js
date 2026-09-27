const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Attempt to connect to the database using the URI from our .env file
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1); // Exit the Node process with a failure code if the database fails to connect
  }
};

module.exports = connectDB;