const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const Worker = require('./models/Worker');
const WorkFinder = require('./models/WorkFinder');
const JobRequest = require('./models/JobRequest');
const Review = require('./models/Review');

const app = express();
const PORT = process.env.PORT || 3002;

connectDB();

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static('../frontend'));

// Explicit CORS headers for preflight
app.options('*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(200);
});

// Get Worker Profile
app.get('/api/worker/:id', async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id);
    if (!worker) return res.status(404).json({ message: 'Worker not found' });
    res.json(worker);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching profile', error: err.message });
  }
});

// Update Worker Profile
app.put('/api/worker/:id', async (req, res) => {
  try {
    const worker = await Worker.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
    res.json({ message: 'Profile updated', worker });
  } catch (err) {
    res.status(500).json({ message: 'Update failed', error: err.message });
  }
});

// Update Availability
app.put('/api/worker/:id/availability', async (req, res) => {
  try {
    const { availability, expectedCompletionTime } = req.body;
    const worker = await Worker.findByIdAndUpdate(
      req.params.id,
      { availability, expectedCompletionTime },
      { returnDocument: 'after' }
    );
    res.json({ message: 'Availability updated', worker });
  } catch (err) {
    res.status(500).json({ message: 'Update failed', error: err.message });
  }
});

// Update Location
app.put('/api/worker/:id/location', async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const worker = await Worker.findByIdAndUpdate(
      req.params.id,
      { location: { type: 'Point', coordinates: [lng, lat] } },
      { returnDocument: 'after' }
    );
    res.json({ message: 'Location updated', worker });
  } catch (err) {
    res.status(500).json({ message: 'Update failed', error: err.message });
  }
});

// Get Job Requests for Worker
app.get('/api/worker/:id/requests', async (req, res) => {
  try {
    const requests = await JobRequest.find({ workerId: req.params.id }).populate('workFinderId').sort('-createdAt');
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching requests', error: err.message });
  }
});

// Update Job Request Status
app.put('/api/job-request/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const update = { status };
    if (status === 'completed') update.completedAt = new Date();
    const request = await JobRequest.findByIdAndUpdate(req.params.id, update, { returnDocument: 'after' });
    res.json(request);
  } catch (err) {
    res.status(500).json({ message: 'Update failed', error: err.message });
  }
});

// Get Reviews for Worker
app.get('/api/worker/:id/reviews', async (req, res) => {
  try {
    const reviews = await Review.find({ workerId: req.params.id }).populate('workFinderId').sort('-createdAt');
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching reviews', error: err.message });
  }
});

// Delete Worker Account
app.delete('/api/worker/:id', async (req, res) => {
  try {
    await Worker.findByIdAndDelete(req.params.id);
    await JobRequest.deleteMany({ workerId: req.params.id });
    await Review.deleteMany({ workerId: req.params.id });
    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Delete failed', error: err.message });
  }
});

app.listen(PORT, () => console.log(`Worker Dashboard Server running on port ${PORT}`));
