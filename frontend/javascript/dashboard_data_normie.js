const API_BASE_URL = "http://localhost:8000";

// ---------- 1. Get Current User ----------
async function getCurrentUser() {
  const token = localStorage.getItem("token");
  if (!token) {
    // Optional: Redirect to login if needed, or handle as guest
    // window.location.href = "/login.html";
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
    return null;
  }
}

// ---------- 2. Fetch Dashboard Data ----------
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

// ---------- 3. Populate Dashboard UI ----------
function populateDashboard(data, user) {
  if (!data) return;

  // A. Date & Welcome
  const now = new Date();
  const options = { weekday: "long", month: "long", day: "numeric" };
  const dateEl = document.getElementById("current-date");
  if(dateEl) dateEl.textContent = now.toLocaleDateString("en-US", options);
  
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const welcomeEl = document.getElementById("welcome-message");
  if(welcomeEl) welcomeEl.textContent = `${greeting}, ${user.first_name}`;

  // B. Stats Animation
  const stats = data.stats || {};
  if(document.getElementById("stat-active")) animateValue("stat-active", 0, stats.active_reports || 0, 1000);
  if(document.getElementById("stat-matches")) animateValue("stat-matches", 0, stats.matches_today || 0, 1000);
  if(document.getElementById("stat-recovered")) animateValue("stat-recovered", 0, stats.total_recovered || 0, 1000);

  // C. Recent Matches List (Luxury Cards with Progress Bar)
  const matchesList = document.getElementById("recent-matches-list");
  if (matchesList) {
      if (data.recent_matches && data.recent_matches.length > 0) {
        matchesList.innerHTML = data.recent_matches.map(m => {
            const percentage = Math.round(m.similarity * 100);
            const isHighMatch = percentage > 80;
            const barColor = isHighMatch ? 'bg-emerald-500' : 'bg-yellow-500';
            const textColor = isHighMatch ? 'text-emerald-400' : 'text-yellow-400';
            
            return `
            <div onclick="window.location.href='items.html?match_id=${m.match_id}'" 
                 class="group relative p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300 cursor-pointer">
                
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-lg bg-[#0F1219] border border-white/10 flex items-center justify-center text-lg text-slate-400 group-hover:text-white group-hover:border-${isHighMatch ? 'emerald' : 'yellow'}-500/50 transition-colors shadow-inner">
                        ${isHighMatch ? '<i class="fas fa-check-double"></i>' : '<i class="fas fa-search"></i>'}
                    </div>
                    
                    <div class="flex-grow">
                        <div class="flex justify-between items-center mb-1">
                            <h4 class="font-bold text-slate-200 text-sm group-hover:text-white">${m.item_name}</h4>
                            <span class="text-sm font-bold ${textColor}">${percentage}%</span>
                        </div>
                        
                        <div class="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div class="h-full ${barColor} rounded-full transition-all duration-1000" style="width: ${percentage}%"></div>
                        </div>
                        
                        <div class="flex justify-between mt-2">
                            <span class="text-[10px] text-slate-500 font-mono">#${m.match_id}</span>
                            <span class="text-[10px] text-slate-500">${m.date}</span>
                        </div>
                    </div>
                </div>
            </div>`;
        }).join('');
      } else {
        matchesList.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12 text-center border border-dashed border-white/10 rounded-2xl">
                <div class="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3">
                    <i class="fas fa-inbox text-slate-500"></i>
                </div>
                <p class="text-slate-500 text-sm">No matches found yet.</p>
            </div>`;
      }
  }

  // D. Recent Reports List (Clean Rows)
  const reportsList = document.getElementById("recent-reports-list");
  if (reportsList) {
      if (data.recent_reports && data.recent_reports.length > 0) {
        reportsList.innerHTML = data.recent_reports.map(item => `
            <div class="flex items-center justify-between py-4 group cursor-pointer hover:bg-white/[0.02] px-3 rounded-lg -mx-3 transition-colors">
                <div class="flex items-center gap-3">
                    <div class="w-2 h-2 rounded-full ${getStatusDotColor(item.status)} shadow-[0_0_8px_currentColor]"></div>
                    <div>
                        <p class="font-bold text-slate-300 text-sm group-hover:text-white transition-colors">${item.name}</p>
                        <p class="text-[10px] text-slate-500 uppercase tracking-wide">${item.date}</p>
                    </div>
                </div>
                <span class="text-[10px] font-bold px-2 py-1 rounded border ${getStatusBadgeStyle(item.status)}">
                    ${item.status}
                </span>
            </div>
        `).join('');
      } else {
        reportsList.innerHTML = `<div class="text-sm text-slate-500 text-center py-6 italic">No reports filed recently.</div>`;
      }
  }

  // E. Activity Chart
  initChart(data.activity_chart || []);
}

// ---------- 4. Chart Logic ----------
function initChart(data) {
    const ctx = document.getElementById('activityChart');
    if (!ctx) return;
    if (typeof Chart === 'undefined') return;
    if (window.myActivityChart) window.myActivityChart.destroy();

    const canvas = ctx.getContext("2d");
    const gradient = canvas.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(234, 179, 8, 0.3)'); // Yellow-500
    gradient.addColorStop(1, 'rgba(234, 179, 8, 0.0)');

    window.myActivityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.date),
            datasets: [{
                label: 'Activity',
                data: data.map(d => d.count),
                borderColor: '#EAB308',
                backgroundColor: gradient,
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#0B0F19',
                pointBorderColor: '#EAB308',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { 
                    beginAtZero: true, 
                    border: { display: false },
                    grid: { color: 'rgba(255,255,255,0.05)', borderDash: [5, 5] }, 
                    ticks: { color: '#64748b', font: { size: 10 } } 
                },
                x: { 
                    grid: { display: false },
                    ticks: { color: '#64748b', font: { size: 10 } } 
                }
            }
        }
    });
}

// ---------- 5. Helper Functions (The Missing Pieces!) ----------

// This was missing in your code causing the error:
function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    if (!obj) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
}

function getStatusDotColor(status) {
    if (status === 'RECLAIMED') return 'bg-emerald-500 text-emerald-500';
    if (status === 'LOST') return 'bg-rose-500 text-rose-500';
    return 'bg-slate-500 text-slate-500';
}

function getStatusBadgeStyle(status) {
    if (status === 'RECLAIMED') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (status === 'LOST') return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
}

// ---------- 6. DOM Initialization ----------
// ---------- 6. Init ----------
document.addEventListener("DOMContentLoaded", async () => {
  const user = await getCurrentUser();
  if (!user) return;
  const dashboardData = await fetchDashboard(user.user_id);
  if (!dashboardData) return;
  populateDashboard(dashboardData, user);
});


document.addEventListener("DOMContentLoaded", () => {
        const glow = document.getElementById("interactive-glow");
        if (window.matchMedia("(min-width: 768px)").matches) {
            document.addEventListener("mouseenter", () => glow.style.opacity = "1");
            document.addEventListener("mousemove", (e) => {
                requestAnimationFrame(() => {
                    glow.style.left = `${e.clientX}px`;
                    glow.style.top = `${e.clientY}px`;
                });
            });
            document.addEventListener("mouseleave", () => glow.style.opacity = "0");
        }
    });