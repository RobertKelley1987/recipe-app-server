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
const catchAsync = require('./util/catch-async');

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
app.post('/signup', catchAsync(async (req, res) => {
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
        throw new ExpressError(404, 'This user already exists in the system');
    }
}));

app.post('/login', catchAsync(async (req, res) => {
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
}));

app.post('/logout', catchAsync(async (req, res) => {
    req.session.userId = null;
    res.status(200).send({ userId: null, message:'OK' });
}));

// USER -- GET USER DATA (favs and lists) -- ***THIS IS NOT VERY RESTFUL***
app.get('/users/:userId', catchAsync(async (req, res) => {
    const { userId } = req.params;
    const foundUser = await User.findById(userId).populate('lists');
    if(!foundUser) {
        throw new ExpressError(404, 'The user with the user id provided could not be found');
    }
    res.status(200).send({ favorites: foundUser.favorites, lists: foundUser.lists}) 
}));

// FAVORITES -- TOGGLE AND GET ROUTES
app.post('/users/:userId/favorites', catchAsync(async (req, res) => {
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
}));

app.get('/users/:userId/favorites', catchAsync(async (req, res) => {
    const { userId } = req.params;
    const foundUser = await User.findById(userId);
    if(!foundUser) {
        throw new ExpressError(404, 'The user with the user id provided could not be found');
    } 
    res.status(200).send({ favorites: foundUser.favorites });
}));

// LIST ROUTES
app.get('/users/:userId/lists', catchAsync(async (req, res) => {
    const { userId } = req.params;
    const foundUser = await User.findById(userId).populate('lists');
    if(!foundUser) {
        throw new ExpressError(404, 'The user with the user id provided could not be found');
    }
    res.status(200).send({ lists: foundUser.lists}) 
}));

app.post('/users/:userId/lists', catchAsync(async (req, res) => {
    const { userId } = req.params, { name } = req.body;
    const foundUser = await User.findById(userId);
    if(!foundUser) {
        throw new ExpressError(404, 'The user with the user id provided could not be found');
    } 
    // generate list name if user did not provide one yet
    let listName = !name ? `Untitled List #${foundUser.lists.length}` : name;
    const newList = await List.create({ name: listName });
    console.log('list id: ' + newList._id);
    foundUser.lists.push(newList);
    await foundUser.save();
    res.status(200).send({ listId: newList._id });
}));

app.get('/lists/:listId', catchAsync(async (req, res) => {
    const { listId } = req.params;
    const foundList = await List.findById(listId);
    if(!foundList) {
        throw new ExpressError(404, 'The list with this id could not be found');
    }
    res.status(200).send({ list: foundList });
}));

//route to edit list name
app.put('/lists/:listId', catchAsync(async (req, res) => {
    const { listId } = req.params, { name } = req.body;
    const foundList = await List.findById(listId);
    if(!foundList) {
        throw new ExpressError(404, 'The list with this id number could not be found');
    }
    // If user left name blank, insert a placeholder. Otherwise use name provided.
    foundList.name = name === '' ? `Untitled List #${foundUser.lists.length}` : name;
    await foundList.save();
    res.status(200).send({ list: foundList });
}));

app.post('/lists/:listId/recipes', catchAsync(async (req, res) => {
    const { listId } = req.params, { recipeId } = req.body;
    const foundList = await List.findById(listId);
    if(!foundList) {
        throw new ExpressError(404, 'The list with this id could not be found');
    }
    foundList.recipes.push(recipeId)
    await foundList.save();
    res.status(200).send({ list: foundList });
}));

app.delete('/lists/:listId/recipes/:recipeId', catchAsync(async (req, res) => {
    const { listId, recipeId } = req.params;
    const foundList = await List.findById(listId);
    if(!foundList) {
        throw new ExpressError(404, 'The list with this id could not be found');
    }
    foundList.recipes = foundList.recipes.filter(id => id !== recipeId);
    await foundList.save();
    res.status(200).send({ list: foundList });
}));

// ERROR HANDLING
app.use((err, req, res, next) => {
    if(err.statusCode === 401) {
        return res.send({ userId: null, err: err });
    }

    if(err.statusCode === 400) {
        return res.send({ userId: null, err: err });
    }

    if(err.statusCode === 404) {
        return res.send({ err: err });
    }

})

app.listen(3001, () => console.log('The server listens...'));