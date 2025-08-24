require('dotenv').config();
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
app.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Log important config for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
        console.log('Configuration loaded:');
        console.log(`- CORS Origin: ${process.env.CORS_ORIGIN}`);
        console.log(`- Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
        console.log(`- Supabase: ${process.env.SUPABASE_URL ? 'Connected' : 'Not configured'}`);
        console.log(`- Google Gemini: ${process.env.GOOGLE_GEMINI_KEY ? 'API Key loaded' : 'No API key'}`);
        console.log(`- GitHub OAuth: ${process.env.GITHUB_CLIENT_ID ? 'Configured' : 'Not configured'}`);
    }
});

// Graceful shutdown (important for Render/Heroku/etc.)
process.on('SIGTERM', () => {
    console.log('👋 SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('👋 SIGINT received. Shutting down gracefully...');
    process.exit(0);
});
