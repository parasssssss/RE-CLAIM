const API_BASE_URL = "http://localhost:8000";

// ---------- Get Current User ----------
async function getCurrentUser() {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Login required");
    window.location.href = "/login.html";
    return null;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/users/me`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to get user info");
    return await res.json();
  } catch (err) {
    console.error(err);
    alert("Unable to fetch user data");
    return null;
  }
}

// ---------- Fetch Dashboard Data ----------
async function fetchDashboard(userId) {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${API_BASE_URL}/api/dashboard/${userId}`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to load dashboard data");
    return await res.json();
  } catch (err) {
    console.error("Dashboard fetch failed:", err);
    return null;
  }
}

// ---------- Populate Dashboard ----------
function populateDashboard(data, user) {
  if (!data) return;

  // 1. Date & Welcome
  const now = new Date();
  const options = { weekday: "long", month: "long", day: "numeric" };
  document.getElementById("current-date").textContent = now.toLocaleDateString("en-US", options);
  
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  document.getElementById("welcome-message").textContent = `${greeting}, ${user.first_name}!`;

  // 2. Stats Cards
  const stats = data.stats || {};
  animateValue("stat-active", 0, stats.active_reports || 0, 1000);
  animateValue("stat-matches", 0, stats.matches_today || 0, 1000);
  animateValue("stat-recovered", 0, stats.total_recovered || 0, 1000);

  // 3. Recent Matches List
  const matchesList = document.getElementById("recent-matches-list");
  if (data.recent_matches && data.recent_matches.length > 0) {
    // Update matches list HTML generation
matchesList.innerHTML = data.recent_matches.map(m => `
  <div class="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-yellow-500/30 transition-all cursor-pointer group" onclick="window.location.href='items.html?match_id=${m.match_id}'">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-full bg-black flex items-center justify-center border border-gray-700 text-lg shadow-inner">
         ${m.similarity > 80 ? '🔥' : '🤖'}
      </div>
      <div>
        <p class="font-bold text-gray-200 text-sm group-hover:text-yellow-400 transition-colors">${m.item_name}</p>
        <p class="text-xs text-gray-500">#${m.match_id} • ${m.date}</p>
      </div>
    </div>
    <div class="text-right">
      <span class="inline-block px-3 py-1 bg-yellow-500/10 rounded-md text-xs font-bold text-yellow-500 border border-yellow-500/20">
        ${Math.round(m.similarity*100)}%
      </span>
    </div>
  </div>
`).join('');
  } else {
    matchesList.innerHTML = `<div class="text-center py-4 text-gray-400 text-sm">No matches found yet.</div>`;
  }

  // 4. Recent Reports List
  const reportsList = document.getElementById("recent-reports-list");
  if (data.recent_reports && data.recent_reports.length > 0) {
    reportsList.innerHTML = data.recent_reports.map(item => `
        <div class="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0 last:pb-0">
            <div>
                <p class="font-semibold text-gray-700 text-sm">${item.name}</p>
                <p class="text-xs text-gray-400">${item.date}</p>
            </div>
            <span class="text-xs px-2 py-1 rounded-full ${getStatusColor(item.status)}">
                ${item.status}
            </span>
        </div>
    `).join('');
  } else {
    reportsList.innerHTML = `<div class="text-sm text-gray-400">No reports filed recently.</div>`;
  }

  // 5. Activity Chart
  initChart(data.activity_chart || []);
}

// --- Helpers ---

function getStatusColor(status) {
    if (status === 'RECLAIMED') return 'bg-green-100 text-green-700';
    if (status === 'LOST') return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-600';
}

function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    if (!obj) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

function initChart(data) {
    const ctx = document.getElementById('activityChart');
    if (!ctx) return;
    
    if (window.myActivityChart) window.myActivityChart.destroy();

    // Setup Gradient for the line
    const canvas = ctx.getContext("2d");
    const gradient = canvas.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(212, 175, 55, 0.5)'); // Gold top
    gradient.addColorStop(1, 'rgba(212, 175, 55, 0.0)'); // Transparent bottom

    window.myActivityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.date),
            datasets: [{
                label: 'Reports Filed',
                data: data.map(d => d.count),
                borderColor: '#D4AF37', // Gold Border
                backgroundColor: gradient, // Gradient fill
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#D4AF37',
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false }
            },
            scales: {
                y: { 
                    beginAtZero: true, 
                    display: true,
                    grid: { color: 'rgba(255,255,255,0.05)' }, // Subtle grid
                    ticks: { color: '#9ca3af' } // Gray text
                },
                x: { 
                    grid: { display: false },
                    ticks: { color: '#9ca3af' } // Gray text
                }
            }
        }
    });
}

// ---------- DOM Load ----------
document.addEventListener("DOMContentLoaded", async () => {
  const user = await getCurrentUser();
  if (!user) return;
  const dashboardData = await fetchDashboard(user.user_id);
  if (!dashboardData) return;
  populateDashboard(dashboardData, user);
});
