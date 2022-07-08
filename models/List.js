const mongoose = require('mongoose');

const listSchema = new mongoose.Schema({
    name: String,
    recipes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Recipe'
    }]
});

module.exports = mongoose.model('List', listSchema);