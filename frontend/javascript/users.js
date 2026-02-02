// ✅ WRAPPED IN CLOSURE TO PREVENT CONFLICTS
(() => {
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

    // --- STATE VARIABLES ---
    let allUsers = [];              // Stores all data from DB
    let currentFilteredUsers = [];  // Stores data after search
    let currentPage = 1;            
    const rowsPerPage = 5;          

    // =======================
    // 1. FETCH & INITIALIZE
    // =======================
    async function fetchUsers() {
        const tableBody = document.getElementById("userTableBody");
        const skeleton = document.getElementById("skeletonLoader"); // ✅ Select Skeleton
        const token = localStorage.getItem("token");

        if (!token) return window.location.href = "landing.html";

        // ✅ SHOW SKELETON, HIDE TABLE BEFORE FETCH
        if (skeleton) skeleton.classList.remove("hidden");
        if (tableBody) tableBody.classList.add("hidden");

        try {
            // Using your specific endpoint
            const res = await fetch("http://127.0.0.1:8000/customers/customer", {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!res.ok) throw new Error("Failed to fetch users");

            allUsers = await res.json();
            
            // Initialize Pagination State
            currentFilteredUsers = [...allUsers]; 
            currentPage = 1;                      
            
            // Render the first page
            updatePaginationDisplay(); 

        } catch (err) {
            console.error("Error:", err);
            
            // ✅ Hide skeleton on error so we can show the error message
            if (skeleton) skeleton.classList.add("hidden");
            if (tableBody) {
                tableBody.classList.remove("hidden");
                tableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-12 text-center text-red-500 bg-red-50">Error loading user data. Is the backend running?</td></tr>`;
            }
        }
    }

    // =======================
    // 2. PAGINATION LOGIC
    // =======================
    function updatePaginationDisplay() {
        const totalItems = currentFilteredUsers.length;
        const totalPages = Math.ceil(totalItems / rowsPerPage) || 1; 

        // A. Strict Bounds Checking
        if (currentPage < 1) currentPage = 1;
        if (currentPage > totalPages) currentPage = totalPages;

        // B. Slice Data for Current Page
        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = Math.min(startIndex + rowsPerPage, totalItems);
        const itemsToShow = currentFilteredUsers.slice(startIndex, endIndex);

        // C. Update Footer Text
        const startText = document.getElementById("showingStartUsers");
        const endText = document.getElementById("showingEndUsers");
        const totalText = document.getElementById("totalUsersCountDisplay");
        const indicator = document.getElementById("pageIndicatorUsers");

        if (startText) startText.innerText = totalItems > 0 ? startIndex + 1 : 0;
        if (endText) endText.innerText = endIndex;
        if (totalText) totalText.innerText = totalItems;
        if (indicator) indicator.innerText = `Page ${currentPage} of ${totalPages}`;

        // D. Disable Buttons Logic
        const prevBtn = document.getElementById("prevBtnUsers");
        const nextBtn = document.getElementById("nextBtnUsers");

        if (prevBtn) prevBtn.disabled = (currentPage === 1);
        if (nextBtn) nextBtn.disabled = (currentPage === totalPages);

        // E. Render the Table
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
    // 3. RENDER TABLE
    // =======================
    function renderUserTable(data) {
        const tableBody = document.getElementById("userTableBody");
        const skeleton = document.getElementById("skeletonLoader");
        const emptyState = document.getElementById("emptyState");
        
        if(!tableBody) return;

        // ✅ HIDE SKELETON, SHOW TABLE
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
                ? `<button onclick="toggleUserStatus(${user.user_id})" class="text-xs font-bold text-orange-600 hover:text-orange-800 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg transition-colors mr-2">Deactivate</button>`
                : `<button onclick="toggleUserStatus(${user.user_id})" class="text-xs font-bold text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors mr-2">Activate</button>`;

            // ✅ Added 'row-animate' class here
            // We also add a small inline delay based on index for the staggering effect
            const delayStyle = `style="animation-delay: ${index * 0.05}s"`;

            const row = `
            <tr class="row-animate hover:bg-gray-50 transition border-b border-gray-100" ${delayStyle}>
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
                        <button onclick="deleteUser(${user.user_id})" class="text-gray-400 hover:text-red-600 transition p-1.5 hover:bg-red-50 rounded-lg">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </td>
            </tr>
            `;
            tableBody.innerHTML += row;
        });
    }

    // =======================
    // 4. FILTER LOGIC
    // =======================
    function filterUsers() {
        const term = document.getElementById("userSearch").value.toLowerCase();
        const statusType = document.getElementById("statusFilter").value; 

        // Filter the MASTER ARRAY, not the DOM
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
    // 5. GLOBAL ACTIONS (Exposed for HTML onclick)
    // =======================
    window.toggleUserStatus = async function(id) {
        const token = localStorage.getItem("token");
        try {
            const res = await fetch(`http://127.0.0.1:8000/customers/${id}/toggle-status`, {
                method: "PATCH",
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (res.ok) {
                fetchUsers(); // Refresh data to see changes
            } else {
                alert("Failed to update status.");
            }
        } catch (err) {
            console.error(err);
        }
    }

    window.deleteUser = async function(id) {
        if(!confirm("Are you sure? This will delete the user and their reports.")) return;

        const token = localStorage.getItem("token");
        try {
            const res = await fetch(`http://127.0.0.1:8000/customers/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });

            if(res.ok) {
                fetchUsers(); 
            } else {
                alert("Could not delete user.");
            }
        } catch(err) {
            console.error(err);
        }
    }

})();