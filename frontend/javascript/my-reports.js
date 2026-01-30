// ✅ IIFE to prevent conflicts
(() => {
    const API_BASE_URL = "http://localhost:8000";
    const container = document.getElementById("reportsContainer");
    const paginationContainer = document.getElementById("pagination");

    // Pagination state
    let currentPage = 1;
    const pageSize = 6; 
    let totalItems = 0;
    let allItems = [];

    // ===================== INITIAL LOAD =====================
    document.addEventListener("DOMContentLoaded", () => {
        fetchMyReports();
    });

    // ===================== FETCH MY REPORTS =====================
    async function fetchMyReports(page = 1) {
        const token = localStorage.getItem("token");

        if (!token) return window.location.href = "landing.html";

        try {
            const res = await fetch(`${API_BASE_URL}/items/my-items`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!res.ok) throw new Error("Failed to fetch reports");

            const items = await res.json();
            allItems = items;
            totalItems = items.length;
            renderReportsPage(page);

        } catch (err) {
            console.error(err);
            container.innerHTML = `
                <div class="col-span-full py-12 text-center bg-red-50 rounded-2xl border border-red-100">
                    <p class="text-red-600 font-medium">Unable to load your items.</p>
                </div>`;
        }
    }

    // ===================== RENDER PAGE =====================
    function renderReportsPage(page = 1) {
        container.innerHTML = "";
        currentPage = page;

        // Empty State
        if (allItems.length === 0) {
            container.innerHTML = `
                <div class="col-span-full flex flex-col items-center justify-center py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                    <div class="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <i class="fas fa-box-open text-gray-400 text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-bold text-gray-900 font-serif">No Items Reported</h3>
                    <p class="text-gray-500 mt-2 max-w-sm mx-auto">You haven't reported any lost items yet.</p>
                </div>
            `;
            paginationContainer.innerHTML = "";
            return;
        }

        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        const pageItems = allItems.slice(start, end);

        pageItems.forEach(item => {
            const card = document.createElement("div");
            card.className = "item-card group bg-white rounded-[24px] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 flex flex-col";

            // Status Badge Logic
            const isActive = item.is_active; // Assuming boolean or string
            const statusBadge = isActive 
                ? `<span class="bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">Active</span>`
                : `<span class="bg-gray-100 text-gray-600 border border-gray-200 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">Inactive</span>`;

            // Image Handling
            const imgPath = item.image_path 
                ? `${API_BASE_URL}/${item.image_path}` 
                : 'https://via.placeholder.com/400x300?text=No+Image';

            card.innerHTML = `
                <div class="relative h-56 overflow-hidden bg-gray-100 m-3 rounded-[20px]">
                    <img src="${imgPath}" 
                         alt="${item.item_type}" 
                         class="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                        onerror="this.onerror=null; this.src='https://via.placeholder.com/400x300?text=Image+Error">
                    
                    <div class="absolute top-3 right-3 z-10 shadow-sm">
                        ${statusBadge}
                    </div>
                    
                    <div class="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div class="absolute bottom-4 left-4 text-white">
                        <p class="text-xs font-bold text-yellow-400 uppercase tracking-wide mb-0.5">${item.brand || "Unknown Brand"}</p>
                        <h3 class="font-serif text-xl font-bold leading-tight">${item.item_type}</h3>
                    </div>
                </div>

                <div class="px-5 pt-2 pb-5 flex-1 flex flex-col">
                    <div class="flex items-center text-xs text-gray-400 mb-4 font-medium">
                        <i class="far fa-calendar-alt mr-1.5"></i>
                        <span>Reported on ${new Date(item.created_at).toLocaleDateString()}</span>
                    </div>

                    <div class="grid grid-cols-2 gap-4 mb-6">
                        <div class="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                            <p class="text-[10px] uppercase font-bold text-gray-400">Color</p>
                            <p class="text-sm font-semibold text-gray-900 capitalize">${item.color || "N/A"}</p>
                        </div>
                        <div class="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                            <p class="text-[10px] uppercase font-bold text-gray-400">Category</p>
                            <p class="text-sm font-semibold text-gray-900 capitalize">${item.category || "General"}</p>
                        </div>
                    </div>

                    <div class="mt-auto flex items-center gap-2 pt-4 border-t border-gray-50">
                        <button onclick="window.viewReport(${item.item_id})" 
                                class="flex-1 px-4 py-2 bg-gray-900 text-white text-xs font-bold uppercase tracking-wide rounded-lg hover:bg-gray-800 transition shadow-md">
                            View
                        </button>
                        <button onclick="window.updateReport(${item.item_id})" 
                                class="flex-1 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold uppercase tracking-wide rounded-lg hover:bg-gray-50 hover:border-gray-300 transition">
                            Edit
                        </button>
                        <button onclick="window.deleteReport(${item.item_id})" 
                                class="px-3 py-2 bg-white border border-red-100 text-red-500 rounded-lg hover:bg-red-50 hover:border-red-200 transition" title="Delete">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            `;

            container.appendChild(card);
        });

        renderPagination();
    }

    // ===================== PAGINATION UI =====================
    function renderPagination() {
        paginationContainer.innerHTML = "";
        const totalPages = Math.ceil(totalItems / pageSize);

        if (totalPages <= 1) return;

        // Previous
        const prevBtn = document.createElement("button");
        prevBtn.innerHTML = `<i class="fas fa-chevron-left"></i>`;
        prevBtn.className = `w-10 h-10 flex items-center justify-center rounded-lg border ${currentPage === 1 ? "bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:text-gray-900 transition"}`;
        prevBtn.disabled = currentPage === 1;
        prevBtn.onclick = () => { if (currentPage > 1) renderReportsPage(currentPage - 1); };
        paginationContainer.appendChild(prevBtn);

        // Numbers
        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement("button");
            btn.textContent = i;
            btn.className = `w-10 h-10 flex items-center justify-center rounded-lg border text-sm font-bold ${i === currentPage ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 transition"}`;
            btn.onclick = () => renderReportsPage(i);
            paginationContainer.appendChild(btn);
        }

        // Next
        const nextBtn = document.createElement("button");
        nextBtn.innerHTML = `<i class="fas fa-chevron-right"></i>`;
        nextBtn.className = `w-10 h-10 flex items-center justify-center rounded-lg border ${currentPage === totalPages ? "bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:text-gray-900 transition"}`;
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.onclick = () => { if (currentPage < totalPages) renderReportsPage(currentPage + 1); };
        paginationContainer.appendChild(nextBtn);
    }

    // ===================== GLOBAL ACTIONS =====================
    window.viewReport = function(id) {
        window.location.href = `/frontend/view-report.html?id=${id}`;
    }

    window.updateReport = function(id) {
        window.location.href = `/frontend/update-report.html?id=${id}`;
    }

    window.deleteReport = async function(id) {
        if (!confirm("Are you sure you want to permanently delete this report?")) return;

        const token = localStorage.getItem("token");
        try {
            const res = await fetch(`${API_BASE_URL}/items/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (res.ok) {
                // Refresh logic
                const newTotal = totalItems - 1;
                // If we deleted the last item on the current page, go back one page
                if (newTotal > 0 && newTotal <= (currentPage - 1) * pageSize) {
                    fetchMyReports(currentPage - 1);
                } else {
                    fetchMyReports(currentPage);
                }
            } else {
                const data = await res.json();
                alert(data.detail || "Unable to delete this report.");
            }
        } catch (error) {
            console.error(error);
            alert("Network error.");
        }
    }

})();