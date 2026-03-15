const mongoose = require('mongoose');

const workFinderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  userType: { type: String, enum: ['household', 'farmer'], required: true },
  location: {
    type: { type: String, default: 'Point' },
    coordinates: [Number]
  },
  address: String,
  verified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

workFinderSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('WorkFinder', workFinderSchema);
