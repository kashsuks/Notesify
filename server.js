const express = require('express');
const { auth } = require('express-openid-connect');
const dotenv = require('dotenv');
const { client } = require('./db');
const cors = require('cors');
const path = require('path'); // Required for file serving
const app = express();
dotenv.config();

const PORT = 3100;

const corsOptions = {
    origin: ["http://localhost:3000"],
};

const config = {
    authRequired: false,
    auth0Logout: true,
    baseURL: 'http://localhost:3000',
    clientID: process.env.AUTH0_CLIENT_ID,
    issuerBaseURL: process.env.AUTH0_ISSUER_URL,
    secret: process.env.AUTH0_SECRET,
};

// Enable CORS and authentication routes
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

// Auth routes for OpenID Connect
app.use(auth(config));

// Middleware for parsing JSON and URL encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the 'recordings' folder
app.use('/recordings', express.static(path.join(__dirname, 'recordings')));

// Use routes for auth, groq, math, summarize, and transcribe
app.use('/auth', require('./app/api/auth/[auth0]/route.js'));
app.use('/groq', require('./app/api/groq/route.js'));
app.use('/math', require('./app/api/math/route.js'));
app.use('/summarize', require('./app/api/summarize/route.js'));
app.use('/transcribe', require('./app/api/transcribe/route.js'));

// Database setup for skillSharing
const db = client.db('skillSharing');
const collection = db.collection('users');

// Route for checking authentication and inserting new user
app.get('/', (req, res) => {
    console.log('GET / route accessed');
    if (req.oidc.isAuthenticated()) {
        const email = req.oidc.user.email;
        console.log(`Authenticated user email: ${email}`);
        collection.find({ email }).toArray().then((result) => {
            console.log('Database query result:', result);
            if (result.length === 0) {
                collection.insertOne({ email }).then(() => {
                    console.log('New user inserted in DB');
                    res.redirect('http://localhost:3000/uploadResume');
                }).catch((err) => {
                    console.error('Error inserting user:', err);
                    res.send(err);
                });
            } else {
                res.redirect('http://localhost:3000/uploadResume');
            }
        });
    } else {
        console.log('User not authenticated');
        res.send('Hello, please log in');
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});