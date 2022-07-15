const List = require('../models/List');
const Recipe = require('../models/Recipe');
const User = require('../models/User'); 
const ExpressError = require('../util/express-error');

// Helper functions
const getPopulatedList = async listId => {
    const foundList = await List.findById(listId).populate('recipes');
    if(!foundList) {
        throw new ExpressError(404, 'The list with this id could not be found');
    }
    return foundList;
}

const getPopulatedUser = async userId => {
    const foundUser = await User.findById(userId).populate({ path: 'lists', populate: { path: 'recipes' } });
    if(!foundUser) {
        throw new ExpressError(404, 'The user with the user id provided could not be found');
    }
    return foundUser;
}

// Controller functions
module.exports.getOne = async (req, res) => {
    const { listId } = req.params;
    const foundList = await getPopulatedList(listId);
    res.status(200).send({ list: foundList });
}

module.exports.getAll = async (req, res) => {
    const { userId } = req.params;
    const foundUser = await getPopulatedUser(userId);
    res.status(200).send({ lists: foundUser.lists}) 
}

module.exports.addRecipe = async (req, res) => {
    const { listId } = req.params, { recipe } = req.body;
    if(!recipe.apiId || !recipe.name) {
        throw new ExpressError(400, 'Please provide recipe data to add to this list');
    }
    const newRecipe = await Recipe.create(recipe);
    if(!newRecipe) {
        throw ExpressError(500, 'Failed to add recipe to this list')
    }
    const foundList = await getPopulatedList(listId);
    // Throw error if recipe is already included on this list
    if(foundList.recipes.findIndex(listRecipe => listRecipe.apiId === recipe.apiId) !== -1) {
        throw new ExpressError(400, 'This recipe has already been added to this list')
    }
    foundList.recipes.push(newRecipe);
    await foundList.save();
    res.status(200).send({ list: foundList });
}

module.exports.deleteRecipe = async (req, res) => {    
    const { listId, recipeId } = req.params;
    const foundList = await getPopulatedList(listId);
    foundList.recipes = foundList.recipes.filter(recipe => recipe.apiId !== recipeId);
    await foundList.save();
    res.status(200).send({ list: foundList });
}

module.exports.create = async (req, res) => {
    const { userId } = req.params, { name } = req.body;
    const foundUser = await getPopulatedUser(userId);
    // Generate list name if user did not provide one
    let listName = !name ? `Untitled List #${foundUser.lists.length + 1}` : name;
    const newList = await List.create({ name: listName });
    if(!newList) {
        throw ExpressError(500, 'Failed to create new list');
    }
    // Save new list to user data and return updated lists with new list id 
    foundUser.lists.push(newList);
    await foundUser.save();
    res.status(200).send({ listId: newList._id, lists: foundUser.lists });
}

module.exports.deleteOne = async (req, res) => {
    console.log("delete one");
    const { userId, listId } = req.params;
    const { deletedCount } = await List.deleteOne({ _id: listId });
    // Throw error message if deletion was not successful
    if(!deletedCount) {
        throw new ExpressError(500, 'Failed to delete list. Please try again later.');
    }
    // Find and return updated user lists
    const foundUser = await getPopulatedUser(userId);
    return res.status(200).send({ lists: foundUser.lists });
}

module.exports.updateName = async (req, res) => {
    const { listId } = req.params, { name } = req.body;
    const foundList = await getPopulatedList(listId);
    // If user left name blank, insert a placeholder. Otherwise use name provided.
    foundList.name = name === '' ? `Untitled List #${foundUser.lists.length + 1}` : name;
    await foundList.save();
    res.status(200).send({ list: foundList });
}