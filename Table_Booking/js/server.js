


const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname, '..', 'public'))); // Serve the HTML file

app.use('/css', express.static(path.join(__dirname, '..', 'css')));
app.use('/js', express.static(path.join(__dirname, '..', 'js')));
app.use('/img', express.static(path.join(__dirname, '..', 'img')));
app.use('/lib', express.static(path.join(__dirname, '..', 'lib')));

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'usersystem',
});


app.use(session({
    secret: 'rdp676',
    resave: false,
    saveUninitialized: true,
}));

db.connect((err) => {
    if (err) {
        console.error('Database connection failed: ' + err.stack);
        return;
    }
    console.log('Connected to the database.');
});

// Serve login.html
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});

// Serve signup.html
app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'signup.html'));
});

app.get('/navbar', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'navbar.html'));
});

app.get('/forgot-password', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'forgot-password.html'));
});
app.get('/reset-password', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'reset-password.html'));
});

// Serve index.html on the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html')); // Serve index.html from the public folder
});


// Signup Endpoint
app.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;

    // Check if user already exists
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (results.length > 0) {
            return res.json({ message: 'Email already registered!' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user
        db.query(
            'INSERT INTO Users (name, email, password) VALUES (?, ?, ?)',
            [name, email, hashedPassword],
            (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ message: 'Error registering user.' });
                }
                res.json({ message: 'Signup successful!' });
            }
        );
    });
});


app.post('/login', (req, res) => {
    const { email, password } = req.body;
    req.session.userr = { email };

    db.query('SELECT * FROM Users WHERE email = ?', [email], async (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Internal server error!' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'Email not found!' });
        }

        const user = results[0];
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(401).json({ message: 'Invalid password!' });
        }
        if (!res.headersSent) {
            res.status(200).json({ message: 'Login successful!', redirectUrl: '/index.html' });
            // res.redirect('/navbar');
        }
    });
});

app.post('/forgot-password', (req, res) => {
    const { email } = req.body;

    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Internal server error!' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'Email not found!' });
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'bookify676@gmail.com',
                pass: 'utik aaed zdvx xrhi',
            },
        });

        const mailOptions = {
            from: email,
            to: email,
            subject: 'Password Reset Request',
            text: `Click the link to reset your password: http://localhost:3000/reset-password?email=${encodeURIComponent(email)}`,
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ message: 'Error sending password reset email.' });
            }
            res.status(200).json({ message: 'Password reset email sent! Please check your inbox.' });
        });
    });
});

app.post('/reset-password', (req, res) => {
    const { email, newPassword } = req.body;

    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Internal server error!' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'Email not found!' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        db.query('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email], (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: 'Error updating password.' });
            }
            if (!res.headersSent) {
                res.status(200).json({ message: 'Password has been reset successfully!......', redirectUrl: '/login' });
                // res.redirect('/login');
            }
        });
    });
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

// Nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'abc@gmail.com',
        pass: 'your password',
    },
});

// Email sending route
app.post('/send-email', async (req, res) => {
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

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});


// Export Express app for serverless function
//module.exports = app
