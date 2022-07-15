const Recipe = require('../models/Recipe');
const User = require('../models/User');
const ExpressError = require('../util/express-error');

// Helper functions
const getPopulatedUser = async userId => {
    const foundUser = await User.findById(userId).populate('favorites');
    if(!foundUser) {
        throw new ExpressError(404, 'The user with the user id provided could not be found');
    } 
    return foundUser;
}

// Controller functions
module.exports.getAll = async (req, res) => {
    const { userId } = req.params;
    const foundUser = await getPopulatedUser(userId); 
    res.status(200).send({ favorites: foundUser.favorites });
}

module.exports.toggleRecipe = async (req, res) => {
    const { userId } = req.params, { recipe } = req.body;
    const foundUser = await getPopulatedUser(userId);
    // Find index of recipe in user's favorites
    const indexOfRecipe = foundUser.favorites.findIndex(fav => fav.apiId === recipe.apiId);
    // Test if recipe exists in user's favorites
    if(indexOfRecipe !== -1) {
        // Remove from favorites
        foundUser.favorites.splice(indexOfRecipe, 1);
    } else {
        // Create new recipe and add to favorites list
        const newRecipe = await Recipe.create(recipe);
        if(!newRecipe) {
            throw new ExpressError(500, 'Failed to create new recipe');
        }
        foundUser.favorites = [newRecipe, ...foundUser.favorites];
    }
    await foundUser.save();
    res.status(200).send({ favorites: foundUser.favorites });
}

