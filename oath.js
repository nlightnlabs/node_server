// convert "require" to import for ES
import { createRequire } from "module";
const require = createRequire(import.meta.url);

//Import environment evariables
const dotenv = require('dotenv')
dotenv.config();
console.log(process.env.NODE_ENV)


//Create path functions
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

// Import Express and create express app
const express = require('express');
const app = express();

//Set Cors
const cors = require("cors");

//Body parser middleware (for sending back data in html)
var bodyParser = require('body-parser');
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '100mb', extended: true}));
app.use(express.json());
app.use(bodyParser.json());
app.use(cors());
app.options('*', cors());

const { spawn } = require('child_process');
const axios = require('axios');
const fs = require('fs')


const passport = require('passport');
const { Strategy: OAuth2Strategy } = require('passport-oauth2');
const { Pool } = require('pg');


// Replace these placeholders with your actual database and OAuth credentials
const databaseConfig = {
  user: 'your_db_user',
  host: 'your_db_host',
  database: 'your_db_name',
  password: 'your_db_password',
  port: 5432,
};


const crypto = require('crypto');
const generateCredentials = (username)=>{

// Generate a random string of a specified length
const generateRandomString = (length) => {
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
};
  
  // Generate a random client ID (e.g., 32 characters long)
  const clientId = `${username}_clientId_${generateRandomString(32)}`;
    
  // Generate a random client secret (e.g., 64 characters long)
  const clientSecret = `${username}_secret_${generateRandomString(64)}`;

  console.log('Client ID:', clientId);
  console.log('Client Secret:', clientSecret);

  return {clientId, clientSecret}
  
}
const credentials = generateCredentials("avik.ghosh@nlightnlabs.com");

const getAccessToken = ()=>{
  // Generate a random OAuth token (e.g., 128 characters long)
  const accessToken = generateRandomString(128);
  console.log('Access Token:', accessToken);
  return accessToken;
}
const accessToken = getAccessToken;


const oauthConfig = {
  clientID: 'your_client_id',
  clientSecret: 'your_client_secret',
  callbackURL: 'http://localhost:3000/auth/callback', // Update with your actual callback URL
};

// PostgreSQL pool
const pool = new Pool(databaseConfig);

// OAuth2 Strategy
passport.use('oauth2', new OAuth2Strategy(oauthConfig,
  (accessToken, refreshToken, profile, done) => {
    // Use the accessToken to authenticate the user
    // You may also fetch user information from your database here
    return done(null, { accessToken });
  }
));

// Serialize and deserialize user for session management
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// Initialize Passport and restore authentication state if any
app.use(passport.initialize());
app.use(passport.session());

// Define routes
app.get('/auth', passport.authenticate('oauth2'));

app.get('/auth/callback',
  passport.authenticate('oauth2', { failureRedirect: '/' }),
  (req, res) => res.redirect('/profile')
);

app.get('/profile', (req, res) => {
  // Check if user is authenticated
  if (req.isAuthenticated()) {
    // Access the user's access token
    const accessToken = req.user.accessToken;

    // Use the access token to query data from your PostgreSQL database
    pool.query('SELECT * FROM users', (error, result) => {
      if (error) {
        console.error('Error querying database:', error);
        res.status(500).send('Error querying database');
      } else {
        const data = result.rows;
        // Render or send the data to the client
        res.json(data);
      }
    });
  } else {
    res.status(401).send('Unauthorized');
  }
});

// Start the server
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
