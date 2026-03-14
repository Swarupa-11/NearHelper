let workFinderId = localStorage.getItem('workFinderId');
let userLocation = null;
let workersData = [];

if (!workFinderId) {
  alert('Please login first');
  window.location.href = '../../workfinder-auth/frontend/index.html';
}

async function loadUserProfile() {
  try {
    const response = await fetch(`http://localhost:3004/api/workfinder/${workFinderId}`);
    const user = await response.json();
    
    document.getElementById('userName').textContent = `Welcome, ${user.name}`;
    
    if (user.location && user.location.coordinates) {
      userLocation = {
        lat: user.location.coordinates[1],
        lng: user.location.coordinates[0]
      };
    } else {
      getCurrentLocation();
    }
  } catch (err) {
    alert('Error loading profile: ' + err.message);
  }
}

function getCurrentLocation() {
  if (!navigator.geolocation) {
    alert('Geolocation not supported. Please enable location services.');
    return;
  }
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
    },
    (error) => {
      alert('Unable to get location. Please enable location services.');
    }
  );
}

async function searchWorkers() {
  if (!userLocation) {
    alert('Getting your location...');
    getCurrentLocation();
    setTimeout(searchWorkers, 2000);
    return;
  }
  
  const workerType = document.getElementById('workerType').value;
  const radius = parseInt(document.getElementById('radius').value);
  const skillsInput = document.getElementById('skills').value;
  const skills = skillsInput ? skillsInput.split(',').map(s => s.trim()) : [];
  
  try {
    const response = await fetch('http://localhost:3004/api/search-workers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat: userLocation.lat,
        lng: userLocation.lng,
        radius,
        workerType,
        skills
      })
    });
    
    workersData = await response.json();
    displayWorkers(workersData);
  } catch (err) {
    alert('Search failed: ' + err.message);
  }
}

function displayWorkers(workers) {
  const workersList = document.getElementById('workersList');
  const resultCount = document.getElementById('resultCount');
  
  if (workers.length === 0) {
    workersList.innerHTML = '<div class="no-results">No workers found in your area. Try increasing the search radius.</div>';
    resultCount.textContent = '(0)';
    return;
  }
  
  resultCount.textContent = `(${workers.length})`;
  
  workersList.innerHTML = workers.map(worker => `
    <div class="worker-card" onclick="showWorkerDetails('${worker._id}')">
      <div class="worker-header">
        <div class="worker-name">${worker.name}</div>
        <div class="worker-distance">📍 ${worker.distance} km</div>
      </div>
      <div class="worker-type">${worker.workerType === 'domestic' ? 'Domestic Worker' : 'Agricultural Worker'}</div>
      <div class="worker-skills"><strong>Skills:</strong> ${worker.skills.join(', ')}</div>
      <div class="worker-experience"><strong>Experience:</strong> ${worker.experience} years</div>
      <div class="worker-rating"><strong>⭐ Rating:</strong> ${worker.rating ? worker.rating.toFixed(1) + '/5' : 'Not rated yet'}</div>
      <div class="worker-experience"><strong>Phone:</strong> ${worker.phone}</div>
    </div>
  `).join('');
}

async function showWorkerDetails(workerId) {
  try {
    const response = await fetch(`http://localhost:3004/api/worker/${workerId}`);
    const worker = await response.json();
    
    // Fetch reviews for this worker
    const reviewsResponse = await fetch(`http://localhost:3002/api/worker/${workerId}/reviews`);
    const reviews = await reviewsResponse.json();
    
    const distance = workersData.find(w => w._id === workerId)?.distance || 'N/A';
    
    let reviewsHtml = '';
    if (reviews.length > 0) {
      reviewsHtml = `
        <div style="margin-top:15px; padding:10px; background:#f9f9f9; border-radius:8px;">
          <strong>Reviews (${reviews.length}):</strong>
          ${reviews.slice(0, 3).map(r => `
            <div style="margin:10px 0; padding:8px; background:white; border-radius:5px;">
              <div>⭐ ${r.rating}/5 - ${r.workFinderId?.name || 'Anonymous'}</div>
              <div style="color:#666; font-size:14px;">${r.comment || 'No comment'}</div>
              <div style="color:#999; font-size:12px;">${new Date(r.createdAt).toLocaleDateString()}</div>
            </div>
          `).join('')}
          ${reviews.length > 3 ? `<div style="color:#666; font-size:14px;">+ ${reviews.length - 3} more reviews</div>` : ''}
        </div>
      `;
    }
    
    document.getElementById('workerDetails').innerHTML = `
      <p><strong>Name:</strong> ${worker.name}</p>
      <p><strong>Phone:</strong> ${worker.phone}</p>
      <p><strong>Type:</strong> ${worker.workerType === 'domestic' ? 'Domestic Worker' : 'Agricultural Worker'}</p>
      <p><strong>Skills:</strong> ${worker.skills.join(', ')}</p>
      <p><strong>Experience:</strong> ${worker.experience} years</p>
      <p><strong>Languages:</strong> ${worker.languages.join(', ')}</p>
      <p><strong>Address:</strong> ${worker.address}</p>
      <p><strong>Distance:</strong> ${distance} km away</p>
      <p><strong>⭐ Average Rating:</strong> ${worker.rating ? worker.rating.toFixed(1) + '/5' : 'Not rated yet'} ${reviews.length > 0 ? `(${reviews.length} reviews)` : ''}</p>
      <p><strong>Verified:</strong> ${worker.verified ? '✓ Yes' : '✗ No'}</p>
      ${reviewsHtml}
      <button onclick="sendRequest('${worker._id}', '${worker.name}')" class="request-btn">Send Work Request</button>
    `;
    
    document.getElementById('workerModal').style.display = 'block';
  } catch (err) {
    alert('Error loading worker details: ' + err.message);
  }
}

function closeModal() {
  document.getElementById('workerModal').style.display = 'none';
}

function logout() {
  localStorage.removeItem('workFinderId');
  window.location.href = '../../workfinder-auth/frontend/index.html';
}

async function sendRequest(workerId, workerName) {
  const description = prompt(`Describe the work you need from ${workerName}:`);
  if (!description) return;
  
  try {
    const response = await fetch('http://localhost:3004/api/job-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workerId,
        workFinderId,
        description
      })
    });
    
    if (response.ok) {
      alert('Request sent successfully!');
      closeModal();
      loadRequestCount();
    } else {
      alert('Failed to send request');
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function loadRequestCount() {
  try {
    const response = await fetch(`http://localhost:3004/api/workfinder/${workFinderId}/requests`);
    const requests = await response.json();
    const badge = document.getElementById('requestBadge');
    if (requests.length > 0) {
      badge.textContent = requests.length;
      badge.style.display = 'inline-block';
    }
  } catch (err) {
    console.error('Error loading requests:', err);
  }
}

function viewMyRequests() {
  window.location.href = 'requests.html';
}

window.onclick = function(event) {
  const modal = document.getElementById('workerModal');
  if (event.target === modal) {
    closeModal();
  }
}

loadUserProfile();
loadRequestCount();
