require('dotenv').config();

const express = require('express');
const app = express();
const mongoose = require('mongoose');
const { mongoUrl } = require('./constants');
const session = require('./session-options');
const User = require('./models/User');
const ExpressError = require('./util/express-error');
const isLoggedIn = require('./middleware');
const bcrypt = require('bcrypt');

mongoose.connect(mongoUrl, { useNewUrlParser: true });
app.use(session);
app.use(express.json());

app.get('/sessions', isLoggedIn, (req, res) => {
    // confirmed user is logged in via middleware
    const { userId } = req.session;
    res.status(200).send({ userId });
});

app.post('/signup', async (req, res) => {
    const { email, password } = req.body;
    const foundUser = await User.findOne({ email: email });
    if(!foundUser) {
        const { _id } = await User.create({ email: email, password: password });
        if(!_id) {
            throw new ExpressError(500, 'Failed to create new user');
        }
        req.session.userId = _id;
        res.status(200).send({ userId: _id});
    } else {
        throw new ExpressError(400, 'This user already exists in the system');
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const foundUser = await User.findOne({ email: email });
    if(!foundUser) {
        throw new ExpressError(400, 'Incorrect email or password');
    }
    const passwordIsValid = await bcrypt.compare(password, foundUser.password);
    if(!passwordIsValid) {
        throw new ExpressError(400, 'Incorrect email or password');
    }
    req.session.userId = foundUser._id;
    res.status(200).send({ userId: foundUser._id });
});

app.post('/logout', async (req, res) => {
    req.session.userId = null;
    res.status(200).send({ userId: null, message:'OK' });
});

app.post('users/:userId/favorites', async (req, res) => {
    const { userId } = req.params, { recipeId } = req.body;
    const foundUser = await User.findById(userId);
    if(!foundUser) {
        throw new ExpressError(500, 'The user with the user id provided could not be found');
    } 
    foundUser.favorites.push(recipeId);
    await foundUser.save();
    res.status(200).send({ favorites: foundUser.favorites });
})

// ERROR HANDLING
app.use((err, req, res, next) => {
    if(err.statusCode === 401) {
        return res.send({ userId: null, errorCode: err.statusCode, errorMessage: err.message });
    }
})

app.listen(3001, () => console.log('The server listens...'));