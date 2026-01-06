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
const MONGODB_URI = process.env.MONGODB_URI;

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
        console.warn('MONGODB_URI not set, using MemoryStore for sessions');
        return null;
    }

    // Check if mongoose is connected
    if (mongoose.connection.readyState !== 1) {
        console.warn('Mongoose not connected yet, session store will use MemoryStore');
        return null;
    }

    try {
        // Use mongoose connection instead of creating a new one - this avoids SSL issues
        const store = MongoStore.create({
            client: mongoose.connection.getClient(), // Use existing mongoose connection
            touchAfter: 24 * 3600, // Lazy session update (24 hours)
            ttl: 7 * 24 * 60 * 60, // Session expires after 7 days
            // Auto-remove expired sessions
            autoRemove: 'native',
            // Don't throw errors on connection issues
            stringify: false,
        });
        console.log('MongoDB session store initialized using mongoose connection');
        return store;
    } catch (err) {
        console.error('Error creating MongoDB session store:', err);
        console.warn('Falling back to MemoryStore (sessions will not persist across restarts)');
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
        console.error('MONGODB_URI is not set. Please configure it in environment variables.');
        return false;
    }

    if (isConnected && mongoose.connection.readyState === 1) {
        return true;
    }

    if (mongoose.connection.readyState === 0) {
        try {
            await mongoose.connect(MONGODB_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 10000, // Timeout after 10s
                socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
                maxPoolSize: 10, // Maintain up to 10 socket connections
                minPoolSize: 1, // Maintain at least 1 socket connection
                // SSL/TLS options for MongoDB Atlas
                ssl: true,
                sslValidate: true,
                retryWrites: true,
                w: 'majority',
            });
            isConnected = true;
            console.log('Connected to MongoDB Atlas');

            // Initialize session store after successful connection
            if (!sessionStore) {
                sessionStore = initializeSessionStore();
                // Note: New sessions will use MongoDB store
                if (sessionStore) {
                    console.log('Session store upgraded to MongoDB');
                }
            }

            return true;
        } catch (err) {
            console.error('MongoDB Atlas connection error:', err);
            isConnected = false;
            return false;
        }
    }

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
        return next();
    } else {
        // User is not authenticated, redirect to login page
        // For API requests, return JSON error
        if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
            return res.status(401).json({
                message: 'Authentication required',
                redirectUrl: '/login.html'
            });
        }
        // For HTML requests, redirect to login
        return res.redirect('/login.html');
    }
}

// Public routes - No authentication required
// Serve login.html
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});
app.get('/login.html', (req, res) => {
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
        // Ensure MongoDB connection before query
        const connected = await ensureMongoConnection();
        if (!connected) {
            return res.status(500).json({ message: 'Database connection failed. Please try again.' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered!' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const newUser = new User({
            name: name,
            email: email.toLowerCase(),
            password: hashedPassword
        });

        await newUser.save();
        res.status(200).json({ message: 'Signup successful! Please login.' });
    } catch (error) {
        console.error('MongoDB signup error:', error);
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
            return res.status(500).json({ message: 'Database connection failed. Please try again.' });
        }

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

        res.status(200).json({
            message: 'Login successful!',
            redirectUrl: '/index.html'
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

// Start the server (only in development, not on Vercel)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

// Export Express app for serverless function (required for Vercel)
module.exports = app;