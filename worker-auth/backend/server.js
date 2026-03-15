const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const Worker = require('./models/Worker');

const app = express();
const PORT = process.env.PORT || 3001;

connectDB();

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static('../frontend'));

// Register Worker
app.post('/api/register', async (req, res) => {
  try {
    const { name, phone, workerType, skills, experience, languages, location, address, availability, expectedCompletionTime, profilePhoto, equipmentPhotos } = req.body;
    
    const existingWorker = await Worker.findOne({ phone });
    if (existingWorker) {
      return res.status(400).json({ message: 'Phone number already registered' });
    }

    const worker = new Worker({
      name,
      phone,
      workerType,
      skills,
      experience,
      languages,
      location: {
        type: 'Point',
        coordinates: [location.lng, location.lat]
      },
      address,
      availability: availability || 'available',
      expectedCompletionTime: expectedCompletionTime || null,
      profilePhoto: profilePhoto || null,
      equipmentPhotos: equipmentPhotos || []
    });

    await worker.save();
    res.status(201).json({ message: 'Registration successful', workerId: worker._id });
  } catch (err) {
    res.status(500).json({ message: 'Registration failed', error: err.message });
  }
});

// Login Worker
app.post('/api/login', async (req, res) => {
  try {
    const { phone } = req.body;
    const worker = await Worker.findOne({ phone });
    
    if (!worker) {
      return res.status(404).json({ message: 'Worker not found' });
    }

    res.json({ message: 'Login successful', workerId: worker._id, workerType: worker.workerType });
  } catch (err) {
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
});

// Verify OTP (simulated)
app.post('/api/verify-otp', async (req, res) => {
  const { phone, otp } = req.body;
  if (otp === '1234') {
    res.json({ message: 'OTP verified', verified: true });
  } else {
    res.status(400).json({ message: 'Invalid OTP' });
  }
});

app.listen(PORT, () => console.log(`Worker Auth Server running on port ${PORT}`));
