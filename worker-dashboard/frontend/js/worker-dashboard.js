let workerId = localStorage.getItem('workerId');
let workerData = null;
let allRequests = [];
let currentFilter = 'all';

if (!workerId) {
  alert('Please login first');
  window.location.href = '../../worker-auth/frontend/index.html';
}

// Load saved theme and language
const savedTheme = localStorage.getItem('theme') || 'light';
const savedLang = localStorage.getItem('language') || 'en';
document.body.className = savedTheme;
document.getElementById('languageSelect').value = savedLang;

// Panel Navigation
function showPanel(panelName) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  
  document.getElementById(panelName + 'Panel').classList.add('active');
  event.target.closest('.nav-item').classList.add('active');
  
  if (panelName === 'requests') {
    loadRequests();
  }
}

// Load Worker Profile
async function loadWorkerProfile() {
  try {
    const response = await fetch(`${CONFIG.WORKER_DASHBOARD_URL}/api/worker/${workerId}`);
    workerData = await response.json();
    
    document.getElementById('workerName').textContent = workerData.name;
    document.getElementById('workerPhone').textContent = workerData.phone;
    document.getElementById('workerType').textContent = workerData.workerType;
    document.getElementById('workerSkills').textContent = workerData.skills.join(', ');
    document.getElementById('workerExperience').textContent = workerData.experience;
    document.getElementById('workerAddress').textContent = workerData.address;
    document.getElementById('workerRating').textContent = workerData.rating ? workerData.rating.toFixed(1) + '/5' : 'Not rated yet';
    
    document.getElementById('editSkills').value = workerData.skills.join(', ');
    document.getElementById('editExperience').value = workerData.experience;
    document.getElementById('editAddress').value = workerData.address;
    
    const availabilityRadio = document.querySelector(`input[value="${workerData.availability}"]`);
    if (availabilityRadio) availabilityRadio.checked = true;
    
    if (workerData.availability === 'busy') {
      document.getElementById('busySection').style.display = 'block';
    }
    
    if (workerData.location && workerData.location.coordinates) {
      document.getElementById('locationStatus').textContent = 
        `Current: ${workerData.location.coordinates[1].toFixed(4)}, ${workerData.location.coordinates[0].toFixed(4)}`;
    }
  } catch (err) {
    console.error('Error loading profile:', err);
  }
}

// Update Profile
async function updateProfile(e) {
  e.preventDefault();
  
  const skills = document.getElementById('editSkills').value.split(',').map(s => s.trim().toLowerCase());
  const experience = parseInt(document.getElementById('editExperience').value);
  const address = document.getElementById('editAddress').value;
  
  try {
    const response = await fetch(`${CONFIG.WORKER_DASHBOARD_URL}/api/worker/${workerId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skills, experience, address })
    });
    
    if (response.ok) {
      alert('Profile updated successfully');
      loadWorkerProfile();
    }
  } catch (err) {
    alert('Error updating profile: ' + err.message);
  }
}

// Availability
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
    const response = await fetch(`${CONFIG.WORKER_DASHBOARD_URL}/api/worker/${workerId}/availability`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ availability, expectedCompletionTime: completionTime })
    });
    
    if (response.ok) {
      alert('Availability updated successfully');
    }
  } catch (err) {
    alert('Error updating availability: ' + err.message);
  }
}

// Location
async function updateLocation() {
  if (!navigator.geolocation) {
    alert('Geolocation not supported');
    return;
  }
  
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const response = await fetch(`${CONFIG.WORKER_DASHBOARD_URL}/api/worker/${workerId}/location`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        });
        
        if (response.ok) {
          document.getElementById('locationStatus').textContent = 
            `✓ Location updated: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;
          alert('Location updated successfully!');
        }
      } catch (err) {
        alert('Error updating location: ' + err.message);
      }
    },
    (error) => {
      alert('Unable to get location: ' + error.message);
    }
  );
}

// Job Requests
async function loadRequests() {
  try {
    const response = await fetch(`${CONFIG.WORKER_DASHBOARD_URL}/api/worker/${workerId}/requests`);
    allRequests = await response.json();
    displayRequests();
  } catch (err) {
    console.error('Error loading requests:', err);
  }
}

