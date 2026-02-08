// ✅ WRAP EVERYTHING (Including Utilities) IN THE CLOSURE
(() => {
    /* ================= 1. PRIVATE UTILITIES (Scoped to this file) ================= */
    
    // Style Injector
    const addGlobalStyles = () => {
        // Unique ID for staff styles to prevent duplicates even within this logic
        if (!document.getElementById('staff-dynamic-styles')) {
            const style = document.createElement('style');
            style.id = 'staff-dynamic-styles';
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

                /* Loading Spinner */
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .animate-spin { animation: spin 1s linear infinite; }
                
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

    // Loading Manager
    const LoadingManager = {
        show(button, text = 'Processing...') {
            if (!button) return;
            button.dataset.originalHTML = button.innerHTML;
            button.disabled = true;
            button.innerHTML = `
                <span class="flex items-center justify-center">
                    <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    ${text}
                </span>
            `;
            button.classList.add('opacity-75', 'cursor-not-allowed');
        },
        hide(button) {
            if (!button) return;
            button.innerHTML = button.dataset.originalHTML || 'Submit';
            button.disabled = false;
            button.classList.remove('opacity-75', 'cursor-not-allowed');
        }
    };

    // Initialize Styles immediately
    addGlobalStyles();

    /* ================= 2. MAIN LOGIC ================= */
    
    // Configuration
    const API_BASE_URL = "http://127.0.0.1:8000";
    
    // State Variables
    let allStaff = [];              
    let currentFilteredStaff = [];  
    let currentPage = 1;            
    const rowsPerPage = 5;          

    // =======================
    // INITIALIZE LISTENERS
    // =======================
    document.addEventListener("DOMContentLoaded", () => {
        const token = localStorage.getItem("token");
        if (!token) return window.location.href = "login.html";
        if (token) {
        loadBusinessCode(token);
    }

        fetchStaff();
        
        // Search Listener
        const searchInput = document.getElementById("staffSearch");
        if(searchInput) searchInput.addEventListener("input", filterStaff);

        // Pagination Listeners
        const prevBtn = document.getElementById("prevBtn");
        const nextBtn = document.getElementById("nextBtn");
        if (prevBtn) prevBtn.addEventListener("click", () => changeStaffPage(-1));
        if (nextBtn) nextBtn.addEventListener("click", () => changeStaffPage(1));

        // Create Staff Listener
        const confirmCreateBtn = document.querySelector("#addStaffModal button[type='submit']") || 
                                 document.getElementById("confirmCreateBtn");
        
        if (confirmCreateBtn) {
            confirmCreateBtn.addEventListener("click", handleCreateStaff);
        }
    });

    // =======================
    // FETCH & DISPLAY STAFF
    // =======================
    async function fetchStaff() {
        const tableBody = document.getElementById("staffTableBody");
        const token = localStorage.getItem("token");

        try {
            const res = await fetch(`${API_BASE_URL}/staff/my-staff`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!res.ok) throw new Error("Failed to fetch staff list");

            allStaff = await res.json();
            
            // Initialize Pagination
            currentFilteredStaff = [...allStaff]; 
            currentPage = 1;                  
            
            updateStats(allStaff);
            updatePaginationDisplay(); 

        } catch (err) {
            console.error("Error:", err);
            ToastManager.show("Error loading team data. Is the backend running?", "error");
            if(tableBody) {
                tableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-12 text-center text-red-500 bg-red-50">Error loading team data.</td></tr>`;
            }
        }
    }

    // =======================
    // PAGINATION LOGIC
    // =======================
    function updatePaginationDisplay() {
        const totalItems = currentFilteredStaff.length;
        const totalPages = Math.ceil(totalItems / rowsPerPage) || 1; 

        // Strict Bounds
        if (currentPage < 1) currentPage = 1;
        if (currentPage > totalPages) currentPage = totalPages;

        // Slice Data
        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = Math.min(startIndex + rowsPerPage, totalItems);
        const itemsToShow = currentFilteredStaff.slice(startIndex, endIndex);

        // Update Text
        const startText = document.getElementById("showingStart");
        const endText = document.getElementById("showingEnd");
        const totalText = document.getElementById("totalItems");
        const indicator = document.getElementById("pageIndicator");

        if (startText) startText.innerText = totalItems > 0 ? startIndex + 1 : 0;
        if (endText) endText.innerText = endIndex;
        if (totalText) totalText.innerText = totalItems;
        if (indicator) indicator.innerText = `Page ${currentPage} of ${totalPages}`;

        // Disable Buttons
        const prevBtn = document.getElementById("prevBtn");
        const nextBtn = document.getElementById("nextBtn");

        if (prevBtn) prevBtn.disabled = (currentPage === 1);
        if (nextBtn) nextBtn.disabled = (currentPage === totalPages || totalPages === 0);

        renderStaffTable(itemsToShow);
    }

    function changeStaffPage(direction) {
        const totalPages = Math.ceil(currentFilteredStaff.length / rowsPerPage) || 1;
        const newPage = currentPage + direction;

        if (newPage > 0 && newPage <= totalPages) {
            currentPage = newPage;
            updatePaginationDisplay();
        }
    }

    // =======================
    // RENDER TABLE
    // =======================
    function renderStaffTable(data) {
        const tableBody = document.getElementById("staffTableBody");
        if(!tableBody) return;
        tableBody.innerHTML = "";

        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-gray-400">No staff members found.</td></tr>`;
            return;
        }

        data.forEach((user, index) => {
            const initials = (user.first_name[0] + (user.last_name ? user.last_name[0] : "")).toUpperCase();
            const isActive = user.is_active;
            
            const statusBadge = isActive 
                ? `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">Active</span>`
                : `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">Suspended</span>`;

            const lastLogin = user.last_login ? new Date(user.last_login).toLocaleDateString() : "Never";

            const row = document.createElement("tr");
            row.className = "hover:bg-gray-50 transition-colors border-b border-gray-100 animate-entry";
            row.style.animationDelay = `${index * 50}ms`; // Stagger effect
            
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="h-10 w-10 flex-shrink-0">
                            <div class="h-10 w-10 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-yellow-500 font-bold border border-gray-700 shadow-sm">
                                ${initials}
                            </div>
                        </div>
                        <div class="ml-4">
                            <div class="text-sm font-bold text-gray-900">${user.first_name} ${user.last_name || ""}</div>
                            <div class="text-sm text-gray-500">${user.email}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900 font-medium">Staff</div>
                    <div class="text-xs text-gray-500">Business Member</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">${statusBadge}</td>
                <td class="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                    <div class="text-sm text-gray-500">${lastLogin}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    ${isActive 
                        ? `<button onclick="window.toggleStatus(${user.user_id}, false)" class="text-xs font-bold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors">Suspend</button>`
                        : `<button onclick="window.toggleStatus(${user.user_id}, true)" class="text-xs font-bold text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors">Activate</button>`
                    }
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    function filterStaff() {
        const term = document.getElementById("staffSearch").value.toLowerCase();
        currentFilteredStaff = allStaff.filter(user => 
            user.first_name.toLowerCase().includes(term) ||
            (user.last_name && user.last_name.toLowerCase().includes(term)) ||
            user.email.toLowerCase().includes(term)
        );
        currentPage = 1;
        updatePaginationDisplay();
    }

    function updateStats(data) {
        const totalEl = document.getElementById("totalStaffCount");
        const activeEl = document.getElementById("activeStaffCount");
        if(totalEl) totalEl.innerText = data.length;
        if(activeEl) activeEl.innerText = data.filter(u => u.is_active).length;
    }

    // =======================
    // STAFF ACTIONS
    // =======================
    
    // Create Staff Logic
    async function handleCreateStaff(e) {
        if(e) e.preventDefault();
        
        const firstInput = document.getElementById("newStaffFirst");
        const lastInput = document.getElementById("newStaffLast");
        const emailInput = document.getElementById("newStaffEmail");
        const btn = e.target;

        const first = firstInput.value;
        const last = lastInput.value;
        const email = emailInput.value;
        const password = "Welcome123"; 

        if (!first || !email) {
            ToastManager.show("Please fill in Name and Email.", "error");
            return;
        }

        LoadingManager.show(btn, "Creating...");

        const token = localStorage.getItem("token");

        try {
            const res = await fetch(`${API_BASE_URL}/staff/create`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    first_name: first, 
                    last_name: last, 
                    email: email, 
                    password: password 
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || "Failed to create account");
            }

            ToastManager.show("Staff member created successfully!");
            window.closeAddStaffModal();
            
            // Reset Inputs
            firstInput.value = "";
            lastInput.value = "";
            emailInput.value = "";
            
            fetchStaff();

        } catch (err) {
            ToastManager.show(err.message, "error");
        } finally {
            LoadingManager.hide(btn);
        }
    }

    // =======================
    // 3. EXPOSE GLOBAL FUNCTIONS (For onclick handlers)
    // =======================

    window.toggleStatus = async function(userId, newStatus) {
        const action = newStatus ? 'activate' : 'suspend';
        if(!confirm(`Are you sure you want to ${action} this user?`)) return;

        const token = localStorage.getItem("token");
        try {
            const res = await fetch(`${API_BASE_URL}/staff/${userId}/status?active=${newStatus}`, {
                method: "PATCH", 
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!res.ok) throw new Error("Failed to update status");
            
            ToastManager.show(`User ${action}d successfully.`);
            fetchStaff(); 
        } catch (err) {
            console.error(err);
            ToastManager.show(`Error ${action}ing user.`, "error");
        }
    }

    window.openAddStaffModal = function() {
        const modal = document.getElementById("addStaffModal");
        const backdrop = document.getElementById("modalBackdrop");
        const panel = document.getElementById("modalPanel");

        modal.classList.remove("hidden");
        // Small delay to allow display:block to apply before transition starts
        if (backdrop && panel) {
            setTimeout(() => {
                backdrop.classList.remove("opacity-0");
                panel.classList.remove("scale-95", "opacity-0");
                panel.classList.add("scale-100", "opacity-100");
            }, 10);
        }
    }

    window.closeAddStaffModal = function() {
        const modal = document.getElementById("addStaffModal");
        const backdrop = document.getElementById("modalBackdrop");
        const panel = document.getElementById("modalPanel");

        if (backdrop && panel) {
            backdrop.classList.add("opacity-0");
            panel.classList.remove("scale-100", "opacity-100");
            panel.classList.add("scale-95", "opacity-0");
            setTimeout(() => {
                modal.classList.add("hidden");
            }, 300);
        } else {
            modal.classList.add("hidden");
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