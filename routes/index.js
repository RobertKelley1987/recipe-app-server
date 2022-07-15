const express = require('express');
const router = express.Router({ mergeParams: true });

const catchAsync = require('../util/catch-async');
const isLoggedIn = require('../middleware');
const users = require('../controllers/users');

// Check cookie from browser to find out if user is logged in
router.get('/sessions', isLoggedIn, users.validateSession);

// Sign up new user 
router.post('/signup', catchAsync(users.signUp));

// Login user
router.post('/login', catchAsync(users.logIn));

// Logout user
router.post('/logout', catchAsync(users.logOut));

module.exports = router;