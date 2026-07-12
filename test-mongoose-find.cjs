const mongoose = require('mongoose');
const schema = new mongoose.Schema({ specs: { type: Map, of: String } });
const Model = mongoose.model('TestFind', schema);
const doc = new Model({ specs: { a: 'b' } });
console.log(JSON.stringify(doc));
