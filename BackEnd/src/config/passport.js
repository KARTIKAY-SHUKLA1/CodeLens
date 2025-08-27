// src/config/passport.js - FIXED VERSION
const GitHubStrategy = require('passport-github2').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase with SERVICE_KEY and proper configuration to bypass RLS
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
      }
    }
  }
);

module.exports = function(passport) {
  
  // GitHub OAuth Strategy
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.NODE_ENV === 'production' 
      ? "https://codelens-backend-0xl0.onrender.com/api/auth/github/callback"
      : "http://localhost:5000/api/auth/github/callback"
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
        // Create new user - using direct insert with service key
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
          last_login: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log('Creating new user with data:', { ...newUserData, github_id: newUserData.github_id });

        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert([newUserData])
          .select()
          .single();

        if (createError) {
          console.error('Error creating user:', createError);
          console.error('User data that failed:', newUserData);
          return done(createError, null);
        }

        console.log('New user created successfully:', newUser.id);
        return done(null, newUser);
      }
    } catch (error) {
      console.error('GitHub OAuth error:', error);
      return done(error, null);
    }
  }));

  // JWT Strategy with proper error handling and validation
  passport.use(new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET,
    algorithms: ['HS256'],
    ignoreExpiration: false,
    passReqToCallback: false
  },
  async (jwtPayload, done) => {
    try {
      console.log('JWT Strategy - Payload received:', {
        userId: jwtPayload.userId,
        id: jwtPayload.id,
        sub: jwtPayload.sub,
        exp: jwtPayload.exp,
        iat: jwtPayload.iat
      });

      // Extract user ID from payload
      let userId;
      if (jwtPayload.userId) {
        userId = jwtPayload.userId;
      } else if (jwtPayload.id) {
        userId = jwtPayload.id;
      } else if (jwtPayload.sub) {
        userId = jwtPayload.sub;
      } else {
        console.error('JWT Strategy - No user ID found in payload');
        return done(null, false, { message: 'Invalid token: missing user identifier' });
      }

      console.log('JWT Strategy - Looking up user ID:', userId);

      // Get user from database
      const { data: user, error } = await supabase
        .from('users')
        .select(`
          id,
          github_id,
          username,
          email,
          name,
          avatar_url,
          plan,
          credits_used,
          credits_limit,
          created_at,
          last_login
        `)
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.error('JWT Strategy - User not found:', userId);
          return done(null, false, { message: 'User not found' });
        }
        console.error('JWT Strategy - Database error:', error);
        return done(error, false);
      }

      if (!user) {
        console.error('JWT Strategy - No user data returned');
        return done(null, false, { message: 'User data not found' });
      }

      console.log('JWT Strategy - User authenticated:', user.id);
      
      // Update last seen timestamp
      supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id)
        .then(() => console.log('User last_login updated'))
        .catch(err => console.error('Failed to update last_login:', err));

      return done(null, user);
    } catch (error) {
      console.error('JWT Strategy - Unexpected error:', error);
      return done(error, false);
    }
  }));

  // Serialize user for session
  passport.serializeUser((user, done) => {
    console.log('Serializing user:', user.id);
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id, done) => {
    try {
      console.log('Deserializing user ID:', id);
      
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Deserialize user error:', error);
        return done(error, null);
      }

      if (!user) {
        console.error('Deserialize - No user found');
        return done(null, false);
      }

      console.log('User deserialized:', user.id);
      done(null, user);
    } catch (error) {
      console.error('Deserialize user catch error:', error);
      done(error, null);
    }
  });

  // Environment validation
  console.log('Passport Configuration Status:');
  
  if (!process.env.JWT_SECRET) {
    console.error('CRITICAL: JWT_SECRET environment variable is not set!');
  } else {
    console.log('JWT_SECRET is configured');
  }

  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    console.warn('WARNING: GitHub OAuth credentials not configured');
  } else {
    console.log('GitHub OAuth is configured');
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('CRITICAL: Supabase credentials not properly configured');
  } else {
    console.log('Supabase is configured');
  }
};