const mongoose = require('mongoose');

const jobRequestSchema = new mongoose.Schema({
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', required: true },
  workFinderId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkFinder', required: true },
  description: { type: String, required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected', 'completed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  completedAt: Date
});

module.exports = mongoose.model('JobRequest', jobRequestSchema);
