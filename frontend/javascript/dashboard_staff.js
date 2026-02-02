// javascript/dashboard_staff.js

const API_BASE_URL = "http://localhost:8000";

// 1. Get User
async function getCurrentUser() {
    const token = localStorage.getItem("token");
    if (!token) return null;
    try {
        const res = await fetch(`${API_BASE_URL}/users/me`, {
            headers: { "Authorization": `Bearer ${token}` },
        });
        return res.ok ? await res.json() : null;
    } catch (err) { return null; }
}

// 2. Fetch STAFF Data
async function fetchStaffDashboard(userId) {
    const token = localStorage.getItem("token");
    try {
        // 👇 Notice the specific URL for staff
        const res = await fetch(`${API_BASE_URL}/api/dashboard/staff/${userId}`, {
            headers: { "Authorization": `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed");
        return await res.json();
    } catch (err) { console.error(err); return null; }
}

// 3. Populate UI
function populateDashboard(data, user) {
    if (!data) return;

    // --- Date & Welcome ---
    const now = new Date();
    document.getElementById("current-date").textContent = now.toLocaleDateString("en-US", { weekday: 'long', month: 'short', day: 'numeric' });
    
    const hour = now.getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    // Staff Welcome
    document.getElementById("welcome-message").innerHTML = `${greeting}, <span class="text-yellow-500"> ${user.first_name}</span>`;

    // --- Stats ---
    const stats = data.stats || {};
    animateValue("stat-active", 0, stats.active_reports || 0, 1000);
    animateValue("stat-matches", 0, stats.matches_today || 0, 1000);
    animateValue("stat-recovered", 0, stats.total_recovered || 0, 1000);

    // --- AI Feed (Matches) ---
    const matchesList = document.getElementById("recent-matches-list");
    if (matchesList && data.recent_matches.length > 0) {
        matchesList.innerHTML = data.recent_matches.map(m => `
            <div onclick="window.location.href='items.html?match_id=${m.match_id}'" 
                 class="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02] cursor-pointer hover:bg-white/5 transition">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
                        <i class="fas fa-fingerprint"></i>
                    </div>
                    <div class="space-y-1">
                        <div class="text-sm font-bold text-slate-200">Match: ${m.item_name}</div>
                        <div class="text-[10px] text-emerald-400 font-bold">${Math.round(m.similarity * 100)}% Confidence</div>
                    </div>
                </div>
                <div class="text-xs text-slate-500">${m.date}</div>
            </div>
        `).join('');
    }

    // --- Recent Logs ---
    const logsList = document.getElementById("recent-reports-list");
    if (logsList && data.recent_reports.length > 0) {
        logsList.innerHTML = data.recent_reports.map(item => `
            <div class="flex items-center justify-between py-4 px-3 hover:bg-white/5 rounded-lg transition">
                <div class="flex items-center gap-3">
                    <div class="w-2 h-2 rounded-full ${item.status === 'RECLAIMED' ? 'bg-emerald-500' : 'bg-blue-500'}"></div>
                    <div>
                        <p class="font-bold text-slate-300 text-sm">${item.name}</p>
                        <p class="text-[10px] text-slate-500 uppercase">Logged ${item.date}</p>
                    </div>
                </div>
                <span class="text-[10px] font-bold px-2 py-1 rounded border border-white/10 text-slate-400">${item.status}</span>
            </div>
        `).join('');
    }

    // --- Chart ---
    initChart(data.activity_chart || []);
}

// 4. Chart Logic
function initChart(data) {
    const ctx = document.getElementById('activityChart');
    if (!ctx) return;
    
    new Chart(ctx, {
        type: 'bar', // Staff usually prefer bar charts for "Items Logged"
        data: {
            labels: data.map(d => d.date),
            datasets: [{
                label: 'Items Logged',
                data: data.map(d => d.count),
                backgroundColor: '#EAB308',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                x: { grid: { display: false } }
            }
        }
    });
}

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

// Init
document.addEventListener("DOMContentLoaded", async () => {
    const user = await getCurrentUser();
    if (user && user.role_id === 3) {
        const data = await fetchStaffDashboard(user.user_id);
        populateDashboard(data, user);
    } else {
        // Simple security: if not staff, move them
        // window.location.href = "dashboard_normie.html";
    }
});