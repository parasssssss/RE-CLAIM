document.addEventListener("DOMContentLoaded", () => {
    // 1. Set Date
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateEl = document.getElementById("current-date-display");
    if(dateEl) dateEl.textContent = new Date().toLocaleDateString('en-US', options);

    loadAdminStats();
});

async function loadAdminStats() {
    const token = localStorage.getItem("token");
    if(!token) return window.location.href = "index.html"; 

    try {
        const res = await fetch("http://127.0.0.1:8000/admin-stats", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error("Failed to fetch stats");
        
        const data = await res.json();

        // 1. ANIMATE Text KPIs (Count up effect)
        // We use animateValue instead of setText for the numbers
        animateValue("kpi-pending", 0, data.pending_claims, 1500);
        animateValue("kpi-storage", 0, data.storage_count, 1500);
        animateValue("kpi-staff", 0, data.staff_count, 1500);

        // Match Rate (Handling Percentage)
        const rateEl = document.getElementById("kpi-match-rate");
        // If your backend sends 'match_rate' (percentage), use that. 
        // If it sends 'returned_month' (count), use that.
        // Assuming percentage based on your previous request:
        if(rateEl) {
             const rateVal = data.returned_month !== undefined ? data.returned_month : 0;
             animateValue("kpi-match-rate", 0, rateVal, 1500, " Items");
        }

        // 2. Render Feed with Staggered Animation
        renderFeed(data.feed);

        // 3. Render Chart
        renderAdminChart(data.chart.labels, data.chart.data);

    } catch (err) {
        console.error("Dashboard Load Error:", err);
    }
}

// Updated Animation Function (Supports Suffix like '%')
function animateValue(id, start, end, duration, suffix = "") {
    const obj = document.getElementById(id);
    if (!obj) return;

    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        
        // Easing function (easeOutExpo) for smoother stop
        const easeOut = 1 - Math.pow(2, -10 * progress);
        
        const value = Math.floor(easeOut * (end - start) + start);
        obj.innerHTML = value + suffix;

        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.innerHTML = end + suffix; // Ensure final number is exact
        }
    };
    window.requestAnimationFrame(step);
}

function renderFeed(items) {
    const container = document.getElementById("operations-feed-container");
    if (!container) return;
    
    container.innerHTML = ""; 

    if (!items || items.length === 0) {
        container.innerHTML = `<p class="text-sm text-gray-400 animate-fade-in">No recent activity.</p>`;
        return;
    }

    items.forEach((item, index) => {
        const timeDiff = Math.floor((new Date() - new Date(item.time)) / 60000);
        let timeStr = timeDiff < 60 ? `${timeDiff}m ago` : `${Math.floor(timeDiff/60)}h ago`;

        // We add 'animate-slide-up' class and a dynamic animation-delay
        const html = `
        <div class="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0 opacity-0 animate-slide-up" style="animation-delay: ${index * 150}ms; animation-fill-mode: forwards;">
            <div class="w-2 h-2 mt-2 rounded-full bg-blue-500 flex-shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
            <div>
                <p class="text-sm font-medium text-white">${item.text}</p>
                <p class="text-xs text-gray-500">${item.subtext}</p>
                <span class="text-xs text-gray-400 block mt-1">${timeStr}</span>
            </div>
        </div>`;
        container.innerHTML += html;
    });
}

function renderAdminChart(labels, dataPoints) {
    const ctx = document.getElementById('adminChart');
    if (!ctx) return; 

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Items Logged',
                data: dataPoints,
                borderColor: '#EAB308', // Yellow-500
                backgroundColor: (context) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
                    gradient.addColorStop(0, 'rgba(234, 179, 8, 0.2)');
                    gradient.addColorStop(1, 'rgba(234, 179, 8, 0.0)');
                    return gradient;
                },
                borderWidth: 2,
                tension: 0.4, // Smoother curves
                fill: true,
                pointRadius: 4,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#EAB308',
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            animation: {
                y: {
                    duration: 2000,
                    easing: 'easeOutQuart'
                }
            },
            scales: {
                y: { 
                    beginAtZero: true, 
                    grid: { borderDash: [4, 4], color: '#f3f4f6' },
                    ticks: { font: { size: 10 } }
                },
                x: { 
                    grid: { display: false },
                    ticks: { font: { size: 10 } }
                }
            }
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    
    // 1. Start fetching your data (Staff, Logs, etc.)
    initDashboardData();

});

async function initDashboardData() {
    try {
        // --- YOUR EXISTING FETCH CALLS GO HERE ---
        // Example: await fetchAdminStats();
        // Example: await fetchStaff();
        
        // Simulating a network delay so you can see the animation (Remove this setTimeout in production)
        await new Promise(r => setTimeout(r, 1500)); 

        // 2. Once data is ready, swap skeleton for real content
        revealDashboard();

    } catch (error) {
        console.error("Error loading dashboard:", error);
    }
}

function revealDashboard() {
    const skeleton = document.getElementById("dashboard-skeleton");
    const content = document.getElementById("dashboard-content");

    if(!skeleton || !content) return;

    // Fade out skeleton
    skeleton.style.display = 'none';

    // Show content
    content.classList.remove("hidden");
    
    // Small timeout to allow the remove("hidden") to apply before changing opacity for the fade effect
    setTimeout(() => {
        content.classList.remove("opacity-0");
    }, 50);
}