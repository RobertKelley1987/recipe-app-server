const express = require('express');
const router = express.Router({ mergeParams: true });

const catchAsync = require('../util/catch-async');
const favorites = require('../controllers/favorites')

router.route('/') 
    .get(catchAsync(favorites.getAll)) // Get all favorites
    .post(catchAsync(favorites.toggleRecipe)); // Toggle favorite status for one recipe

module.exports = router;