const ExpressError = require('../util/express-error');
const User = require('../models/User');
const bcrypt = require('bcrypt');

// Log in user
module.exports.logIn = async (req, res) => {
    const { email, password } = req.body;
    if(!email || !password) {
        throw new ExpressError(400, 'Please provide a username and password to log in.')
    }
    const foundUser = await User.findOne({ email: email });
    if(!foundUser) {
        throw new ExpressError(400, 'Incorrect email or password.');
    }
    const passwordIsValid = await bcrypt.compare(password, foundUser.password);
    if(!passwordIsValid) {
        throw new ExpressError(400, 'Incorrect email or password.');
    }
    req.session.userId = foundUser._id;
    res.status(200).send({ userId: foundUser._id });
}

// Log out user
module.exports.logOut = async (req, res) => {
    req.session.userId = null;
    res.status(200).send({ userId: null, message:'OK' });
}

// Create new user
module.exports.signUp = async (req, res) => {
    const { email, password } = req.body;
    if(!email || !password) {
        throw new ExpressError(400, 'Please provide a username and password to log in.')
    }
    const foundUser = await User.findOne({ email: email });
    if(!foundUser) {
        const { _id: userId } = await User.create({ email: email, password: password });
        if(!userId) {
            throw new ExpressError(500, 'Failed to create new user');
        }
        req.session.userId = userId;
        res.status(200).send({ userId: userId});
    } else {
        throw new ExpressError(404, 'This user already exists in the system.');
    }
}

// Check if user is already logged
module.exports.validateSession = (req, res) => {
    // Use isLoggedIn middleware before this function to confirm if user is logged in,
    // then send back user id for front end use
    res.status(200).send({ userId: req.session.userId });
}