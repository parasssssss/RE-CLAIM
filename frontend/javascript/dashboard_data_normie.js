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

  // --- Date & Welcome ---
  const now = new Date();
  const options = { weekday: "long", month: "short", day: "numeric", year: "numeric" };
  document.getElementById("current-date").textContent = now.toLocaleDateString("en-US", options);
  document.getElementById("welcome-message").textContent = `Good ${
    now.getHours() < 12 ? "morning" : now.getHours() < 18 ? "afternoon" : "evening"
  }, ${user.first_name}!`;

  // --- Today Stats (Use for top cards instead of yesterday) ---
  const t = data.today_stats ?? { items_reported: 0, matches_found: 0, items_recovered: 0 };
  const todayStatsEl = document.getElementById("yesterday-updates"); // same card container, now "today-aware"
  todayStatsEl.innerHTML = `
    <div class="update-stat"><div class="update-number">${t.items_reported}</div><div class="update-label">Items reported</div></div>
    <div class="update-stat"><div class="update-number">${t.matches_found}</div><div class="update-label">Matches Found</div></div>
    <div class="update-stat"><div class="update-number">${t.items_recovered}</div><div class="update-label">Items Recovered</div></div>
  `;

  // --- Today's Reports ---
  const todayReports = data.today_reports ?? [];
  document.getElementById("today-reports-count").textContent = todayReports.length;
  const todayListEl = document.getElementById("today-reports-list");
  todayListEl.innerHTML = todayReports.map(r => `
    <div class="order-item"><div class="order-info">
      <span class="order-name">${r.item_type}${r.brand ? " - "+r.brand : ""}</span>
      <span class="order-price">${r.status}</span>
    </div></div>
  `).join("");

  // --- Monthly Stats ---
  document.getElementById("monthly-recoveries").textContent = data.monthly_recoveries?.count ?? 0;
  document.getElementById("monthly-change").innerHTML = `
    <i class="fas fa-arrow-${data.monthly_recoveries.change >=0 ? "up":"down"} mr-1"></i>${data.monthly_recoveries.change >=0?"+":""}${data.monthly_recoveries.change.toFixed(2)}
  `;
  document.getElementById("success-rate").textContent = `${data.recovery_rate?.current ?? 0}%`;
  document.getElementById("success-rate-change").innerHTML = `
    <i class="fas fa-arrow-${data.recovery_rate.change >=0 ? "up":"down"} mr-1"></i>${data.recovery_rate.change >=0?"+":""}${data.recovery_rate.change.toFixed(2)}
  `;

  // --- Categories ---
  const topCatEl = document.getElementById("top-categories");
  topCatEl.innerHTML = (data.categories ?? []).map(c => `
    <div class="flex items-center justify-between">
      <span>${c.category}</span>
      <span class="font-semibold">${c.percentage}%</span>
    </div>
  `).join("");

  // --- Progress Bar ---
  const progressBar = document.querySelector(".market-card .bg-gradient-to-r");
  progressBar.style.width = `${data.recovery_rate?.current ?? 0}%`;
  document.querySelector(".market-card .flex .font-semibold").textContent = `${data.recovery_rate?.current ?? 0}%`;

  // --- Chart.js ---
  const ctx = document.createElement("canvas");
  const chartContainer = document.querySelector(".chart-card .h-48");
  chartContainer.innerHTML = "";
  chartContainer.appendChild(ctx);

  const labels = (data.activity_overview ?? []).map(a => a.date);
  const reported = (data.activity_overview ?? []).map(a => a.items_reported);
  const recovered = (data.activity_overview ?? []).map(a => a.items_recovered);

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        { label: "Items Reported", data: reported, backgroundColor: "rgba(54, 162, 235, 0.7)", borderRadius: 4 },
        { label: "Items Recovered", data: recovered, backgroundColor: "rgba(75, 192, 192, 0.7)", borderRadius: 4 }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "top" } },
      scales: { y: { beginAtZero: true }, x: { stacked: false } }
    }
  });


  // --- Daily Recovery Rate Chart ---
const recoveryCtx = document.createElement("canvas");
const recoveryContainer = document.getElementById("recovery-rate-chart-container");
recoveryContainer.innerHTML = ""; // clear old chart
recoveryContainer.appendChild(recoveryCtx);

const recoveryRateData = (data.activity_overview ?? []).map(a => {
  // calculate % recovered per day
  return a.items_reported ? ((a.items_recovered / a.items_reported) * 100).toFixed(2) : 0;
});

new Chart(recoveryCtx, {
  type: "line",
  data: {
    labels: (data.activity_overview ?? []).map(a => a.date),
    datasets: [{
      label: "Recovery Rate (%)",
      data: recoveryRateData,
      fill: true,
      backgroundColor: "rgba(75,192,192,0.2)",
      borderColor: "rgba(75,192,192,1)",
      tension: 0.3
    }]
  },
  options: {
    responsive: true,
    plugins: { legend: { position: "top" } },
    scales: { y: { beginAtZero: true, max: 100 } }
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
