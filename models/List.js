const mongoose = require('mongoose');

const listSchema = new mongoose.Schema({
    name: String,
    recipes: [String]
});

module.exports = mongoose.model('List', listSchema);