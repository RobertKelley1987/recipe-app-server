require('dotenv').config();

const express = require('express');
const app = express();
const mongoose = require('mongoose');
const { mongoUrl } = require('./constants');
const session = require('./session-options');
const User = require('./models/User');
const List = require('./models/List');
const ExpressError = require('./util/express-error');
const isLoggedIn = require('./middleware');
const bcrypt = require('bcrypt');

mongoose.connect(mongoUrl, { useNewUrlParser: true });
app.use(session);
app.use(express.json());

// ROUTE TO FIND OUT IF USER IS LOGGED IN FROM COOKIE
app.get('/sessions', isLoggedIn, (req, res) => {
    // confirmed user is logged in via middleware
    const { userId } = req.session;
    res.status(200).send({ userId });
});

// SIGN UP, LOG IN AND LOGOUT ROUTES 
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

// USER -- GET USER DATA (favs and lists)
app.get('/users/:userId', async (req, res) => {
    const { userId } = req.params;
    const foundUser = await User.findById(userId).populate('lists');
    console.log("LISTS:");
    console.log(foundUser.lists[0]);
    console.log(foundUser.lists);
    if(!foundUser) {
        throw new ExpressError(404, 'The user with the user id provided could not be found');
    }
    res.status(200).send({ favorites: foundUser.favorites, lists: foundUser.lists}) 
});

// FAVORITES -- TOGGLE AND GET ROUTES
app.post('/users/:userId/favorites', async (req, res) => {
    const { userId } = req.params, { recipeId } = req.body;
    const foundUser = await User.findById(userId);
    if(!foundUser) {
        throw new ExpressError(404, 'The user with the user id provided could not be found');
    } 
    const indexOfRecipe = foundUser.favorites.indexOf(recipeId);
    if(indexOfRecipe !== -1) {
        foundUser.favorites.splice(indexOfRecipe, 1);
    } else {
        foundUser.favorites.push(recipeId);
    }
    await foundUser.save();
    res.status(200).send({ favorites: foundUser.favorites });
});

app.get('/users/:userId/favorites', async (req, res) => {
    const { userId } = req.params;
    const foundUser = await User.findById(userId);
    if(!foundUser) {
        throw new ExpressError(404, 'The user with the user id provided could not be found');
    } 
    res.status(200).send({ favorites: foundUser.favorites });
});

// LIST ROUTES
app.post('/users/:userId/lists', async (req, res) => {
    const { userId } = req.params, { name } = req.body;
    const foundUser = await User.findById(userId);
    if(!foundUser) {
        throw new ExpressError(404, 'The user with the user id provided could not be found');
    } 
    // generate list name if user did not provide one yet
    let listName = !name ? `List #${foundUser.lists.length + 1}` : name;
    const newList = await List.create({ name: listName });
    console.log('list id: ' + newList._id);
    foundUser.lists.push(newList);
    await foundUser.save();
    res.status(200).send({ listId: newList._id });
});

app.get('/lists/:listId', async (req, res) => {
    const { listId } = req.params;
    const foundList = await List.findById(listId);
    if(!foundList) {
        throw new ExpressError(400, 'The list with this id could not be found');
    }
    res.status(200).send({ list: foundList });
});

app.post('/lists/:listId/recipes', async (req, res) => {
    const { listId } = req.params, { recipeId } = req.body;
    const foundList = await List.findById(listId);
    if(!foundList) {
        throw new ExpressError(400, 'The list with this id could not be found');
    }
    foundList.recipes.push(recipeId)
    await foundList.save();
    res.status(200).send({ list: foundList });
});

// ERROR HANDLING
app.use((err, req, res, next) => {
    if(err.statusCode === 401 || err.statusCode === 404) {
        return res.send({ userId: null, errorCode: err.statusCode, errorMessage: err.message });
    }
})

app.listen(3001, () => console.log('The server listens...'));