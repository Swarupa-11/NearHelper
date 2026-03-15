const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const Worker = require('./models/Worker');
const WorkFinder = require('./models/WorkFinder');
const JobRequest = require('./models/JobRequest');
const Review = require('./models/Review');

const app = express();
const PORT = process.env.PORT || 3004;

connectDB();

app.use(cors());
app.use(express.json());
app.use(express.static('../frontend'));

// Get WorkFinder Profile
app.get('/api/workfinder/:id', async (req, res) => {
  try {
    const workFinder = await WorkFinder.findById(req.params.id);
    if (!workFinder) return res.status(404).json({ message: 'User not found' });
    res.json(workFinder);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching profile', error: err.message });
  }
});

// Search Workers by Proximity
app.post('/api/search-workers', async (req, res) => {
  try {
    const { lat, lng, radius, workerType, skills } = req.body;
    const radiusInMeters = (radius || 500) * 1000; // Convert km to meters
    
    let query = {
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          $maxDistance: radiusInMeters
        }
      }
    };
    
    if (workerType) {
      query.workerType = workerType;
    }
    
    if (skills && skills.length > 0) {
      query.skills = { $in: skills };
    }
    
    const workers = await Worker.find(query).limit(50);
    
    // Calculate distance for each worker
    const workersWithDistance = workers.map(worker => {
      const distance = calculateDistance(
        lat, lng,
        worker.location.coordinates[1],
        worker.location.coordinates[0]
      );
      return {
        ...worker.toObject(),
        distance: distance.toFixed(2)
      };
    });
    
    res.json(workersWithDistance);
  } catch (err) {
    res.status(500).json({ message: 'Search failed', error: err.message });
  }
});

// Get Worker Details
app.get('/api/worker/:id', async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id);
    if (!worker) return res.status(404).json({ message: 'Worker not found' });
    res.json(worker);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching worker', error: err.message });
  }
});

// Create Job Request
app.post('/api/job-request', async (req, res) => {
  try {
    const { workerId, workFinderId, description } = req.body;
    const request = new JobRequest({ workerId, workFinderId, description });
    await request.save();
    res.json({ message: 'Request sent', request });
  } catch (err) {
    res.status(500).json({ message: 'Request failed', error: err.message });
  }
});

// Get Job Requests for WorkFinder
app.get('/api/workfinder/:id/requests', async (req, res) => {
  try {
    const requests = await JobRequest.find({ workFinderId: req.params.id }).populate('workerId').sort('-createdAt');
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching requests', error: err.message });
  }
});

// Create Review
app.post('/api/review', async (req, res) => {
  try {
    const { workerId, workFinderId, jobRequestId, rating, comment } = req.body;
    const review = new Review({ workerId, workFinderId, jobRequestId, rating, comment });
    await review.save();
    
    // Update worker average rating
    const reviews = await Review.find({ workerId });
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    await Worker.findByIdAndUpdate(workerId, { rating: avgRating });
    
    res.json({ message: 'Review submitted', review });
  } catch (err) {
    res.status(500).json({ message: 'Review failed', error: err.message });
  }
});

// Delete WorkFinder Account
app.delete('/api/workfinder/:id', async (req, res) => {
  try {
    await WorkFinder.findByIdAndDelete(req.params.id);
    await JobRequest.deleteMany({ workFinderId: req.params.id });
    await Review.deleteMany({ workFinderId: req.params.id });
    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Delete failed', error: err.message });
  }
});

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

app.listen(PORT, () => console.log(`WorkFinder Dashboard Server running on port ${PORT}`));
