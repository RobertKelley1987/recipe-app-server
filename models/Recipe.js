const mongoose = require('mongoose');

const recipeSchema = new mongoose.Schema({
    apiId: String,
    name: String
});

module.exports = mongoose.model('Recipe', recipeSchema);