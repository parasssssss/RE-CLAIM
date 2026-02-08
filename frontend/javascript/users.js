// ✅ WRAP EVERYTHING IN A CLOSURE TO PREVENT CONFLICTS
(() => {
    /* ================= 1. PRIVATE UTILITIES (Scoped to this file) ================= */
    
    // Style Injector (Checks if styles exist to avoid duplication)
    const addGlobalStyles = () => {
        if (!document.getElementById('app-dynamic-styles')) {
            const style = document.createElement('style');
            style.id = 'app-dynamic-styles';
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
            const borderClass = isError ? 'border-red-500' : 'border-green-500';
            const iconColor = isError ? 'text-red-600 bg-red-100' : 'text-green-600 bg-green-100';
            const title = isError ? 'Action Failed' : 'Success';
            
            const iconSvg = isError 
                ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>'
                : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>';

            toast.className = `pointer-events-auto toast-enter flex items-start gap-4 p-4 min-w-[320px] max-w-sm bg-white rounded-xl shadow-lg border-l-4 ${borderClass}`;
            
            toast.innerHTML = `
                <div class="flex-shrink-0"><div class="${iconColor} rounded-full p-2"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">${iconSvg}</svg></div></div>
                <div class="flex-1 pt-0.5">
                    <h3 class="font-serif font-bold text-slate-800 text-sm leading-5">${title}</h3>
                    <p class="mt-1 text-sm text-slate-500 leading-relaxed">${message}</p>
                </div>
                <button onclick="this.parentElement.remove()" class="ml-4 text-slate-400 hover:text-slate-600"><svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg></button>
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

    // Config
    const API_BASE_URL = "http://127.0.0.1:8000";

    // State Variables
    let allUsers = [];              
    let currentFilteredUsers = [];  
    let currentPage = 1;            
    const rowsPerPage = 5;          

    // =======================
    // INITIALIZE LISTENERS
    // =======================
    document.addEventListener("DOMContentLoaded", () => {
        fetchUsers();

        // 1. Attach Search & Filter Listeners
        const searchInput = document.getElementById("userSearch");
        const statusFilter = document.getElementById("statusFilter");

        if (searchInput) searchInput.addEventListener("input", filterUsers);
        if (statusFilter) statusFilter.addEventListener("change", filterUsers);

        // 2. Attach Pagination Button Listeners
        const prevBtn = document.getElementById("prevBtnUsers");
        const nextBtn = document.getElementById("nextBtnUsers");
        if (prevBtn) prevBtn.onclick = () => changeUserPage(-1);
        if (nextBtn) nextBtn.onclick = () => changeUserPage(1);
    });

    // =======================
    // FETCH & INITIALIZE
    // =======================
    async function fetchUsers() {
        const tableBody = document.getElementById("userTableBody");
        const skeleton = document.getElementById("skeletonLoader");
        const token = localStorage.getItem("token");
        if (token) {
        loadBusinessCode(token);
    }

        if (!token) return window.location.href = "landing.html";

        // Show Skeleton
        if (skeleton) skeleton.classList.remove("hidden");
        if (tableBody) tableBody.classList.add("hidden");

        try {
            const res = await fetch(`${API_BASE_URL}/customers/customer`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!res.ok) throw new Error("Failed to fetch users");

            allUsers = await res.json();
            
            // Initialize Pagination State
            currentFilteredUsers = [...allUsers]; 
            currentPage = 1;                  
            
            updatePaginationDisplay(); 

        } catch (err) {
            console.error("Error:", err);
            ToastManager.show("Error loading user data.", "error");
            
            // Hide skeleton on error
            if (skeleton) skeleton.classList.add("hidden");
            if (tableBody) {
                tableBody.classList.remove("hidden");
                tableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-12 text-center text-red-500 bg-red-50">Error loading user data. Is the backend running?</td></tr>`;
            }
        }
    }

    // =======================
    // PAGINATION LOGIC
    // =======================
    function updatePaginationDisplay() {
        const totalItems = currentFilteredUsers.length;
        const totalPages = Math.ceil(totalItems / rowsPerPage) || 1; 

        // Strict Bounds Checking
        if (currentPage < 1) currentPage = 1;
        if (currentPage > totalPages) currentPage = totalPages;

        // Slice Data
        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = Math.min(startIndex + rowsPerPage, totalItems);
        const itemsToShow = currentFilteredUsers.slice(startIndex, endIndex);

        // Update Footer Text
        const startText = document.getElementById("showingStartUsers");
        const endText = document.getElementById("showingEndUsers");
        const totalText = document.getElementById("totalUsersCountDisplay");
        const indicator = document.getElementById("pageIndicatorUsers");

        if (startText) startText.innerText = totalItems > 0 ? startIndex + 1 : 0;
        if (endText) endText.innerText = endIndex;
        if (totalText) totalText.innerText = totalItems;
        if (indicator) indicator.innerText = `Page ${currentPage} of ${totalPages}`;

        // Disable Buttons
        const prevBtn = document.getElementById("prevBtnUsers");
        const nextBtn = document.getElementById("nextBtnUsers");

        if (prevBtn) prevBtn.disabled = (currentPage === 1);
        if (nextBtn) nextBtn.disabled = (currentPage === totalPages || totalPages === 0);

        renderUserTable(itemsToShow);
    }

    function changeUserPage(direction) {
        const totalPages = Math.ceil(currentFilteredUsers.length / rowsPerPage) || 1;
        const newPage = currentPage + direction;

        if (newPage > 0 && newPage <= totalPages) {
            currentPage = newPage;
            updatePaginationDisplay();
        }
    }

    // =======================
    // RENDER TABLE
    // =======================
    function renderUserTable(data) {
        const tableBody = document.getElementById("userTableBody");
        const skeleton = document.getElementById("skeletonLoader");
        const emptyState = document.getElementById("emptyState");
        
        if(!tableBody) return;

        // Hide Skeleton, Show Table
        if (skeleton) skeleton.classList.add("hidden");
        if (tableBody) tableBody.classList.remove("hidden");

        tableBody.innerHTML = "";

        // Handle Empty State
        if (data.length === 0) {
            if(emptyState) emptyState.classList.remove("hidden");
            return;
        } else {
            if(emptyState) emptyState.classList.add("hidden");
        }

        data.forEach((user, index) => {
            // Initials
            const initials = user.first_name ? user.first_name.charAt(0).toUpperCase() : "?";
            
            // Badge Logic
            const reportsBadge = user.items_reported > 0 
                ? `<span class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">${user.items_reported} Reports</span>`
                : `<span class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">No Reports</span>`;

            // Status Logic (Case insensitive check)
            const isActive = (user.status || "").toLowerCase() === "active";
            const statusBadge = isActive 
                ? `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">Active</span>`
                : `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">Inactive</span>`;

            // Toggle Button
            const toggleBtn = isActive
                ? `<button onclick="window.toggleUserStatus(${user.user_id})" class="text-xs font-bold text-orange-600 hover:text-orange-800 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg transition-colors mr-2">Deactivate</button>`
                : `<button onclick="window.toggleUserStatus(${user.user_id})" class="text-xs font-bold text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors mr-2">Activate</button>`;

            // Animation Delay style for Staggered Effect
            const delayStyle = `style="animation-delay: ${index * 50}ms"`;

            const row = document.createElement("tr");
            row.className = "animate-entry hover:bg-gray-50 transition border-b border-gray-100";
            row.style.animationDelay = `${index * 50}ms`;

            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="h-10 w-10 flex-shrink-0">
                            <div class="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-sm">
                                ${initials}
                            </div>
                        </div>
                        <div class="ml-4">
                            <div class="text-sm font-bold text-gray-900">${user.first_name}</div>
                            <div class="text-sm text-gray-500">${user.email}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900 font-medium">Customer</div>
                    ${reportsBadge}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    ${statusBadge}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div class="flex justify-end items-center">
                        ${toggleBtn}
                        <button onclick="window.deleteUser(${user.user_id})" class="text-gray-400 hover:text-red-600 transition p-1.5 hover:bg-red-50 rounded-lg">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    // =======================
    // FILTER LOGIC
    // =======================
    function filterUsers() {
        const term = document.getElementById("userSearch").value.toLowerCase();
        const statusType = document.getElementById("statusFilter").value; 

        // Filter the MASTER ARRAY
        currentFilteredUsers = allUsers.filter(user => {
            const name = (user.first_name || "").toLowerCase();
            const email = (user.email || "").toLowerCase();
            const status = (user.status || "").toLowerCase();

            const matchesSearch = name.includes(term) || email.includes(term);
            
            let matchesStatus = true;
            if (statusType === "active") matchesStatus = status === "active";
            if (statusType === "inactive") matchesStatus = status !== "active"; 

            return matchesSearch && matchesStatus;
        });

        // Reset to page 1 to show results
        currentPage = 1;
        updatePaginationDisplay();
    }

    // =======================
    // GLOBAL ACTIONS (Exposed for HTML onclick)
    // =======================
    window.toggleUserStatus = async function(id) {
        const token = localStorage.getItem("token");
        try {
            const res = await fetch(`${API_BASE_URL}/customers/${id}/toggle-status`, {
                method: "PATCH",
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (res.ok) {
                ToastManager.show("User status updated.");
                fetchUsers(); // Refresh data to see changes
            } else {
                ToastManager.show("Failed to update status.", "error");
            }
        } catch (err) {
            console.error(err);
            ToastManager.show("Network error.", "error");
        }
    }

    window.deleteUser = async function(id) {
        if(!confirm("Are you sure? This will delete the user and their reports.")) return;

        const token = localStorage.getItem("token");
        try {
            const res = await fetch(`${API_BASE_URL}/customers/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });

            if(res.ok) {
                ToastManager.show("User deleted successfully.");
                fetchUsers(); 
            } else {
                ToastManager.show("Could not delete user.", "error");
            }
        } catch(err) {
            console.error(err);
            ToastManager.show("Network error.", "error");
        }
    }
// ===================== FETCH BUSINESS CODE =====================
    async function loadBusinessCode(token) {
        try {
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
                    // Show the container if it was hidden
                    if(containerEl) containerEl.classList.remove("hidden");
                    // Ensure the flex layout works if previously hidden
                    if(containerEl) containerEl.classList.add("flex"); 
                }
            } else {
                console.warn(`Business Code API returned ${res.status}`);
            }
        } catch (err) {
            console.error("❌ Network error loading Business Code:", err);
        }
    }
})();