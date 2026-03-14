const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', required: true },
  workFinderId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkFinder', required: true },
  jobRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobRequest', required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Review', reviewSchema);
