/**
 * Dashboard Frontend Script
 * Manages links list, pagination, filters, search, custom alias edits, and Chart.js analytics modal.
 */

// Route guard: Redirect if not logged in
guardAuthRoute();

// Global State
let currentPage = 1;
const limit = 10;
let totalPages = 1;
let currentUrlIdForCsv = null;

// Page initialization
document.addEventListener('DOMContentLoaded', () => {
  // Display logged-in user name
  const user = JSON.parse(localStorage.getItem('user'));
  if (user) {
    document.getElementById('user-greeting').innerText = `Hi, ${user.name}`;
  }

  // Load stats and list
  loadStats();
  loadUrls();

  // Attach search and filter event listeners
  document.getElementById('search-input').addEventListener('input', debounce(loadUrls, 500));
  document.getElementById('filter-favorite').addEventListener('change', loadUrls);
  document.getElementById('filter-status').addEventListener('change', loadUrls);
  document.getElementById('sort-select').addEventListener('change', loadUrls);

  // Pagination buttons
  document.getElementById('prev-page-btn').addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      loadUrls();
    }
  });

  document.getElementById('next-page-btn').addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      loadUrls();
    }
  });

  // Shorten Form submission
  document.getElementById('shorten-form').addEventListener('submit', handleCreateShorten);

  // Edit Alias Form submission
  document.getElementById('edit-alias-form').addEventListener('submit', handleSaveAlias);

  // CSV download button handler
  document.getElementById('modal-csv-export').addEventListener('click', () => {
    if (currentUrlIdForCsv) {
      const token = localStorage.getItem('token');
      // Direct window location trigger using authorization token (passed as cookie) or inline fetch
      window.open(`/api/analytics/${currentUrlIdForCsv}/csv`, '_blank');
    }
  });
});

// Debounce helper to prevent flooding backend queries on search input
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Fetch general user dashboard aggregated statistics
async function loadStats() {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch('/api/analytics', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await res.json();
    
    if (res.ok && data.success) {
      const stats = data.data.dashboard;
      document.getElementById('stat-total-urls').innerText = stats.totalUrls;
      document.getElementById('stat-total-clicks').innerText = stats.totalClicks;
      document.getElementById('stat-today-clicks').innerText = stats.todayClicks;
      document.getElementById('stat-weekly-clicks').innerText = stats.weeklyClicks;
    }
  } catch (err) {
    console.error('Failed to load statistics widgets:', err);
  }
}

// Fetch user's shortened URLs list based on active page, search query, sorting, and filters
async function loadUrls() {
  const token = localStorage.getItem('token');
  const search = document.getElementById('search-input').value;
  const isFavorite = document.getElementById('filter-favorite').value;
  const status = document.getElementById('filter-status').value;
  const sort = document.getElementById('sort-select').value;
  const tbody = document.getElementById('urls-table-body');

  let query = `page=${currentPage}&limit=${limit}`;
  if (search) query += `&search=${encodeURIComponent(search)}`;
  if (isFavorite) query += `&isFavorite=${isFavorite}`;
  if (status) query += `&status=${status}`;
  if (sort) query += `&sort=${sort}`;

  try {
    const res = await fetch(`/api/url?${query}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--danger-color);">Error fetching data from server.</td></tr>`;
      return;
    }

    const urls = data.data.urls;
    totalPages = data.pagination.totalPages || 1;
    
    // Render pagination indicators
    document.getElementById('page-indicator').innerText = `Page ${currentPage} of ${totalPages}`;
    document.getElementById('prev-page-btn').disabled = currentPage === 1;
    document.getElementById('next-page-btn').disabled = currentPage >= totalPages;

    if (urls.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-secondary);">No links found. Shorten one to get started!</td></tr>`;
      return;
    }

    // Populate rows
    tbody.innerHTML = urls.map(url => {
      const createdDateStr = new Date(url.createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      return `
        <tr>
          <td class="original-url-cell" title="${url.originalUrl}">${url.originalUrl}</td>
          <td>
            <a href="${url.shortUrl}" target="_blank" class="short-url-link">${url.shortUrl}</a>
            <button onclick="copyToClipboard('${url.shortUrl}')" class="btn-icon" style="display:inline-flex; padding: 4px; font-size:0.75rem; margin-left:6px;" title="Copy to clipboard">📋</button>
          </td>
          <td><span style="font-weight:600;">${url.clickCount}</span></td>
          <td>${createdDateStr}</td>
          <td>
            <div class="action-buttons">
              <button onclick="toggleFavorite('${url._id}')" class="btn-icon ${url.isFavorite ? 'fav-active' : ''}" title="Favorite">
                ${url.isFavorite ? '⭐' : '☆'}
              </button>
              <button onclick="openEditModal('${url._id}', '${url.customAlias || ''}')" class="btn-icon" title="Edit Custom Alias">
                ✏️
              </button>
              <button onclick="openAnalyticsModal('${url._id}')" class="btn-icon" title="View Analytics Charts">
                📊
              </button>
              <button onclick="deleteLink('${url._id}')" class="btn-icon" style="color: var(--danger-color);" title="Delete Link">
                🗑️
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--danger-color);">Failed to connect to backend server.</td></tr>`;
    console.error('Failed to load links:', err);
  }
}

// Copy link utility
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert('Short URL copied to clipboard!');
  }).catch(err => {
    console.error('Failed to copy to clipboard:', err);
  });
}

