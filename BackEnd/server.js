// Load environment variables first
require('dotenv').config();

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars);
  process.exit(1);
}

const app = require('./src/app');

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
  
  // Log important config for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('\n📋 Configuration loaded:');
    console.log(`- CORS Origin: ${process.env.CORS_ORIGIN || 'Not set'}`);
    console.log(`- Supabase URL: ${process.env.SUPABASE_URL ? '✓ Connected' : '❌ Not configured'}`);
    console.log(`- Supabase Service Key: ${process.env.SUPABASE_SERVICE_KEY ? '✓ Loaded' : '❌ Missing'}`);
    console.log(`- JWT Secret: ${process.env.JWT_SECRET ? '✓ Loaded' : '❌ Missing'}`);
    console.log(`- Google Gemini Key: ${process.env.GOOGLE_GEMINI_KEY ? '✓ Loaded' : '❌ Missing'}`);
    console.log(`- GitHub Client ID: ${process.env.GITHUB_CLIENT_ID ? '✓ Configured' : '❌ Missing'}`);
    console.log(`- GitHub Client Secret: ${process.env.GITHUB_CLIENT_SECRET ? '✓ Configured' : '❌ Missing'}`);
    console.log('\n🚀 Server ready for requests...\n');
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
    console.log('🔌 All connections closed');
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
  // Don't exit the process in production
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error);
  console.error('🚨 Stack:', error.stack);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

module.exports = server;