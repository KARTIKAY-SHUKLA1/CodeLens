require('dotenv').config();
const app = require('./src/app');

// Use PORT from environment variables, fallback to 5000
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Log important config for debugging
    if (process.env.NODE_ENV === 'development') {
        console.log('Configuration loaded:');
        console.log(`- CORS Origin: ${process.env.CORS_ORIGIN}`);
        console.log(`- Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
        console.log(`- Supabase: ${process.env.SUPABASE_URL ? 'Connected' : 'Not configured'}`);
        console.log(`- Google Gemini: ${process.env.GOOGLE_GEMINI_KEY ? 'API Key loaded' : 'No API key'}`);
        console.log(`- GitHub OAuth: ${process.env.GITHUB_CLIENT_ID ? 'Configured' : 'Not configured'}`);
    }
});