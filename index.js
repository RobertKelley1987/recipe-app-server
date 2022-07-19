if(process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const express = require('express');
const app = express();
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');
const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost/recipe-app'; // database url
const session = require('express-session');
const cors = require('cors');

// Connect to database
mongoose.connect(mongoUrl, { useNewUrlParser: true });

// Configure session store
app.use(session({
    cookie: {
        domain: 'https://remarkable-panda-0f2ef1.netlify.app',
        maxAge: 1000 * 60 * 60 * 12, // 12 hrs,
        sameSite: 'none',
        secure: true
    },
    resave: false,
    saveUninitialized: false,
    secret: process.env.SECRET,
    store: MongoStore.create({ mongoUrl: mongoUrl, touchAfter: 24 * 3600 })
}));

// Use JSON parsing middleware on all routes
app.use(express.json());

// Enable CORS for all routes 
app.use(cors({
    origin: 'https://remarkable-panda-0f2ef1.netlify.app',
    credentials: true
}));

// Import Routes
const indexRoutes = require('./routes/index');
const listRoutes = require('./routes/lists');
const favoriteRoutes = require('./routes/favorites');

// Apply routing middleware
app.use('/', indexRoutes);
app.use('/users/:userId/lists', listRoutes);
app.use('/users/:userId/favorites', favoriteRoutes);

// Error Handling
app.use((err, req, res, next) => {
    if(err) {
        return res.send({ userId: null, err: err });
    }
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log('The server listens...'));