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
            const borderClass = isError ? 'border-red-500' : 'border-amber-500'; // Amber for Admin
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
    async function verifyAdminSession() {
        const token = localStorage.getItem("token");
        if (!token) { window.location.href = "login.html"; return; }

        try {
            // 1. Fetch User Data
            const res = await fetch(`${BASE_URL}/users/me`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!res.ok) throw new Error("Invalid Session");
            
            const user = await res.json();

            // 2. Strict Role Check (Super Admin = 1)
            if (user.role_id !== 1) {
                // Using alert here because we are redirecting immediately
                alert("⛔ Access Denied: Super Admin only.");
                localStorage.removeItem("token");
                window.location.href = "login.html";
                return;
            }

            // 3. ✅ UPDATE PROFILE HEADER UI
            updateProfileUI(user);

            // 4. Show Dashboard & Load Data (Smooth Reveal)
            const appBody = document.getElementById("app-body");
            appBody.classList.remove("hidden");
            appBody.classList.add("fade-in-content");
            
            // Trigger reflow
            void appBody.offsetWidth; 
            appBody.classList.add("visible");

            fetchKPIs();
            initCharts();

        } catch (err) {
            console.error("Auth Error:", err);
            localStorage.removeItem("token");
            window.location.href = "login.html";
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

    function getHeaders() {
        return {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem('token')}`
        };
    }

    // ========================
    // 2. UI INTERACTION
    // ========================

    // Exposed for onclick in HTML
    window.toggleProfileMenu = function() {
        const menu = document.getElementById('profile-dropdown');
        if(menu) menu.classList.toggle('hidden');
    }

    // View Switcher (Exposed)
    window.switchView = function(viewName) {
        // Sidebar Active State
        document.querySelectorAll('.nav-item').forEach(el => {
            el.classList.remove('nav-active');
            el.classList.add('text-slate-400');
        });
        const activeBtn = document.getElementById(`nav-${viewName}`);
        if(activeBtn) {
            activeBtn.classList.add('nav-active');
            activeBtn.classList.remove('text-slate-400');
        }

        // Hide/Show Sections with simple fade
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
        
        const targetView = document.getElementById(`view-${viewName}`);
        if(targetView) {
            targetView.classList.remove('hidden');
            targetView.classList.add('animate-entry'); // Re-trigger entry animation
        }

        // Update Title
        const titles = {
            'overview': 'Platform Overview',
            'businesses': 'Tenant Registry',
            'users': 'User Management',
            'system': 'System Health'
        };
        const titleEl = document.getElementById('page-title');
        if(titleEl) titleEl.textContent = titles[viewName] || 'Dashboard';

        // Lazy Load Data
        if (viewName === 'businesses') fetchBusinesses();
        if (viewName === 'users') fetchUsers();
    }

    // ========================
    // 3. DATA FETCHERS
    // ========================

    // --- KPIs ---
    async function fetchKPIs() {
        try {
            const res = await fetch(`${ADMIN_API}/kpi/overview`, { headers: getHeaders() });
            if(!res.ok) throw new Error("Failed to load KPIs");
            const data = await res.json();
            
            const formatRupee = (num) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);

            const els = {
                revenue: document.getElementById('kpi-revenue'),
                users: document.getElementById('kpi-users'),
                success: document.getElementById('kpi-success'),
                ai: document.getElementById('kpi-ai')
            };

            if(els.revenue) els.revenue.textContent = formatRupee(data.monthly_revenue);
            if(els.users) els.users.textContent = data.total_users.toLocaleString();
            if(els.success) els.success.textContent = data.match_success_rate + '%';
            if(els.ai) els.ai.textContent = data.avg_ai_confidence + '%';
            
            Object.values(els).forEach(el => { if(el) el.classList.remove('skeleton'); });
        } catch (err) { 
            console.error("KPI Error", err);
            ToastManager.show("Failed to load dashboard metrics.", "error");
        }
    }

    // --- BUSINESSES ---
    async function fetchBusinesses() {
        try {
            const res = await fetch(`${ADMIN_API}/businesses`, { headers: getHeaders() });
            const businesses = await res.json();
            const tbody = document.getElementById('business-table-body');
            if(!tbody) return;
            tbody.innerHTML = ''; 

            businesses.forEach((b, index) => {
                const statusClass = b.is_active ? 'status-active' : 'status-suspended';
                const statusText = b.is_active ? 'Active' : 'Suspended';
                
                // Staggered Animation
                const delayStyle = `style="animation-delay: ${index * 50}ms"`;

                const row = `
                    <tr class="hover:bg-white/5 transition-colors border-b border-white/5 animate-entry" ${delayStyle}>
                        <td class="p-6 font-bold text-white">${b.name}</td>
                        <td class="p-6">
                            <span class="font-mono text-amber-500 bg-amber-500/10 px-2 py-1 rounded text-xs border border-amber-500/20 select-all cursor-copy" title="Click to copy">${b.code}</span>
                        </td>
                        <td class="p-6 text-slate-300 italic">${b.plan}</td>
                        <td class="p-6"><span class="${statusClass} px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">${statusText}</span></td>
                        <td class="p-6 text-slate-400 text-xs">${b.items_reported} Items</td>
                        <td class="p-6 text-right">
                            <button onclick="window.toggleBusinessStatus(${b.id})" class="text-slate-500 hover:text-white transition-colors"><i class="fas fa-power-off"></i></button>
                        </td>
                    </tr>`;
                tbody.innerHTML += row;
            });
        } catch (err) { 
            console.error("Business Fetch Error", err); 
            ToastManager.show("Error loading businesses.", "error");
        }
    }

    // --- USERS ---
    async function fetchUsers() {
        try {
            const res = await fetch(`${ADMIN_API}/users`, { headers: getHeaders() }); 
            const users = await res.json();
            const tbody = document.getElementById('user-table-body');
            if(!tbody) return;
            tbody.innerHTML = '';

            const roleNames = {
                1: '<span class="text-amber-500 font-bold">Super Admin</span>',
                2: '<span class="text-purple-400">Business Admin</span>',
                3: '<span class="text-blue-400">Staff</span>',
                4: '<span class="text-slate-400">User</span>'
            };

            users.forEach((u, index) => {
                const statusClass = u.is_active ? 'text-emerald-400' : 'text-red-400';
                const statusText = u.is_active ? 'Active' : 'Banned';
                const roleDisplay = roleNames[u.role_id] || 'Unknown';

                let codeDisplay = u.business_code 
                    ? `<span class="font-mono text-amber-500 bg-amber-500/10 px-2 py-1 rounded text-xs border border-amber-500/20">${u.business_code}</span>` 
                    : `<span class="text-slate-600 text-xs">N/A</span>`;
                
                let nameDisplay = u.business_id 
                    ? `<span class="text-slate-300">Business #${u.business_id}</span>` 
                    : `<span class="text-slate-500 italic">Public User</span>`;

                // Dynamic Action Button
                let actionBtn = u.is_active 
                    ? `<button onclick="window.toggleUserBan(${u.user_id}, true)" class="text-red-500 hover:text-red-400 text-[10px] border border-red-500/30 px-3 py-1 rounded hover:bg-red-500/10 transition-colors">BAN</button>`
                    : `<button onclick="window.toggleUserBan(${u.user_id}, false)" class="text-emerald-500 hover:text-emerald-400 text-[10px] border border-emerald-500/30 px-3 py-1 rounded hover:bg-emerald-500/10 transition-colors">UNBAN</button>`;

                // Staggered Animation
                const delayStyle = `style="animation-delay: ${index * 50}ms"`;

                const row = `
                    <tr class="hover:bg-white/5 transition-colors border-b border-white/5 animate-entry" ${delayStyle}>
                        <td class="p-6 text-white font-medium">${u.email}</td>
                        <td class="p-6">${roleDisplay}</td>
                        <td class="p-6">${codeDisplay}</td>
                        <td class="p-6">${nameDisplay}</td>
                        <td class="p-6 ${statusClass} font-bold text-xs uppercase">${statusText}</td>
                        <td class="p-6 text-right">${actionBtn}</td>
                    </tr>`;
                tbody.innerHTML += row;
            });
        } catch (err) { 
            console.error("User Fetch Error", err);
            ToastManager.show("Error loading users.", "error"); 
        }
    }

    // ========================
    // 4. ACTIONS (Exposed to Window)
    // ========================
    window.toggleBusinessStatus = async function(id) {
        if(!confirm("Toggle status for this business?")) return;
        try {
            await fetch(`${ADMIN_API}/businesses/${id}/toggle-status`, { method: 'POST', headers: getHeaders() });
            ToastManager.show("Business status updated.");
            fetchBusinesses();
        } catch(e) {
            ToastManager.show("Action failed.", "error");
        }
    }

    window.toggleUserBan = async function(id, isCurrentlyActive) {
        const action = isCurrentlyActive ? "BAN" : "UNBAN";
        if(!confirm(`Are you sure you want to ${action} this user?`)) return;
        
        try {
            const res = await fetch(`${ADMIN_API}/users/${id}/toggle-ban`, { method: 'POST', headers: getHeaders() });
            if(res.ok) {
                ToastManager.show(`User ${action} successful.`);
                fetchUsers();
            } else {
                throw new Error("API Error");
            }
        } catch (e) { 
            ToastManager.show("Action failed.", "error"); 
        }
    }

    // --- CHARTS ---
    async function initCharts() {
        try {
            const revRes = await fetch(`${ADMIN_API}/kpi/revenue-chart`, { headers: getHeaders() });
            const revData = await revRes.json();
            const catRes = await fetch(`${ADMIN_API}/kpi/categories`, { headers: getHeaders() });
            const catData = await catRes.json();

            const revCanvas = document.getElementById('revenueChart');
            if(revCanvas) {
                new Chart(revCanvas.getContext('2d'), {
                    type: 'line',
                    data: {
                        labels: revData.map(d => `Month ${d.month}`),
                        datasets: [{ label: 'Revenue', data: revData.map(d => d.revenue), borderColor: '#d97706', backgroundColor: 'rgba(217, 119, 6, 0.05)', tension: 0.4, fill: true }]
                    },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } }
                });
            }

            const catCanvas = document.getElementById('categoryChart');
            if(catCanvas) {
                new Chart(catCanvas.getContext('2d'), {
                    type: 'doughnut',
                    data: {
                        labels: catData.map(d => d.label),
                        datasets: [{ data: catData.map(d => d.count), backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444'], borderWidth: 0 }]
                    },
                    options: { responsive: true, maintainAspectRatio: false, cutout: '80%', plugins: { legend: { display: false } } }
                });
            }
        } catch (e) { console.log("Chart load skipped"); }
    }

    // ========================
    // 5. STARTUP LISTENERS
    // ========================
    document.addEventListener('DOMContentLoaded', () => {
        verifyAdminSession();

        // Close Dropdown when clicking outside
        window.addEventListener('click', function(e) {
            const menu = document.getElementById('profile-dropdown');
            const btn = e.target.closest('button'); // Assuming the trigger is a button
            // If menu is open AND click is NOT on the button AND NOT inside the menu
            if (menu && !menu.classList.contains('hidden') && !btn && !menu.contains(e.target)) {
                menu.classList.add('hidden');
            }
        });

        // Attach Sidebar Logout
        const logoutBtn = document.getElementById("logoutbtn");
        if(logoutBtn) {
            logoutBtn.addEventListener("click", () => {
                if(confirm("Sign out?")) { localStorage.removeItem("token"); window.location.href = "login.html"; }
            });
        }
        
        // Attach Header Logout (Dropdown)
        const headerLogout = document.getElementById("header-logout-btn");
        if(headerLogout) {
            headerLogout.addEventListener("click", () => {
                 localStorage.removeItem("token"); window.location.href = "login.html";
            });
        }

        // Search listeners (Pure DOM filter)
        const busSearch = document.getElementById('business-search');
        if(busSearch) {
            busSearch.addEventListener('keyup', (e) => {
                const term = e.target.value.toLowerCase();
                document.querySelectorAll('#business-table-body tr').forEach(row => {
                    row.style.display = row.innerText.toLowerCase().includes(term) ? '' : 'none';
                });
            });
        }
    });

})();