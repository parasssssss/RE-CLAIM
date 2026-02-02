// ✅ WRAP EVERYTHING IN A CLOSURE TO PREVENT CONFLICTS
(() => {
    // --- STATE VARIABLES ---
    let allStaff = [];              
    let currentFilteredStaff = [];  
    let currentPage = 1;            
    const rowsPerPage = 5;          

    // =======================
    // 1. INITIALIZE LISTENERS
    // =======================
    document.addEventListener("DOMContentLoaded", () => {
        fetchStaff();
        
        // Search Listener
        const searchInput = document.getElementById("staffSearch");
        if(searchInput) searchInput.addEventListener("input", filterStaff);

        // ✅ PAGINATION LISTENERS (Attached via JS, not HTML)
        const prevBtn = document.getElementById("prevBtn");
        const nextBtn = document.getElementById("nextBtn");

        if (prevBtn) {
            prevBtn.addEventListener("click", () => {
                changeStaffPage(-1);
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener("click", () => {
                changeStaffPage(1);
            });
        }
    });

    // =======================
    // 2. FETCH & DISPLAY STAFF
    // =======================
    async function fetchStaff() {
        const tableBody = document.getElementById("staffTableBody");
        const token = localStorage.getItem("token");

        if (!token) return window.location.href = "landing.html";

        try {
            const res = await fetch("http://127.0.0.1:8000/staff/my-staff", {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!res.ok) throw new Error("Failed to fetch staff");

            allStaff = await res.json();
            
            // Initialize Pagination
            currentFilteredStaff = [...allStaff]; 
            currentPage = 1;                  
            
            updateStats(allStaff);
            updatePaginationDisplay(); 

        } catch (err) {
            console.error("Error:", err);
            if(tableBody) {
                tableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-12 text-center text-red-500 bg-red-50">Error loading team data. Is the backend running?</td></tr>`;
            }
        }
    }

    // =======================
    // 3. PAGINATION LOGIC
    // =======================
    function updatePaginationDisplay() {
        const totalItems = currentFilteredStaff.length;
        const totalPages = Math.ceil(totalItems / rowsPerPage) || 1; 

        // STRICT BOUNDS CHECKING
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

    // Function called by the listeners above
    function changeStaffPage(direction) {
        const totalPages = Math.ceil(currentFilteredStaff.length / rowsPerPage) || 1;
        const newPage = currentPage + direction;

        if (newPage > 0 && newPage <= totalPages) {
            currentPage = newPage;
            updatePaginationDisplay();
        }
    }

    // =======================
    // 4. RENDER TABLE
    // =======================
    function renderStaffTable(data) {
        const tableBody = document.getElementById("staffTableBody");
        if(!tableBody) return;
        tableBody.innerHTML = "";

        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-gray-400">No staff members found.</td></tr>`;
            return;
        }

        data.forEach(user => {
            const initials = (user.first_name[0] + (user.last_name ? user.last_name[0] : "")).toUpperCase();
            const isActive = user.is_active;
            
            const statusBadge = isActive 
                ? `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">Active</span>`
                : `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">Suspended</span>`;

            const lastLogin = user.last_login ? new Date(user.last_login).toLocaleDateString() : "Never";

            const row = document.createElement("tr");
            row.className = "hover:bg-gray-50 transition-colors border-b border-gray-100 animate-entry";
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
                        ? `<button onclick="toggleStatus(${user.user_id}, false)" class="text-xs font-bold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors">Suspend</button>`
                        : `<button onclick="toggleStatus(${user.user_id}, true)" class="text-xs font-bold text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors">Activate</button>`
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
    // 5. EXPOSE GLOBALS FOR BUTTONS IN TABLE
    // =======================
    
    // Create staff functionality
    window.createStaff = async function() {
        const first = document.getElementById("newStaffFirst").value;
        const last = document.getElementById("newStaffLast").value;
        const email = document.getElementById("newStaffEmail").value;
        const password = "Welcome123"; 

        if (!first || !email) {
            alert("Please fill in Name and Email.");
            return;
        }

        const token = localStorage.getItem("token");

        try {
            const res = await fetch("http://127.0.0.1:8000/staff/create", {
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

            alert("Staff member created!");
            closeAddStaffModal();
            
            document.getElementById("newStaffFirst").value = "";
            document.getElementById("newStaffLast").value = "";
            document.getElementById("newStaffEmail").value = "";
            
            fetchStaff();

        } catch (err) {
            alert("Error: " + err.message);
        }
    }

    window.toggleStatus = async function(userId, newStatus) {
        if(!confirm(`Are you sure you want to ${newStatus ? 'activate' : 'suspend'} this user?`)) return;

        const token = localStorage.getItem("token");
        try {
            const res = await fetch(`http://127.0.0.1:8000/staff/${userId}/status?active=${newStatus}`, {
                method: "PATCH", 
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!res.ok) throw new Error("Failed to update status");
            
            fetchStaff(); 
        } catch (err) {
            console.error(err);
            alert("Error updating status");
        }
    }

    // Modal Logic
    window.openAddStaffModal = function() {
        const modal = document.getElementById("addStaffModal");
        const backdrop = document.getElementById("modalBackdrop");
        const panel = document.getElementById("modalPanel");

        modal.classList.remove("hidden");
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

})();