// ✅ WRAPPED IN CLOSURE TO PREVENT CONFLICTS
(() => {
    /* ================= 1. PRIVATE UTILITIES (Scoped to this file) ================= */

    // Style Injector
    const addGlobalStyles = () => {
        if (!document.getElementById('admin-dynamic-styles')) {
            const style = document.createElement('style');
            style.id = 'admin-dynamic-styles';
            style.textContent = `
                /* Toast Animations */
                @keyframes slideInToast {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes fadeOutToast {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(10px); opacity: 0; }
                }
                .toast-enter { animation: slideInToast 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .toast-exit { animation: fadeOutToast 0.4s ease-in forwards; }

                /* Table Entry Animation */
                @keyframes entry { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-entry { animation: entry 0.3s ease-out forwards; }
                
                /* Fade In Dashboard */
                .fade-in-content { opacity: 0; transition: opacity 0.5s ease-out; }
                .fade-in-content.visible { opacity: 1; }
            `;
            document.head.appendChild(style);
        }
    };

    // Toast Manager
    const ToastManager = {
        container: null,
        init() {
            if (!document.getElementById('toast-container')) {
                this.container = document.createElement('div');
                this.container.id = 'toast-container';
                this.container.className = 'fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none';
                document.body.appendChild(this.container);
            } else {
                this.container = document.getElementById('toast-container');
            }
        },
        show(message, type = 'success') {
            this.init();
            const toast = document.createElement('div');
            const isError = type === 'error';
            const borderClass = isError ? 'border-red-500' : 'border-amber-500'; 
            const iconColor = isError ? 'text-red-600 bg-red-100' : 'text-amber-600 bg-amber-100';
            const title = isError ? 'System Alert' : 'Success';
            
            const iconSvg = isError 
                ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>'
                : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>';

            toast.className = `pointer-events-auto toast-enter flex items-start gap-4 p-4 min-w-[320px] max-w-sm bg-slate-900 text-white rounded-xl shadow-2xl border-l-4 ${borderClass}`;
            
            toast.innerHTML = `
                <div class="flex-shrink-0"><div class="${iconColor} rounded-full p-2"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">${iconSvg}</svg></div></div>
                <div class="flex-1 pt-0.5">
                    <h3 class="font-serif font-bold text-gray-100 text-sm leading-5">${title}</h3>
                    <p class="mt-1 text-sm text-gray-400 leading-relaxed">${message}</p>
                </div>
                <button onclick="this.parentElement.remove()" class="ml-4 text-gray-500 hover:text-white"><svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg></button>
            `;
            this.container.appendChild(toast);
            setTimeout(() => {
                if(toast.parentElement) {
                    toast.classList.replace('toast-enter', 'toast-exit');
                    toast.addEventListener('animationend', () => toast.remove());
                }
            }, 5000);
        }
    };

    // Initialize Styles
    addGlobalStyles();

    /* ================= 2. MAIN LOGIC ================= */

    const BASE_URL = "http://127.0.0.1:8000";
    const ADMIN_API = `${BASE_URL}/super-admin`;

    // ========================
    // 1. AUTH & INIT
    // ========================
    
    // This is the SINGLE entry point for the page
    document.addEventListener("DOMContentLoaded", () => {
        // 1. Set Date
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dateEl = document.getElementById("current-date-display");
        if(dateEl) dateEl.textContent = new Date().toLocaleDateString('en-US', options);

        // 2. Start Main Process
        initDashboardData();
    });

    async function initDashboardData() {
        // ✅ 1. GRAB TOKEN HERE FIRST
        const token = localStorage.getItem("token");
        
        // ✅ 2. CHECK TOKEN
        if (!token) {
            console.warn("No token found, redirecting to login...");
            window.location.href = "login.html"; // Ensure this filename is correct
            return;
        }

        try {
            // ✅ 3. PASS TOKEN TO FUNCTIONS
            await Promise.allSettled([
                loadAdminStats(token),
                loadBusinessCode(token),
                verifyAdminSession(token) // Optional check
            ]);
            
        } catch (error) {
            console.error("Critical Error during init:", error);
        } finally {
            // 4. Reveal Dashboard
            revealDashboard();
        }
    }

    async function verifyAdminSession(token) {
        try {
            const res = await fetch(`${BASE_URL}/users/me`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!res.ok) throw new Error("Invalid Session");
            const user = await res.json();

            // Strict Role Check (Super Admin = 1)
            if (user.role_id == 2) {
                
                return;
            }
            updateProfileUI(user);
        } catch (err) {
            console.error("Auth Error:", err);
        }
    }

    // ========================
    // 2. DATA LOADERS
    // ========================

    async function loadAdminStats(token) {
        try {
            const res = await fetch("http://127.0.0.1:8000/admin-stats", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            
            if (!res.ok) throw new Error(`Stats API Error: ${res.status}`);
            
            const data = await res.json();

            // Safe Animation Helper
            const safeAnimate = (id, val) => {
                if(document.getElementById(id)) animateValue(id, 0, val, 1500);
            };

            safeAnimate("kpi-pending", data.pending_claims || 0);
            safeAnimate("kpi-storage", data.storage_count || 0);
            safeAnimate("kpi-staff", data.staff_count || 0);

            const rateEl = document.getElementById("kpi-match-rate");
            if(rateEl) {
                 const rateVal = data.returned_month !== undefined ? data.returned_month : 0;
                 animateValue("kpi-match-rate", 0, rateVal, 1500, " Items");
            }

            if(data.feed) renderFeed(data.feed);
            if(data.chart) renderAdminChart(data.chart.labels, data.chart.data);

        } catch (err) {
            console.error("❌ Failed to load Admin Stats:", err);
        }
    }

    async function loadBusinessCode(token) {
        try {
            // Note: Ensure your backend user_routes.py has the /me/business-code endpoint
            const res = await fetch("http://127.0.0.1:8000/users/me/business-code", {
                headers: { 
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (res.ok) {
                const data = await res.json();
                const codeEl = document.getElementById("header-business-code");
                const containerEl = document.getElementById("business-info-display");

                if (data.business_code) {
                    if(codeEl) codeEl.textContent = data.business_code;
                    if(containerEl) containerEl.classList.remove("hidden");
                }
            } else {
                console.warn(`Business Code API returned ${res.status}`);
            }
        } catch (err) {
            console.error("❌ Network error loading Business Code:", err);
        }
    }

    // ========================
    // 3. UI HELPERS
    // ========================

    function revealDashboard() {
        const skeleton = document.getElementById("dashboard-skeleton");
        const content = document.getElementById("dashboard-content");

        if(skeleton) skeleton.style.display = 'none';
        if(content) {
            content.classList.remove("hidden");
            content.style.opacity = "1"; 
        }
    }

    function updateProfileUI(user) {
        const displayName = user.first_name || user.email.split('@')[0];
        
        const emailEl = document.getElementById("profile-email");
        if(emailEl) emailEl.textContent = displayName;

        const dropdownEl = document.getElementById("dropdown-email");
        if(dropdownEl) dropdownEl.textContent = user.email;

        const roleEl = document.getElementById("profile-role");
        if(roleEl) roleEl.textContent = "Super Admin";

        const initialEl = document.getElementById("profile-initial");
        if(initialEl) initialEl.textContent = displayName.charAt(0).toUpperCase();
    }

    function animateValue(id, start, end, duration, suffix = "") {
        const obj = document.getElementById(id);
        if (!obj) return;

        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const value = Math.floor(progress * (end - start) + start);
            obj.innerHTML = value + suffix;
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                obj.innerHTML = end + suffix;
            }
        };
        window.requestAnimationFrame(step);
    }

    function renderFeed(items) {
        const container = document.getElementById("operations-feed-container");
        if (!container) return;
        container.innerHTML = ""; 

        if (!items || items.length === 0) {
            container.innerHTML = `<p class="text-sm text-gray-400">No recent activity.</p>`;
            return;
        }

        items.forEach((item, index) => {
            const html = `
            <div class="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0 opacity-0 animate-slide-up" style="animation-delay: ${index * 150}ms; animation-fill-mode: forwards;">
                <div class="w-2 h-2 mt-2 rounded-full bg-blue-500 flex-shrink-0"></div>
                <div>
                    <p class="text-sm font-medium text-white">${item.text}</p>
                    <p class="text-xs text-gray-500">${item.subtext}</p>
                </div>
            </div>`;
            container.innerHTML += html;
        });
    }

    function renderAdminChart(labels, dataPoints) {
        const ctx = document.getElementById('adminChart');
        if (!ctx) return; 

        if (window.myAdminChart instanceof Chart) {
            window.myAdminChart.destroy();
        }

        window.myAdminChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Items',
                    data: dataPoints,
                    borderColor: '#EAB308',
                    backgroundColor: 'rgba(234, 179, 8, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: '#333' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    // ========================
    // 4. GLOBAL INTERACTIONS
    // ========================

    window.toggleProfileMenu = function() {
        const menu = document.getElementById('profile-dropdown');
        if(menu) menu.classList.toggle('hidden');
    }

    window.switchView = function(viewName) {
        // Simple view switching logic if you use single-page tabs
        // Note: Your current HTML seems to only have one dashboard view visible
        console.log("Switching to view:", viewName);
    }

    // Close Dropdown when clicking outside
    window.addEventListener('click', function(e) {
        const menu = document.getElementById('profile-dropdown');
        const btn = e.target.closest('button');
        if (menu && !menu.classList.contains('hidden') && !btn && !menu.contains(e.target)) {
            menu.classList.add('hidden');
        }
    });

    // Logout
    const logoutBtn = document.getElementById("header-logout-btn");
    if(logoutBtn) {
        logoutBtn.addEventListener("click", () => {
             localStorage.removeItem("token"); 
             window.location.href = "login.html"; // Ensure filename is correct
        });
    }

})();