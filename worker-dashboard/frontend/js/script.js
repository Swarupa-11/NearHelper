let workerId = localStorage.getItem('workerId');
let workerData = null;

if (!workerId) {
  alert('Please login first');
  window.location.href = '../../worker-auth/frontend/index.html';
}

async function loadWorkerProfile() {
  try {
    const response = await fetch(`http://localhost:3002/api/worker/${workerId}`);
    workerData = await response.json();
    
    document.getElementById('workerName').textContent = workerData.name;
    document.getElementById('workerPhone').textContent = workerData.phone;
    document.getElementById('workerType').textContent = workerData.workerType;
    document.getElementById('workerSkills').textContent = workerData.skills.join(', ');
    document.getElementById('workerExperience').textContent = workerData.experience;
    document.getElementById('workerAddress').textContent = workerData.address;
    
    document.getElementById('editSkills').value = workerData.skills.join(', ');
    document.getElementById('editExperience').value = workerData.experience;
    document.getElementById('editAddress').value = workerData.address;
    
    const availabilityRadio = document.querySelector(`input[value="${workerData.availability}"]`);
    if (availabilityRadio) availabilityRadio.checked = true;
    
    if (workerData.availability === 'busy') {
      document.getElementById('busySection').style.display = 'block';
    }
  } catch (err) {
    alert('Error loading profile: ' + err.message);
  }
}

function updateAvailability() {
  const availability = document.querySelector('input[name="availability"]:checked').value;
  
  if (availability === 'busy') {
    document.getElementById('busySection').style.display = 'block';
  } else {
    document.getElementById('busySection').style.display = 'none';
    saveAvailability(availability, null);
  }
}

async function setCompletionTime() {
  const completionTime = document.getElementById('completionTime').value;
  if (!completionTime) {
    alert('Please select completion time');
    return;
  }
  await saveAvailability('busy', completionTime);
}

async function saveAvailability(availability, completionTime) {
  try {
    const response = await fetch(`http://localhost:3002/api/worker/${workerId}/availability`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ availability, expectedCompletionTime: completionTime })
    });
    
    const result = await response.json();
    alert('Availability updated successfully');
  } catch (err) {
    alert('Error updating availability: ' + err.message);
  }
}

async function updateLocation() {
  if (!navigator.geolocation) {
    alert('Geolocation not supported');
    return;
  }
  
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const response = await fetch(`http://localhost:3002/api/worker/${workerId}/location`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        });
        
        const result = await response.json();
        document.getElementById('locationStatus').textContent = 
          `✓ Location updated: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;
      } catch (err) {
        alert('Error updating location: ' + err.message);
      }
    },
    (error) => {
      alert('Unable to get location: ' + error.message);
    }
  );
}

async function updateProfile(e) {
  e.preventDefault();
  
  const skills = document.getElementById('editSkills').value.split(',').map(s => s.trim());
  const experience = parseInt(document.getElementById('editExperience').value);
  const address = document.getElementById('editAddress').value;
  
  try {
    const response = await fetch(`http://localhost:3002/api/worker/${workerId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skills, experience, address })
    });
    
    const result = await response.json();
    alert('Profile updated successfully');
    loadWorkerProfile();
  } catch (err) {
    alert('Error updating profile: ' + err.message);
  }
}

function logout() {
  localStorage.removeItem('workerId');
  window.location.href = '../../worker-auth/frontend/index.html';
}

async function loadRequestCount() {
  try {
    console.log('Worker ID from localStorage:', workerId);
    const response = await fetch(`http://localhost:3002/api/worker/${workerId}/requests`);
    console.log('Request count response status:', response.status);
    const requests = await response.json();
    console.log('All requests for this worker:', requests);
    const pendingRequests = requests.filter(r => r.status === 'pending');
    console.log('Pending requests:', pendingRequests.length);
    const badge = document.getElementById('requestBadge');
    if (pendingRequests.length > 0) {
      badge.textContent = pendingRequests.length;
      badge.style.display = 'inline-block';
    }
  } catch (err) {
    console.error('Error loading requests:', err);
  }
}

function viewJobRequests() {
  window.location.href = 'requests.html';
}

loadWorkerProfile();
loadRequestCount();
