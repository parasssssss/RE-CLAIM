document.addEventListener("DOMContentLoaded", () => {
    fetchItems();
    
    // Attach live search and filter events
    document.getElementById("searchInput").addEventListener("input", filterItems);
    document.getElementById("statusFilter").addEventListener("change", filterItems);
});

// --- STATE VARIABLES ---
let allItems = [];              // Raw data from API
let currentFilteredItems = [];  // Data after search/filter
let currentPage = 1;            // Current page number
const rowsPerPage = 5;          // Items per page (Change this to 10 if you prefer)

async function fetchItems() {
    const tableBody = document.getElementById("itemsTableBody");
    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "landing.html";
        return;
    }

    try {
        const res = await fetch("http://127.0.0.1:8000/items/my-items", { 
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Failed to load items");

        allItems = await res.json();
        
        // Initialize Filtered List with Everything
        currentFilteredItems = [...allItems]; 
        
        // Render Page 1
        currentPage = 1;
        updatePaginationDisplay();

    } catch (err) {
        console.error("Fetch Error:", err);
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-12 text-center text-red-500 bg-red-50">
                    <i class="fas fa-exclamation-circle text-2xl mb-2"></i>
                    <p>Error loading data. Is the backend running?</p>
                </td>
            </tr>`;
    }
}

// --- PAGINATION LOGIC ---

// 1. Calculate which slice of data to show
function updatePaginationDisplay() {
    const totalItems = currentFilteredItems.length;
    const totalPages = Math.ceil(totalItems / rowsPerPage);

    // Safety check
    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;

    // Calculate Start/End Index
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, totalItems);
    
    // Slice data
    const itemsToShow = currentFilteredItems.slice(startIndex, endIndex);

    // Update Text (Showing 1 to 5 of 20)
    document.getElementById("showingStart").innerText = totalItems > 0 ? startIndex + 1 : 0;
    document.getElementById("showingEnd").innerText = endIndex;
    document.getElementById("totalItems").innerText = totalItems;
    document.getElementById("pageIndicator").innerText = `Page ${currentPage} of ${totalPages || 1}`;

    // Enable/Disable Buttons
    document.getElementById("prevBtn").disabled = currentPage === 1;
    document.getElementById("nextBtn").disabled = currentPage === totalPages || totalPages === 0;

    // Render the Table with the sliced data
    renderItemsTable(itemsToShow);
}

// 2. Button Click Handler
window.changePage = function(direction) {
    currentPage += direction;
    updatePaginationDisplay();
}

function filterItems() {
    const term = document.getElementById("searchInput").value.toLowerCase();
    const status = document.getElementById("statusFilter").value;

    // Filter from the Master List (allItems)
    currentFilteredItems = allItems.filter(item => {
        const searchable = `${item.name} ${item.description} ${item.brand} ${item.color} ${item.item_id}`.toLowerCase();
        
        const matchesTerm = searchable.includes(term);
        const matchesStatus = status === "ALL" || item.status === status;
        
        return matchesTerm && matchesStatus;
    });

    // IMPORTANT: Reset to Page 1 when searching/filtering
    currentPage = 1;
    updatePaginationDisplay();
}

// --- RENDER LOGIC (Same as before, but receives sliced data) ---

function renderItemsTable(data) {
    const tableBody = document.getElementById("itemsTableBody");
    tableBody.innerHTML = ""; 

    if (data.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-12 text-center">
                    <div class="flex flex-col items-center justify-center text-gray-400">
                        <div class="bg-gray-50 p-4 rounded-full mb-3 border border-gray-100">
                            <i class="fas fa-search text-3xl text-gray-300"></i>
                        </div>
                        <p class="text-gray-900 font-medium">No results found</p>
                    </div>
                </td>
            </tr>`;
        return;
    }

    data.forEach(item => {
        let displayName = item.name || `${item.color || ''} ${item.brand || ''} ${item.item_type || ''}`.trim() || "Unnamed Item";
        const displayCategory = item.category || item.item_type || "General";
        const displayLocation = item.lost_location || item.location || item.location_found || "Unknown";
        const displayDate = new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        let statusStyle = "bg-gray-100 text-gray-800"; 
        if (item.status === "FOUND") statusStyle = "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20";
        if (item.status === "LOST") statusStyle = "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/10";
        if (item.status === "RECLAIMED" || item.status === "MATCHED") statusStyle = "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-700/10";

        let iconClass = "fa-box";
        const catLower = displayCategory.toLowerCase();
        if(catLower.includes("phone") || catLower.includes("electronics")) iconClass = "fa-mobile-alt";
        else if(catLower.includes("wallet") || catLower.includes("card")) iconClass = "fa-wallet";
        else if(catLower.includes("bag") || catLower.includes("luggage")) iconClass = "fa-suitcase";
        else if(catLower.includes("keys")) iconClass = "fa-key";

        const itemJson = JSON.stringify(item).replace(/'/g, "&#39;");

        const row = `
            <tr class="group table-row-hover transition-colors border-b border-gray-50 last:border-b-0 cursor-default animate-entry">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="flex-shrink-0 h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-white group-hover:text-yellow-500 group-hover:shadow-md transition-all border border-gray-200">
                            <i class="fas ${iconClass}"></i>
                        </div>
                        <div class="ml-4">
                            <div class="text-sm font-bold text-gray-900">${displayName}</div>
                            <div class="text-xs text-gray-400">Ref: #${item.item_id}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                    <div class="text-xs text-gray-600 font-medium bg-gray-100 inline-block px-2 py-0.5 rounded border border-gray-200 uppercase tracking-wide">
                        ${displayCategory}
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${displayLocation}</div>
                    <div class="text-xs text-gray-400">${displayDate}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-center">
                    <span class="inline-flex items-center rounded-md px-2 py-1 text-xs font-bold uppercase tracking-wider ${statusStyle}">
                        ${item.status}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onclick='openItemModal(${itemJson})' class="text-gray-400 hover:text-yellow-600 transition-transform hover:scale-110 p-2">
                        <i class="fas fa-eye text-lg"></i>
                    </button>
                </td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}

// === KEEP MODAL LOGIC SAME AS BEFORE ===
window.openItemModal = function(item) {
    const modal = document.getElementById('itemModal');
    const backdrop = document.getElementById('modalBackdrop');
    const panel = document.getElementById('modalPanel');
    
    document.getElementById("modalTitle").textContent = item.name || "Unnamed Item";
    document.getElementById("modalCategory").textContent = item.item_type || "General";
    document.getElementById("modalDate").textContent = new Date(item.created_at).toLocaleString();
    document.getElementById("modalLocation").textContent = item.lost_location || item.location || "Unknown Area";
    document.getElementById("modalDescription").textContent = item.description || "No description provided.";
    
    const imgEl = document.getElementById("modalImage");
    const noImgEl = document.getElementById("modalNoImage");
    
    if (item.image_path) {
        imgEl.src = `http://127.0.0.1:8000/${item.image_path}`;
        imgEl.classList.remove("hidden");
        noImgEl.classList.add("hidden");
        noImgEl.classList.remove("flex");
    } else {
        imgEl.classList.add("hidden");
        noImgEl.classList.remove("hidden");
        noImgEl.classList.add("flex");
    }

    const badge = document.getElementById("modalStatusBadge");
    badge.textContent = item.status;
    badge.className = "px-3 py-1 rounded-full text-xs font-bold border";
    
    if (item.status === "FOUND") badge.classList.add("bg-green-100", "text-green-700", "border-green-200");
    else if (item.status === "LOST") badge.classList.add("bg-red-100", "text-red-700", "border-red-200");
    else badge.classList.add("bg-blue-100", "text-blue-700", "border-blue-200");

    modal.classList.remove('hidden');
    setTimeout(() => {
        backdrop.classList.remove('opacity-0');
        panel.classList.remove('scale-95', 'opacity-0');
        panel.classList.add('scale-100', 'opacity-100');
    }, 10);
}

window.closeItemModal = function() {
    const modal = document.getElementById('itemModal');
    const backdrop = document.getElementById('modalBackdrop');
    const panel = document.getElementById('modalPanel');

    backdrop.classList.add('opacity-0');
    panel.classList.remove('scale-100', 'opacity-100');
    panel.classList.add('scale-95', 'opacity-0');

    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}