const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
// const mysql = require('mysql2'); // MySQL commented out - not using database
// const bcrypt = require('bcrypt'); // bcrypt commented out - not using database

// MongoDB Atlas - NEW CODE
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Using bcryptjs instead of bcrypt for Vercel compatibility

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(cors());

// Serve static files FIRST - before any other routes
// Set MIME types for static files
app.use('/css', express.static(path.join(__dirname, '..', 'css'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        }
    }
}));

// Serve js directory - main.js and search-filter.js are in the same directory as server.js
app.use('/js', express.static(path.join(__dirname), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    },
    // Don't serve server.js through this route
    index: false
}));

// Explicitly serve main.js
app.get('/js/main.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(path.join(__dirname, 'main.js'));
});

// Explicitly serve search-filter.js
app.get('/js/search-filter.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(path.join(__dirname, 'search-filter.js'));
});

// Explicit routes for commonly accessed lib files
app.get('/lib/counterup/counterup.min.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(path.join(__dirname, '..', 'lib', 'counterup', 'counterup.min.js'));
});

app.get('/lib/tempusdominus/js/tempusdominus-bootstrap-4.min.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(path.join(__dirname, '..', 'lib', 'tempusdominus', 'js', 'tempusdominus-bootstrap-4.min.js'));
});

app.get('/lib/tempusdominus/js/moment-timezone.min.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(path.join(__dirname, '..', 'lib', 'tempusdominus', 'js', 'moment-timezone.min.js'));
});

app.get('/lib/tempusdominus/css/tempusdominus-bootstrap-4.min.css', (req, res) => {
    res.setHeader('Content-Type', 'text/css');
    res.sendFile(path.join(__dirname, '..', 'lib', 'tempusdominus', 'css', 'tempusdominus-bootstrap-4.min.css'));
});

app.get('/lib/animate/animate.min.css', (req, res) => {
    res.setHeader('Content-Type', 'text/css');
    res.sendFile(path.join(__dirname, '..', 'lib', 'animate', 'animate.min.css'));
});

app.get('/lib/owlcarousel/assets/owl.carousel.min.css', (req, res) => {
    res.setHeader('Content-Type', 'text/css');
    res.sendFile(path.join(__dirname, '..', 'lib', 'owlcarousel', 'assets', 'owl.carousel.min.css'));
});

app.get('/css/bootstrap.min.css', (req, res) => {
    res.setHeader('Content-Type', 'text/css');
    res.sendFile(path.join(__dirname, '..', 'css', 'bootstrap.min.css'));
});

app.get('/css/style.css', (req, res) => {
    res.setHeader('Content-Type', 'text/css');
    res.sendFile(path.join(__dirname, '..', 'css', 'style.css'));
});

app.use('/img', express.static(path.join(__dirname, '..', 'img')));

// Serve lib directory with proper MIME types for JS and CSS files
app.use('/lib', express.static(path.join(__dirname, '..', 'lib'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        } else if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        }
    }
}));

// Middleware to protect HTML files before static file serving
app.use((req, res, next) => {
    // If requesting an HTML file, check authentication
    if (req.path.endsWith('.html')) {
        // Public HTML pages that don't require authentication
        const publicPages = ['/login.html', '/signup.html', '/forgot-password.html', '/reset-password.html'];

        if (publicPages.includes(req.path)) {
            // Public page, allow access
            return next();
        } else {
            // Protected page, require authentication
            return requireAuth(req, res, next);
        }
    }
    // Not an HTML file, allow static file serving
    next();
});

// Serve static files from public directory (images, etc.)
// HTML files are handled by routes above or the middleware above
app.use(express.static(path.join(__dirname, '..', 'public')));

// MySQL Database Connection - COMMENTED OUT
// const db = mysql.createConnection({
//     host: 'localhost',
//     user: 'root',
//     password: '',
//     database: 'usersystem',
// });

// MongoDB Atlas Connection - NEW CODE
// IMPORTANT: Never hardcode credentials in source code!
// Set MONGODB_URI as an environment variable in Vercel or use a .env file locally
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://rajpatel:HpReE24BZtapObk8@cluster0.hpw6hlv.mongodb.net/bookify?retryWrites=true&w=majority';

