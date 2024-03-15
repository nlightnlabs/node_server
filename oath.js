const express = require('express');
const passport = require('passport');
const OAuth2Strategy = require('passport-oauth2').Strategy;

const app = express();

// Configure OAuth strategy
passport.use(new OAuth2Strategy({
  authorizationURL: 'https://provider.com/oauth2/authorize',
  tokenURL: 'https://provider.com/oauth2/token',
  clientID: 'your-client-id',
  clientSecret: 'your-client-secret',
  callbackURL: 'http://localhost:3000/callback'
}, (accessToken, refreshToken, profile, cb) => {
  // Verify and process user profile
  return cb(null, profile);
}));

// Initialize Passport
app.use(passport.initialize());

// Define routes
app.get('/auth/provider', passport.authenticate('oauth2'));
app.get('/callback', passport.authenticate('oauth2', { failureRedirect: '/login' }), (req, res) => {
  // Successful authentication, redirect to home page or handle as needed
  res.redirect('/');
});

// Protected route
app.get('/protected', (req, res) => {
  // Ensure user is authenticated
  if (req.isAuthenticated()) {
    res.send('Protected resource');
  } else {
    res.redirect('/login');
  }
});

// Start server
app.listen(3000, () => {
  console.log('Server started on http://localhost:3000');
});