// Handle shorten form submit
async function handleCreateShorten(e) {
  e.preventDefault();
  const token = localStorage.getItem('token');
  const alertEl = document.getElementById('form-alert');
  
  const originalUrl = document.getElementById('originalUrl').value;
  const customAlias = document.getElementById('customAlias').value;
  const expiresAt = document.getElementById('expiresAt').value;

  alertEl.style.display = 'none';
  alertEl.className = 'alert';

  try {
    const res = await fetch('/api/url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ originalUrl, customAlias, expiresAt })
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      alertEl.innerText = data.message || 'Failed to shorten URL. Check constraints.';
      alertEl.classList.add('alert-danger');
      alertEl.style.display = 'block';
      return;
    }

    // Success response
    alertEl.innerText = 'Short URL created successfully!';
    alertEl.classList.add('alert-success');
    alertEl.style.display = 'block';

    // Reset inputs
    document.getElementById('shorten-form').reset();
    
    // Refresh table and stats
    loadStats();
    loadUrls();

  } catch (err) {
    alertEl.innerText = 'Network error. Failed to connect to server.';
    alertEl.classList.add('alert-danger');
    alertEl.style.display = 'block';
    console.error('Shorten form submission error:', err);
  }
}

// Toggle URL favorite status
async function toggleFavorite(id) {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`/api/url/${id}/favorite`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      loadUrls();
    }
  } catch (err) {
    console.error('Failed to toggle favorite:', err);
  }
}

// Delete shortened link
async function deleteLink(id) {
  if (!confirm('Are you sure you want to delete this shortened URL? This action is irreversible.')) {
    return;
  }
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`/api/url/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      loadStats();
      loadUrls();
    } else {
      alert('Failed to delete URL.');
    }
  } catch (err) {
    console.error('Failed to delete link:', err);
  }
}

// Edit custom alias modal operations
function openEditModal(id, currentAlias) {
  document.getElementById('edit-url-id').value = id;
  document.getElementById('edit-alias-input').value = currentAlias;
  document.getElementById('edit-alert').style.display = 'none';
  document.getElementById('edit-alias-modal').style.display = 'flex';
}

function closeEditModal() {
  document.getElementById('edit-alias-modal').style.display = 'none';
}

async function handleSaveAlias(e) {
  e.preventDefault();
  const token = localStorage.getItem('token');
  const id = document.getElementById('edit-url-id').value;
  const customAlias = document.getElementById('edit-alias-input').value;
  const alertEl = document.getElementById('edit-alert');

  alertEl.style.display = 'none';

  try {
    const res = await fetch(`/api/url/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ customAlias })
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      alertEl.innerText = data.message || 'Failed to update custom alias. Already in use?';
      alertEl.style.display = 'block';
      return;
    }

    // Success
    closeEditModal();
    loadUrls();
  } catch (err) {
    alertEl.innerText = 'Network error. Failed to save changes.';
    alertEl.style.display = 'block';
    console.error('Failed to save alias:', err);
  }
}

