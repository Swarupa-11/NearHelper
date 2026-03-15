const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const Worker = require('./models/Worker');
const twilio = require('twilio');

const app = express();
const PORT = process.env.PORT || 3001;

const VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SID;
function getTwilioClient() {
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

connectDB();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static('../frontend'));

// Explicit CORS headers for preflight
app.options('*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(200);
});

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

// Check phone uniqueness
app.post('/api/check-phone', async (req, res) => {
  const { phone } = req.body;
  const existing = await Worker.findOne({ phone });
  if (existing) return res.status(400).json({ message: 'Phone number already registered' });
  res.json({ available: true });
});

// Send OTP
app.post('/api/send-otp', async (req, res) => {
  const { phone } = req.body;
  try {
    await getTwilioClient().verify.v2.services(VERIFY_SERVICE_SID)
      .verifications.create({ to: `+91${phone}`, channel: 'sms' });
    res.json({ message: 'OTP sent successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send OTP', error: err.message });
  }
});

// Verify OTP
app.post('/api/verify-otp', async (req, res) => {
  const { phone, otp } = req.body;
  try {
    const result = await getTwilioClient().verify.v2.services(VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: `+91${phone}`, code: otp });
    if (result.status === 'approved') {
      res.json({ message: 'OTP verified', verified: true });
    } else {
      res.status(400).json({ message: 'Invalid OTP' });
    }
  } catch (err) {
    res.status(400).json({ message: 'Invalid OTP', error: err.message });
  }
});

app.listen(PORT, () => console.log(`Worker Auth Server running on port ${PORT} - v2`));
