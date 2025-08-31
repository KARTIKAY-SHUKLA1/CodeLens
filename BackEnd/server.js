// Load environment variables first
require('dotenv').config();

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars);
  process.exit(1);
}

// Import the Express app
const app = require('./app'); // Your existing app.js

// Import passport and configure it
const passport = require('passport');

// CRITICAL FIX: Initialize Passport properly
app.use(passport.initialize());
app.use(passport.session());

// Configure Passport strategies - CRITICAL FIX
require('./src/config/passport')(passport);

// Ensure PORT is a valid number
const PORT = (() => {
  const parsed = parseInt(process.env.PORT, 10);
  if (isNaN(parsed)) {
    console.warn(`⚠️ Invalid PORT "${process.env.PORT}", falling back to 5000`);
    return 5000;
  }
  return parsed;
})();

// Start server
const server = app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Check critical environment variables
  console.log('📋 Configuration Status:');
  console.log(`- JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Configured' : '❌ Missing'}`);
  console.log(`- SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅ Connected' : '❌ Not configured'}`);
  console.log(`- SUPABASE_SERVICE_KEY: ${process.env.SUPABASE_SERVICE_KEY ? '✅ Loaded' : '❌ Missing'}`);
  console.log(`- GOOGLE_GEMINI_KEY: ${process.env.GOOGLE_GEMINI_KEY ? '✅ Loaded' : '❌ Missing'}`);
  console.log(`- GitHub OAuth: ${process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET ? '✅ Configured' : '⚠️ Missing'}`);
  
  if (process.env.NODE_ENV === 'production') {
    console.log('🚀 Production server ready');
  } else {
    console.log('🛠️ Development server ready');
  }
});

// Handle server startup errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please use a different port.`);
  } else {
    console.error('❌ Server startup error:', error);
  }
  process.exit(1);
});

// Graceful shutdown handlers
const gracefulShutdown = (signal) => {
  console.log(`\n👋 ${signal} received. Starting graceful shutdown...`);
  
  server.close((err) => {
    if (err) {
      console.error('❌ Error during server shutdown:', err);
      process.exit(1);
    }
    
    console.log('✅ Server closed successfully');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('⚠️ Forced shutdown after 10 seconds');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled rejections and exceptions
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise);
  console.error('🚨 Reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

module.exports = server;