// Analytics modal operations
let chartInstances = {};

function closeAnalyticsModal() {
  document.getElementById('analytics-modal').style.display = 'none';
  currentUrlIdForCsv = null;
}

async function openAnalyticsModal(id) {
  const token = localStorage.getItem('token');
  currentUrlIdForCsv = id;

  try {
    // 1. Fetch metadata (original URL, short URL, QR code)
    const urlRes = await fetch(`/api/url/${id}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const urlData = await urlRes.json();
    if (!urlRes.ok || !urlData.success) {
      alert('Failed to load link metadata.');
      return;
    }

    const urlObj = urlData.data.url;
    document.getElementById('modal-title').innerText = `Analytics: /${urlObj.shortCode}`;
    document.getElementById('modal-original-url').innerText = urlObj.originalUrl;
    document.getElementById('modal-short-url').innerText = urlObj.shortUrl;
    document.getElementById('modal-short-url').href = urlObj.shortUrl;
    document.getElementById('modal-qr-image').src = urlObj.qrCode;
    document.getElementById('modal-qr-download').href = urlObj.qrCode;
    document.getElementById('modal-qr-download').download = `qr_${urlObj.shortCode}.png`;

    // 2. Fetch Aggregated Click Stats
    const statsRes = await fetch(`/api/analytics/${id}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const statsData = await statsRes.json();
    if (!statsRes.ok || !statsData.success) {
      alert('Failed to retrieve click statistics.');
      return;
    }

    const stats = statsData.data.analytics;

    // Render Charts
    renderChart('browsers-chart', 'doughnut', stats.distributions.browsers, 'Browsers');
    renderChart('countries-chart', 'bar', stats.distributions.countries, 'Countries');
    renderChart('devices-chart', 'pie', stats.distributions.devices, 'Devices');
    renderChart('os-chart', 'bar', stats.distributions.operatingSystems, 'Operating Systems');

    // Open Modal
    document.getElementById('analytics-modal').style.display = 'flex';

  } catch (err) {
    alert('Failed to retrieve analytics from server.');
    console.error('Failed to open analytics modal:', err);
  }
}

// Chart.js helper function to create and render beautiful visualizations
function renderChart(canvasId, type, dataArray, labelName) {
  const ctx = document.getElementById(canvasId).getContext('2d');

  // Destroy previous Chart instance to avoid overlap errors on canvas redraws
  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
  }

  const labels = dataArray.map(item => item._id || 'Unknown');
  const counts = dataArray.map(item => item.count);

  chartInstances[canvasId] = new Chart(ctx, {
    type: type,
    data: {
      labels: labels,
      datasets: [{
        label: `${labelName} Count`,
        data: counts,
        backgroundColor: [
          'rgba(99, 102, 241, 0.7)',
          'rgba(168, 85, 247, 0.7)',
          'rgba(16, 185, 129, 0.7)',
          'rgba(245, 158, 11, 0.7)',
          'rgba(239, 68, 68, 0.7)',
          'rgba(75, 85, 99, 0.7)'
        ],
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            color: 'rgba(255, 255, 255, 0.8)',
            font: { family: 'Outfit', size: 11 }
          }
        }
      },
      scales: type === 'bar' ? {
        y: {
          ticks: { color: 'rgba(255, 255, 255, 0.6)', font: { family: 'Outfit' } },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        },
        x: {
          ticks: { color: 'rgba(255, 255, 255, 0.6)', font: { family: 'Outfit' } },
          grid: { display: false }
        }
      } : {}
    }
  });
}
