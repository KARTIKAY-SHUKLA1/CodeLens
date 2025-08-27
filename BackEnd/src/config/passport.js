// src/config/passport.js
const GitHubStrategy = require('passport-github2').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://db.oqrnlnvrrnugkxhjixyr.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || ''
);

module.exports = function(passport) {
  
  // GitHub OAuth Strategy
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.NODE_ENV === 'production' 
      ? "https://codelens-backend-0xl0.onrender.com/api/auth/github/callback"
      : "/api/auth/github/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('GitHub OAuth Profile:', {
        id: profile.id,
        username: profile.username,
        email: profile.emails?.[0]?.value,
        name: profile.displayName
      });

      // Check if user already exists
      const { data: existingUser, error: findError } = await supabase
        .from('users')
        .select('*')
        .eq('github_id', profile.id)
        .single();

      if (findError && findError.code !== 'PGRST116') {
        console.error('Error finding user:', findError);
        return done(findError, null);
      }

      if (existingUser) {
        // Update user's last login
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({ 
            last_login: new Date().toISOString(),
            avatar_url: profile.photos?.[0]?.value || existingUser.avatar_url,
            name: profile.displayName || existingUser.name
          })
          .eq('id', existingUser.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating user:', updateError);
          return done(updateError, null);
        }

        console.log('Existing user authenticated:', updatedUser.id);
        return done(null, updatedUser);
      } else {
        // Create new user
        const newUserData = {
          github_id: profile.id,
          username: profile.username,
          email: profile.emails?.[0]?.value || null,
          name: profile.displayName || profile.username,
          avatar_url: profile.photos?.[0]?.value || null,
          github_profile_url: profile.profileUrl,
          plan: 'free',
          credits_used: 0,
          credits_limit: 100,
          last_login: new Date().toISOString()
        };

        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert([newUserData])
          .select()
          .single();

        if (createError) {
          console.error('Error creating user:', createError);
          return done(createError, null);
        }

        console.log('New user created:', newUser.id);
        return done(null, newUser);
      }
    } catch (error) {
      console.error('GitHub OAuth error:', error);
      return done(error, null);
    }
  }));

  // FIXED: JWT Strategy for API authentication with better error handling and flexible payload support
  passport.use(new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET,
    // ADDED: Handle missing JWT_SECRET more gracefully
    passReqToCallback: false
  },
  async (jwtPayload, done) => {
    try {
      console.log('JWT Strategy - Payload received:', jwtPayload);

      // FIXED: Support multiple possible payload structures
      let userId;
      if (jwtPayload.userId) {
        userId = jwtPayload.userId;
      } else if (jwtPayload.id) {
        userId = jwtPayload.id;
      } else if (jwtPayload.sub) {
        userId = jwtPayload.sub;  // Standard JWT subject claim
      } else {
        console.error('JWT Strategy - No user ID found in payload:', Object.keys(jwtPayload));
        return done(null, false, { message: 'Invalid token payload structure' });
      }

      console.log('JWT Strategy - Looking up user ID:', userId);

      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // User not found
          console.error('JWT Strategy - User not found:', userId);
          return done(null, false, { message: 'User not found' });
        }
        console.error('JWT Strategy - Database error:', error);
        return done(error, false);
      }

      if (user) {
        console.log('JWT Strategy - User authenticated:', user.id);
        return done(null, user);
      } else {
        console.error('JWT Strategy - No user returned from database');
        return done(null, false, { message: 'Authentication failed' });
      }
    } catch (error) {
      console.error('JWT Strategy - Unexpected error:', error);
      return done(error, false);
    }
  }));

  // Serialize user for session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id, done) => {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Deserialize user error:', error);
        return done(error, null);
      }

      done(null, user);
    } catch (error) {
      console.error('Deserialize user catch error:', error);
      done(error, null);
    }
  });

  // ADDED: Helper function to validate JWT_SECRET exists
  if (!process.env.JWT_SECRET) {
    console.error('CRITICAL: JWT_SECRET environment variable is not set!');
    console.error('This will cause all JWT authentication to fail.');
    console.error('Please set JWT_SECRET in your environment variables.');
  } else {
    console.log('JWT_SECRET is configured');
  }
};