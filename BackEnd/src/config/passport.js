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
    callbackURL: "/api/auth/github/callback"
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

        console.log('New user created:', newUser);
        return done(null, newUser);
      }
    } catch (error) {
      console.error('GitHub OAuth error:', error);
      return done(error, null);
    }
  }));

  // JWT Strategy for API authentication
  passport.use(new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET
  },
  async (jwtPayload, done) => {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', jwtPayload.userId)
        .single();

      if (error) {
        console.error('JWT Strategy error:', error);
        return done(error, false);
      }

      if (user) {
        return done(null, user);
      } else {
        return done(null, false);
      }
    } catch (error) {
      console.error('JWT Strategy catch error:', error);
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
};