if (!MONGODB_URI) {
    console.error('ERROR: MONGODB_URI environment variable is not set!');
    console.error('Please set MONGODB_URI in your Vercel environment variables or .env file.');
}

// Session configuration - using MongoDB session store for production
// We'll create the session store after mongoose connection is established
const MongoStore = require('connect-mongo');

// Configure session store - create it lazily to avoid SSL errors
// For now, use MemoryStore and upgrade to MongoDB store after connection
let sessionStore = null;

// Function to initialize MongoDB session store (called after mongoose connection)
function initializeSessionStore() {
    if (!MONGODB_URI) {
        console.warn('⚠️  MONGODB_URI not set, using MemoryStore for sessions');
        return null;
    }

    // Check if mongoose is connected
    if (mongoose.connection.readyState !== 1) {
        console.warn('⚠️  Mongoose not connected yet, session store will use MemoryStore');
        return null;
    }

    try {
        // For serverless, use mongoUrl instead of client to avoid connection issues
        const store = MongoStore.create({
            mongoUrl: MONGODB_URI,
            touchAfter: 24 * 3600, // Lazy session update (24 hours)
            ttl: 7 * 24 * 60 * 60, // Session expires after 7 days
            autoRemove: 'native',
            stringify: false,
        });
        console.log('✅ MongoDB session store initialized successfully');
        console.log('📝 Sessions will be stored in MongoDB collection: sessions');
        return store;
    } catch (err) {
        console.error('❌ Error creating MongoDB session store:', err.message || err);
        console.warn('⚠️  Falling back to MemoryStore (sessions will not persist across restarts)');
        return null;
    }
}

app.use(session({
    secret: process.env.SESSION_SECRET || 'rdp676',
    resave: false,
    saveUninitialized: false, // Changed to false for security
    store: sessionStore || undefined, // Use MongoDB store if available, otherwise use default (MemoryStore for dev)
    cookie: {
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        httpOnly: true, // Prevents XSS attacks
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        sameSite: 'lax', // Works for same-origin requests
    }
}));

// MySQL Database Connection - COMMENTED OUT
// db.connect((err) => {
//     if (err) {
//         console.error('Database connection failed: ' + err.stack);
//         return;
//     }
//     console.log('Connected to the database.');
// });

// Configure mongoose for serverless (Vercel)
mongoose.set('bufferCommands', false);
// Note: bufferMaxEntries was removed in Mongoose 8.x, so we don't set it

// Connection state
let isConnected = false;

// Function to ensure MongoDB connection
async function ensureMongoConnection() {
    if (!MONGODB_URI) {
        console.error('❌ MONGODB_URI is not set. Please configure it in environment variables.');
        return false;
    }

    // Check if already connected
    if (mongoose.connection.readyState === 1) {
        console.log('✅ MongoDB already connected');
        return true;
    }

    // If connecting, wait a bit
    if (mongoose.connection.readyState === 2) {
        console.log('⏳ MongoDB connection in progress, waiting...');
        // Wait for connection to complete (max 5 seconds)
        for (let i = 0; i < 10; i++) {
            await new Promise(resolve => setTimeout(resolve, 500));
            if (mongoose.connection.readyState === 1) {
                console.log('✅ MongoDB connection established');
                return true;
            }
            if (mongoose.connection.readyState === 0) {
                console.log('⚠️  Connection attempt failed, retrying...');
                break; // Connection failed, try to reconnect
            }
        }
    }

    // If disconnected or never connected, try to connect
    if (mongoose.connection.readyState === 0 || mongoose.connection.readyState === 3) {
        console.log('🔄 Attempting to connect to MongoDB Atlas...');
        try {
            await mongoose.connect(MONGODB_URI, {
                serverSelectionTimeoutMS: 10000, // Timeout after 10s
                socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
                maxPoolSize: 10, // Maintain up to 10 socket connections
                minPoolSize: 1, // Maintain at least 1 socket connection
            });
            isConnected = true;
            console.log('✅ Connected to MongoDB Atlas successfully');
            console.log('📊 Database: bookify');
            console.log('📝 Note: Collection "users" will be created automatically on first signup');

            // Initialize session store after successful connection
            if (!sessionStore) {
                sessionStore = initializeSessionStore();
                // Note: New sessions will use MongoDB store
                if (sessionStore) {
                    console.log('✅ Session store upgraded to MongoDB');
                }
            }

            return true;
        } catch (err) {
            console.error('❌ MongoDB Atlas connection error:', err.message || err);
            console.error('Connection error details:', {
                name: err.name,
                code: err.code,
                codeName: err.codeName
            });
            
            // Provide helpful error messages
            if (err.name === 'MongoServerSelectionError') {
                console.error('💡 Tip: Check your network connection and MongoDB Atlas IP whitelist');
            } else if (err.message && err.message.includes('authentication')) {
                console.error('💡 Tip: Check your MongoDB username and password');
            } else if (err.message && err.message.includes('timeout')) {
                console.error('💡 Tip: Connection timeout - check your network or MongoDB Atlas status');
            }
            
            isConnected = false;
            return false;
        }
    }

    // If we get here, connection state is unknown
    console.warn('⚠️  Unknown MongoDB connection state:', mongoose.connection.readyState);
    return mongoose.connection.readyState === 1;
}

