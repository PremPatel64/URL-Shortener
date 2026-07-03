// Handle uncaught exceptions synchronously before anything else
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION] Shutting down application...');
  console.error(err.name, err.message, err.stack);
  process.exit(1);
});

// Load environment variables using absolute path relative to server.js directory
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = require('./app');
const connectDB = require('./config/db');

// Connect to MongoDB Database
connectDB();

// Start the server
const port = process.env.PORT || 5000;
const server = app.listen(port, () => {
  console.log(`[Server] Running in ${process.env.NODE_ENV || 'development'} mode on port ${port}`);
});

// Handle unhandled promise rejections asynchronously
process.on('unhandledRejection', (err) => {
  console.error('[UNHANDLED REJECTION] Shutting down server gracefully...');
  console.error(err.name, err.message, err.stack);
  
  // Close server and exit process
  server.close(() => {
    process.exit(1);
  });
});
