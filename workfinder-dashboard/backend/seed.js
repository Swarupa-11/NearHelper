const mongoose = require('mongoose');
const Worker = require('../../shared/models/Worker');

mongoose.connect('mongodb://localhost:27017/nearhelper')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Connection error:', err));

const sampleWorkers = [
  {
    name: 'rajesh kumar',
    phone: '9876543210',
    workerType: 'domestic',
    skills: ['plumbing', 'electrical'],
    experience: 5,
    languages: ['telugu', 'english'],
    location: { type: 'Point', coordinates: [80.6, 16.5] },
    address: 'Vijayawada',
    availability: 'available',
    rating: 4.5,
    verified: true
  },
  {
    name: 'lakshmi devi',
    phone: '9876543211',
    workerType: 'domestic',
    skills: ['cooking', 'cleaning'],
    experience: 3,
    languages: ['telugu', 'hindi'],
    location: { type: 'Point', coordinates: [80.62, 16.52] },
    address: 'Vijayawada',
    availability: 'available',
    rating: 4.8,
    verified: true
  },
  {
    name: 'ramesh babu',
    phone: '9876543212',
    workerType: 'agricultural',
    skills: ['farming', 'irrigation'],
    experience: 10,
    languages: ['telugu'],
    location: { type: 'Point', coordinates: [80.58, 16.48] },
    address: 'Guntur',
    availability: 'available',
    rating: 4.2,
    verified: true
  }
];

async function seedDatabase() {
  try {
    await Worker.deleteMany({});
    await Worker.insertMany(sampleWorkers);
    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seedDatabase();