// MongoDB User Schema - NEW CODE
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const User = mongoose.model('User', userSchema);

// Authentication Middleware - Check if user is logged in
function requireAuth(req, res, next) {
    // Check if user is authenticated
    if (req.session && req.session.userr) {
        // User is authenticated, proceed to next middleware
        console.log('✅ User authenticated:', req.session.userr.email);
        return next();
    } else {
        // User is not authenticated, redirect to login page
        console.log('❌ User not authenticated');
        console.log('Session exists:', !!req.session);
        console.log('Session userr:', req.session?.userr);
        console.log('Session ID:', req.sessionID);
        console.log('Request path:', req.path);
        
        // For API requests, return JSON error
        if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
            return res.status(401).json({
                message: 'Authentication required',
                redirectUrl: '/login.html'
            });
        }
        // For HTML requests, redirect to login
        console.log('Redirecting to /login.html');
        return res.redirect('/login.html');
    }
}

// Public routes - No authentication required
// Serve login.html - redirect if already logged in
app.get('/login', (req, res) => {
    if (req.session && req.session.userr) {
        // Already logged in, redirect to home
        return res.redirect('/index.html');
    }
    res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});
app.get('/login.html', (req, res) => {
    if (req.session && req.session.userr) {
        // Already logged in, redirect to home
        return res.redirect('/index.html');
    }
    res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});

// Serve signup.html
app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'signup.html'));
});
app.get('/signup.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'signup.html'));
});

app.get('/forgot-password', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'forgot-password.html'));
});
app.get('/forgot-password.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'forgot-password.html'));
});

app.get('/reset-password', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'reset-password.html'));
});
app.get('/reset-password.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'reset-password.html'));
});

// Protected routes - Authentication required
// Serve index.html on the root route
app.get('/', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});
app.get('/index.html', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.get('/navbar', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'navbar.html'));
});
app.get('/navbar.html', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'navbar.html'));
});

app.get('/about.html', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'about.html'));
});

app.get('/booking.html', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'booking.html'));
});

app.get('/booking-details.html', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'booking-details.html'));
});

app.get('/contact.html', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'contact.html'));
});

app.get('/profile.html', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'profile.html'));
});

app.get('/mumbai.html', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'mumbai.html'));
});


