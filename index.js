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
const Recipe = require('./models/Recipe');

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
    const foundUser = await User.findById(userId).populate({
        path: 'lists', 
        populate: { path: 'recipes' } 
    });
    if(!foundUser) {
        throw new ExpressError(404, 'The user with the user id provided could not be found');
    }
    res.status(200).send({ favorites: foundUser.favorites, lists: foundUser.lists}) 
}));

// FAVORITES -- TOGGLE AND GET ROUTES
app.post('/users/:userId/favorites', catchAsync(async (req, res) => {
    const { userId } = req.params, { recipe } = req.body;
    const foundUser = await User.findById(userId).populate('favorites');
    if(!foundUser) {
        throw new ExpressError(404, 'The user with the user id provided could not be found');
    } 
    const indexOfRecipe = foundUser.favorites.findIndex(fav => fav.apiId === recipe.apiId);
    // Test if recipe exists in user's favorites list
    if(indexOfRecipe !== -1) {
        // Remove from favorites
        foundUser.favorites.splice(indexOfRecipe, 1);
    } else {
        // Create new recipe
        const newRecipe = await Recipe.create(recipe);
        // Test create recipe method failed
        if(!newRecipe) {
            // Throw error
            throw new ExpressError(500, 'Failed to create new recipe');
        }
        // Add new favorite to beginning of array
        foundUser.favorites = [newRecipe, ...foundUser.favorites];
    }
    await foundUser.save();
    res.status(200).send({ favorites: foundUser.favorites });
}));

app.get('/users/:userId/favorites', catchAsync(async (req, res) => {
    const { userId } = req.params;
    const foundUser = await User.findById(userId).populate('favorites');
    if(!foundUser) {
        throw new ExpressError(404, 'The user with the user id provided could not be found');
    } 
    res.status(200).send({ favorites: foundUser.favorites });
}));

// LIST ROUTES
app.get('/users/:userId/lists', catchAsync(async (req, res) => {
    const { userId } = req.params;
    const foundUser = await User.findById(userId).populate({ path: 'lists', populate: { path: 'recipes' } });
    if(!foundUser) {
        throw new ExpressError(404, 'The user with the user id provided could not be found');
    }
    console.log(foundUser);
    res.status(200).send({ lists: foundUser.lists}) 
}));

app.post('/users/:userId/lists', catchAsync(async (req, res) => {
    const { userId } = req.params, { name } = req.body;
    const foundUser = await User.findById(userId).populate({ path: 'lists', populate: { path: 'recipes' } });
    if(!foundUser) {
        throw new ExpressError(404, 'The user with the user id provided could not be found');
    } 
    // generate list name if user did not provide one yet
    let listName = !name ? `Untitled List #${foundUser.lists.length + 1}` : name;
    const newList = await List.create({ name: listName });
    if(!newList) {
        throw ExpressError(500, 'Failed to create new list');
    }
    foundUser.lists.push(newList);
    await foundUser.save();
    res.status(200).send({ listId: newList._id, lists: foundUser.lists });
}));

// get data for a single list
app.get('/lists/:listId', catchAsync(async (req, res) => {
    const { listId } = req.params;
    const foundList = await List.findById(listId).populate('recipes');
    console.log('AFTER PUT REQUEST');
    console.log(foundList);
    if(!foundList) {
        throw new ExpressError(404, 'The list with this id could not be found');
    }
    res.status(200).send({ list: foundList });
}));

//route to edit list name
app.put('/lists/:listId', catchAsync(async (req, res) => {
    const { listId } = req.params, { name } = req.body;
    const foundList = await List.findById(listId).populate('recipes');
    if(!foundList) {
        throw new ExpressError(404, 'The list with this id number could not be found');
    }
    // If user left name blank, insert a placeholder. Otherwise use name provided.
    foundList.name = name === '' ? `Untitled List #${foundUser.lists.length + 1}` : name;
    await foundList.save();
    res.status(200).send({ list: foundList });
}));

// route to delete a list
app.delete('user/:userId/lists/:listId', catchAsync(async(req, res) => {
    const { userId, listId } = req.params;
    // Throw error if request is missing user id or list id
    if(!listId) {
        throw new ExpressError(400, 'Please provide a valid list id to continue.');
    }
    if(!userId) {
        throw new ExpressError(400, 'Please provide a valid user id to continue.');
    }
    // Delete list
    const { deletedCount } = await Note.deleteOne({ _id: listId });
    // Throw error message if deletion was not successful
    if(!deletedCount) {
        throw new ExpressError(500, 'Failed to delete list. Please try again later.');
    }
    // Find and return updated user lists
    const foundUser = await User.findById(userId).populate({ path: 'lists', populate: { path: 'recipes' } });
    if(!foundUser) {
        throw new ExpressError(500, 'Failed to fetch updated user data. Please try again later.');
    }
    return res.status(200).send({ lists: foundUser.lists });
}));

app.post('/lists/:listId/recipes', catchAsync(async (req, res) => {
    const { listId } = req.params, { recipe } = req.body;
    if(!recipe.apiId || !recipe.name) {
        throw new ExpressError(400, 'Please provide recipe data to add to this list');
    }
    const newRecipe = await Recipe.create(recipe);
    if(!newRecipe) {
        throw ExpressError(500, 'Failed to add recipe to this list')
    }
    const foundList = await List.findById(listId).populate('recipes');
    if(!foundList) {
        throw new ExpressError(404, 'The list with this id could not be found');
    }
    // Return error message if recipe is already included on this list
    if(foundList.recipes.findIndex(listRecipe => listRecipe.apiId === recipe.apiId) !== -1) {
        throw new ExpressError(400, 'This recipe has already been added to this list')
    }
    foundList.recipes.push(newRecipe);
    await foundList.save();
    res.status(200).send({ list: foundList });
}));

app.delete('/lists/:listId/recipes/:recipeId', catchAsync(async (req, res) => {
    const { listId, recipeId } = req.params;
    const foundList = await List.findById(listId).populate('recipes');
    if(!foundList) {
        throw new ExpressError(404, 'The list with this id could not be found');
    }
    foundList.recipes = foundList.recipes.filter(recipe => recipe.apiId !== recipeId);
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