function filterRequests(filter) {
  currentFilter = filter;
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
  event.target.classList.add('active');
  displayRequests();
}

function displayRequests() {
  const container = document.getElementById('requestsList');
  
  let filteredRequests = allRequests;
  if (currentFilter !== 'all') {
    filteredRequests = allRequests.filter(r => r.status === currentFilter);
  }
  
  if (filteredRequests.length === 0) {
    container.innerHTML = '<div class="no-results">No requests found.</div>';
    return;
  }
  
  container.innerHTML = filteredRequests.map(req => `
    <div class="request-card">
      <div class="request-header">
        <div class="worker-name-req">${req.workFinderId?.name || 'Work Finder'}</div>
        <span class="status-badge status-${req.status}">${req.status}</span>
      </div>
      
      <div class="worker-contact">
        <strong>📞 Contact:</strong> ${req.workFinderId?.phone || 'N/A'}
      </div>
      
      <div class="request-description">
        <strong>Work Description:</strong><br>
        ${req.description}
      </div>
      
      <div style="color:#999; font-size:14px; margin-top:10px;">
        📅 Requested: ${new Date(req.createdAt).toLocaleDateString()} ${new Date(req.createdAt).toLocaleTimeString()}
        ${req.completedAt ? `<br>✅ Completed: ${new Date(req.completedAt).toLocaleDateString()}` : ''}
      </div>
      
      ${req.status === 'pending' ? `
        <div style="display:flex; gap:10px; margin-top:15px;">
          <button class="btn-primary" onclick="updateRequestStatus('${req._id}', 'accepted')" style="flex:1; background:#4caf50;">
            ✓ Accept
          </button>
          <button class="btn-danger" onclick="updateRequestStatus('${req._id}', 'rejected')" style="flex:1;">
            ✗ Reject
          </button>
        </div>
      ` : ''}
      
      ${req.status === 'accepted' ? `
        <button class="btn-primary" onclick="updateRequestStatus('${req._id}', 'completed')" style="margin-top:15px; width:100%;">
          ✓ Mark as Completed
        </button>
      ` : ''}
    </div>
  `).join('');
}

async function updateRequestStatus(requestId, status) {
  try {
    const response = await fetch(`${CONFIG.WORKER_DASHBOARD_URL}/api/job-request/${requestId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    
    if (response.ok) {
      alert(`Request ${status} successfully!`);
      loadRequests();
      loadRequestCount();
    } else {
      alert('Failed to update request');
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function loadRequestCount() {
  try {
    const response = await fetch(`${CONFIG.WORKER_DASHBOARD_URL}/api/worker/${workerId}/requests`);
    const requests = await response.json();
    const pendingRequests = requests.filter(r => r.status === 'pending');
    const badge = document.getElementById('requestBadge');
    if (pendingRequests.length > 0) {
      badge.textContent = pendingRequests.length;
      badge.style.display = 'inline-block';
    }
  } catch (err) {
    console.error('Error loading requests:', err);
  }
}

// Settings
function changeLanguage() {
  const lang = document.getElementById('languageSelect').value;
  localStorage.setItem('language', lang);
  alert('Language changed to ' + lang);
}

function changeTheme(theme) {
  document.body.className = theme;
  localStorage.setItem('theme', theme);
}

async function deleteAccount() {
  const confirm = prompt('Type "DELETE" to confirm account deletion:');
  if (confirm !== 'DELETE') return;
  
  try {
    const response = await fetch(`${CONFIG.WORKER_DASHBOARD_URL}/api/worker/${workerId}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      alert('Account deleted successfully');
      localStorage.removeItem('workerId');
      window.location.href = '../../worker-auth/frontend/index.html';
    } else {
      alert('Failed to delete account');
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

function logout() {
  localStorage.removeItem('workerId');
  window.location.href = '../../worker-auth/frontend/index.html';
}

// Initialize
loadWorkerProfile();
loadRequestCount();
