const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Body parser middleware
app.use(express.json());

// Enable CORS
app.use(cors());

// Serve static files from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Dev logging middleware
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Import routes
const reviewRoutes = require('./routes/reviewRoutes');
const authRoutes = require('./routes/authRoutes');
const jwtRoutes = require('./routes/jwtRoutes');
const authController = require('./controllers/authController');
const { protect } = require('./middlewares/auth');

// OPTIONS & HEAD for general health
app.route('/health')
    .get((req, res) => {
        res.status(200).json({
            status: 'UP',
            timestamp: new Date(),
            uptime: process.uptime()
        });
    })
    .head((req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.status(200).end();
    })
    .options((req, res) => {
        res.setHeader('Allow', 'GET, OPTIONS, HEAD');
        res.status(200).end();
    });

// OPTIONS & HEAD for auth session me
app.route('/auth/me')
    .options((req, res) => {
        res.setHeader('Allow', 'GET, OPTIONS');
        res.status(200).end();
    });

// Mount /profile base endpoints
app.route('/profile')
    .get(protect, authController.getProfile)
    .patch(protect, authController.updateProfile);

// Base Welcome Route
app.get('/version', (req, res) => {
    res.status(200).json({
        success: true,
        version: '1.0.0',
        description: 'Meta Glasses Reviews API'
    });
});

// Mount all other routers
app.use('/auth', authRoutes);
app.use('/jwt', jwtRoutes);
app.use('/', reviewRoutes); // Mount review, search, stats at root


// Error handling middleware
app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        success: false,
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