// Signup Endpoint - MySQL COMMENTED OUT
app.post('/signup', async(req, res) => {
    const { name, email, password } = req.body;

    // MySQL Database Query - COMMENTED OUT
    // // Check if user already exists
    // db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    //     if (results.length > 0) {
    //         return res.json({ message: 'Email already registered!' });
    //     }

    //     // Hash password
    //     const hashedPassword = await bcrypt.hash(password, 10);

    //     // Insert new user
    //     db.query(
    //         'INSERT INTO Users (name, email, password) VALUES (?, ?, ?)',
    //         [name, email, hashedPassword],
    //         (err) => {
    //             if (err) {
    //                 console.error(err);
    //                 return res.status(500).json({ message: 'Error registering user.' });
    //             }
    //             res.json({ message: 'Signup successful!' });
    //         }
    //     );
    // });

    // MongoDB Atlas Signup - NEW CODE
    try {
        // Input validation
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'All fields are required (name, email, password).' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Please enter a valid email address.' });
        }

        // Validate password length
        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
        }

        // Ensure MongoDB connection before query
        const connected = await ensureMongoConnection();
        if (!connected) {
            console.error('❌ MongoDB connection failed in signup endpoint');
            console.error('Connection state:', mongoose.connection.readyState);
            console.error('States: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting');
            return res.status(500).json({ 
                message: 'Database connection failed. Please check your MongoDB connection and try again.',
                error: 'CONNECTION_ERROR'
            });
        }
        console.log('✅ MongoDB connected, proceeding with signup...');

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered!' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const newUser = new User({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword
        });

        await newUser.save();
        console.log('User created successfully:', newUser.email);
        res.status(200).json({ message: 'Signup successful! Please login.' });
    } catch (error) {
        console.error('MongoDB signup error:', error);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        // Provide more specific error messages
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: 'Validation error: ' + Object.values(error.errors).map(e => e.message).join(', ') });
        }
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Email already registered!' });
        }
        if (error.message && error.message.includes('buffering timed out')) {
            return res.status(500).json({ message: 'Database connection timeout. Please try again.' });
        }
        res.status(500).json({ message: 'Error registering user. Please try again.' });
    }
});


app.post('/login', async(req, res) => {
    const { email, password } = req.body;

    // MySQL Database Query - COMMENTED OUT
    // db.query('SELECT * FROM Users WHERE email = ?', [email], async (err, results) => {
    //     if (err) {
    //         return res.status(500).json({ message: 'Internal server error!' });
    //     }

    //     if (results.length === 0) {
    //         return res.status(404).json({ message: 'Email not found!' });
    //     }

    //     const user = results[0];
    //     const match = await bcrypt.compare(password, user.password);

    //     if (!match) {
    //         return res.status(401).json({ message: 'Invalid password!' });
    //     }
    //     if (!res.headersSent) {
    //         res.status(200).json({ message: 'Login successful!', redirectUrl: '/index.html' });
    //         // res.redirect('/navbar');
    //     }
    // });

    // MongoDB Atlas Login - NEW CODE
    try {
        // Ensure MongoDB connection before query
        const connected = await ensureMongoConnection();
        if (!connected) {
            console.error('❌ MongoDB connection failed in login endpoint');
            console.error('Connection state:', mongoose.connection.readyState);
            return res.status(500).json({ 
                message: 'Database connection failed. Please check your MongoDB connection and try again.',
                error: 'CONNECTION_ERROR'
            });
        }
        console.log('✅ MongoDB connected, proceeding with login...');

        // Find user by email
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).json({ message: 'Email not found!' });
        }

        // Compare password
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ message: 'Invalid password!' });
        }

        // Set session
        req.session.userr = { email: user.email, name: user.name, id: user._id };
        console.log('📝 Session data set for user:', user.email);
        console.log('📝 Session ID:', req.sessionID);
        
        // Save session before sending response
        req.session.save((err) => {
            if (err) {
                console.error('❌ Error saving session:', err);
                return res.status(500).json({ message: 'Error saving session. Please try again.' });
            }
            
            console.log('✅ Session saved successfully for user:', user.email);
            
            // Check if request accepts HTML (form submission) or JSON (AJAX)
            const acceptsHtml = req.headers.accept && req.headers.accept.includes('text/html');
            
            if (acceptsHtml) {
                // Server-side redirect for form submissions
                console.log('✅ Server-side redirect to /index.html');
                return res.redirect('/index.html');
            } else {
                // JSON response for AJAX requests
                console.log('✅ JSON response with redirect URL');
                res.status(200).json({
                    message: 'Login successful!',
                    redirectUrl: '/index.html',
                    success: true
                });
            }
        });
    } catch (error) {
        console.error('MongoDB login error:', error);
        res.status(500).json({ message: 'Internal server error!' });
    }
});

