const express = require('express');
const router = express.Router({ mergeParams: true });
const catchAsync = require('../util/catch-async');
const lists = require('../controllers/lists');

// Add recipe to a list
router.post('/:listId/recipes', catchAsync(lists.addRecipe));

// Delete recipe from a list
router.delete('/:listId/recipes/:recipeId', catchAsync(lists.deleteRecipe));

router.route('/')
    .get(catchAsync(lists.getAll)) // Get all lists
    .post(catchAsync(lists.create)); // Create a new list


router.route('/:listId') 
    .get(catchAsync(lists.getOne)) // Get data for a single list
    .put(catchAsync(lists.updateName)) // Edit the name of a list
    .delete(catchAsync(lists.deleteOne)); // Delete a single list

module.exports = router;