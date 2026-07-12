const mongoose = require('mongoose');
const schema = new mongoose.Schema({ specs: { type: Map, of: String } });
const Model = mongoose.model('Test', schema);
const doc = new Model({ specs: { a: 'b', c: 'd' } });
console.log('toJSON:', Object.keys(doc.toJSON().specs));
console.log('toObject:', Object.keys(doc.toObject().specs));
console.log('direct:', Object.keys(doc.specs));