app.post('/forgot-password', (req, res) => {
    const { email } = req.body;

    // MySQL Database Query - COMMENTED OUT
    // db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    //     if (err) {
    //         return res.status(500).json({ message: 'Internal server error!' });
    //     }

    //     if (results.length === 0) {
    //         return res.status(404).json({ message: 'Email not found!' });
    //     }

    //     const transporter = nodemailer.createTransport({
    //         service: 'gmail',
    //         auth: {
    //             user: 'bookify676@gmail.com',
    //             pass: 'utik aaed zdvx xrhi',
    //         },
    //     });

    //     const mailOptions = {
    //         from: email,
    //         to: email,
    //         subject: 'Password Reset Request',
    //         text: `Click the link to reset your password: http://localhost:3000/reset-password?email=${encodeURIComponent(email)}`,
    //     };

    //     transporter.sendMail(mailOptions, (error, info) => {
    //         if (error) {
    //             console.error(error);
    //             return res.status(500).json({ message: 'Error sending password reset email.' });
    //         }
    //         res.status(200).json({ message: 'Password reset email sent! Please check your inbox.' });
    //     });
    // });

    // Mock response (database disabled)
    res.status(200).json({ message: 'Password reset email sent! (Database disabled)' });
});

app.post('/reset-password', (req, res) => {
    const { email, newPassword } = req.body;

    // MySQL Database Query - COMMENTED OUT
    // db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    //     if (err) {
    //         return res.status(500).json({ message: 'Internal server error!' });
    //     }

    //     if (results.length === 0) {
    //         return res.status(404).json({ message: 'Email not found!' });
    //     }

    //     const hashedPassword = await bcrypt.hash(newPassword, 10);

    //     db.query('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email], (err) => {
    //         if (err) {
    //             console.error(err);
    //             return res.status(500).json({ message: 'Error updating password.' });
    //         }
    //         if (!res.headersSent) {
    //             res.status(200).json({ message: 'Password has been reset successfully!......', redirectUrl: '/login' });
    //             // res.redirect('/login');
    //         }
    //     });
    // });

    // Mock response (database disabled)
    res.status(200).json({ message: 'Password has been reset successfully! (Database disabled)', redirectUrl: '/login' });
});

app.get('/check-auth', (req, res) => {
    if (req.session.userr) {
        res.json({ isLoggedIn: true, user: req.session.userr });
    } else {
        res.json({ isLoggedIn: false });
    }
});

app.get('/session-status', (req, res) => {
    if (req.session.userr) {
        return res.json({ loggedIn: true });
    } else {
        return res.json({ loggedIn: false });
    }
});

// Logout Endpoint - NEW CODE
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ message: 'Error logging out' });
        }
        res.clearCookie('connect.sid');
        res.status(200).json({ message: 'Logged out successfully' });
    });
});

// Nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'abc@gmail.com',
        pass: 'your password',
    },
});

// Email sending route
app.post('/send-email', async(req, res) => {
    const { sender, subject, message, name } = req.body;

    if (!sender || !subject || !message || !name) {
        return res.status(400).json({ success: false, error: 'All fields are required.' });
    }

    const mailOptions = {
        from: sender,
        to: 'abc@gmail.com',
        subject: `from ${name} (${sender}): ${subject}`,
        text: `Message:-${message}`,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
        res.json({ success: true });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Initialize MongoDB connection on startup
async function initializeServer() {
    console.log('Initializing server...');
    
    if (!MONGODB_URI) {
        console.error('⚠️  WARNING: MONGODB_URI is not set!');
        console.error('Please set MONGODB_URI in your environment variables.');
        return;
    }

    // Attempt to connect to MongoDB
    try {
        const connected = await ensureMongoConnection();
        if (connected) {
            console.log('✅ MongoDB connection established successfully');
            console.log('📊 Database name: bookify');
            console.log('📝 Collection "users" will be created automatically on first signup');
        } else {
            console.error('❌ Failed to connect to MongoDB');
            console.error('Please check your MONGODB_URI and network connection');
        }
    } catch (error) {
        console.error('❌ Error initializing MongoDB connection:', error.message);
    }
}

// Start the server (only in development, not on Vercel)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, async () => {
        console.log(`Server is running on http://localhost:${PORT}`);
        await initializeServer();
    });
} else {
    // For Vercel, initialize connection when module loads
    initializeServer();
}

// Export Express app for serverless function (required for Vercel)
module.exports = app;