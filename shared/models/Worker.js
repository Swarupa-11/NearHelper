const mongoose = require('mongoose');

const workerSchema = new mongoose.Schema({
  name: { type: String, required: true, lowercase: true },
  phone: { type: String, required: true, unique: true },
  aadhaar: { type: String },
  workerType: { type: String, enum: ['domestic', 'agricultural', 'both'], required: true, lowercase: true },
  password: { type: String, required: true },
  skills: [{ type: String, lowercase: true }],
  experience: { type: Number },
  languages: [{ type: String, lowercase: true }],
  location: {
    type: { type: String, default: 'Point' },
    coordinates: [Number]
  },
  address: String,
  profilePhoto: String,
  equipmentPhotos: [String],
  availability: { type: String, enum: ['available', 'busy'], default: 'available' },
  expectedCompletionTime: Date,
  verified: { type: Boolean, default: false },
  rating: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

workerSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Worker', workerSchema);
