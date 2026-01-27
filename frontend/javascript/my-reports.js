const API_BASE_URL = "http://localhost:8000";

const container = document.getElementById("reportsContainer");

// Pagination state
let currentPage = 1;
const pageSize = 6; // Number of items per page
let totalItems = 0;
let allItems = [];

// ===================== FETCH MY REPORTS =====================
async function fetchMyReports(page = 1) {
    const token = localStorage.getItem("token"); // JWT stored after login

    if (!token) {
        alert("You must login first.");
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/items/my-items`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!res.ok) {
            throw new Error("Failed to fetch reports");
        }

        const items = await res.json();
        allItems = items;
        totalItems = items.length;
        renderReportsPage(page);

    } catch (err) {
        console.error(err);
        alert("Error fetching reports.");
    }
}

// ===================== RENDER PAGE WITH PAGINATION =====================
function renderReportsPage(page = 1) {
    container.innerHTML = "";
    currentPage = page;

    if (allItems.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12">
                <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <p class="text-gray-600 text-lg font-medium">No reports found</p>
                <p class="text-gray-500 text-sm mt-2">Start by reporting a lost item</p>
            </div>
        `;
        renderPagination();
        return;
    }

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = allItems.slice(start, end);

    pageItems.forEach(item => {
        const card = document.createElement("div");
        card.className = "item-card bg-white rounded-[32px] shadow-md border border-gray-100 px-5 pt-5 pb-6 flex flex-col justify-between"; // removed hover & transition

        card.innerHTML = `
  <!-- Top row: status badge only -->
<div class="mb-4">
  <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium
    ${item.is_active ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-700"}">
    ${item.is_active ? "ACTIVE" : "INACTIVE"}
  </span>
</div>


  <!-- Image section, centered like sneaker card -->
  <div class="relative bg-[#f5f6f8] rounded-[28px] mb-4 overflow-hidden h-52">
  <img
    src="http://127.0.0.1:8000/${item.image_path}"
    alt="Item Image"
    class="w-full h-full object-cover object-center"
  >
</div>

  <!-- Text section -->
  <div class="space-y-1 mb-4">
    <p class="text-xs font-medium text-emerald-500">${item.brand ?? "Brand"}</p>
    <h3 class="font-serif text-lg font-semibold text-gray-900 leading-snug">
      ${item.item_type}
    </h3>
    <p class="text-[11px] text-gray-500 flex items-center">
      <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
      </svg>
      Reported on: ${new Date(item.created_at).toLocaleDateString()}
    </p>
  </div>

  <!-- Bottom row: left info + existing buttons -->
  <div class="flex items-center justify-between mt-1 pt-2 border-t border-gray-100">
    <div class="text-left">
      <p class="text-[11px] text-gray-400">Color</p>
      <p class="text-sm font-medium text-gray-900">${item.color}</p>
    </div>

    <div class="flex gap-2">
      <button onclick="viewReport(${item.item_id})"
              class="btn-view flex-1 px-4 py-2.5 text-sm font-medium bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-all duration-200">
        View
      </button>
      <button onclick="updateReport(${item.item_id})"
              class="btn-view flex-1 px-4 py-2.5 text-sm font-medium border-2 border-gray-900 text-gray-900 rounded-full hover:bg-gray-900 hover:text-white transition-all duration-200">
        Update
      </button>
      <button onclick="deleteReport(${item.item_id})"
              class="btn-view px-4 py-2.5 text-sm font-medium border-2 border-gray-300 text-gray-600 rounded-full hover:border-red-600 hover:text-red-600 hover:bg-red-50 transition-all duration-200">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
        </svg>
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
    let pagination = document.getElementById("pagination");
    if (!pagination) {
        pagination = document.createElement("div");
        pagination.id = "pagination";
        pagination.className = "flex justify-center gap-2 mt-8";
        container.parentNode.appendChild(pagination);
    }

    const totalPages = Math.ceil(totalItems / pageSize);
    pagination.innerHTML = "";
    pagination.style.display = 'flex'; // always show

    // Previous button
    const prevBtn = document.createElement("button");
    prevBtn.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
    `;
    prevBtn.className = `px-3 py-2 rounded-lg ${currentPage === 1 ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white"} transition-all duration-200`;
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener("click", () => {
        if (currentPage > 1) renderReportsPage(currentPage - 1);
    });
    pagination.appendChild(prevBtn);

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement("button");
        btn.textContent = i;
        btn.className = `px-4 py-2 rounded-lg font-medium ${i === currentPage ? "bg-gray-900 text-white" : "bg-white border-2 border-gray-300 text-gray-900 hover:border-gray-900"} transition-all duration-200`;
        btn.addEventListener("click", () => renderReportsPage(i));
        pagination.appendChild(btn);
    }

    // Next button
    const nextBtn = document.createElement("button");
    nextBtn.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
    `;
    nextBtn.className = `px-3 py-2 rounded-lg ${currentPage === totalPages ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white"} transition-all duration-200`;
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener("click", () => {
        if (currentPage < totalPages) renderReportsPage(currentPage + 1);
    });
    pagination.appendChild(nextBtn);
}

// ===================== VIEW, UPDATE, DELETE =====================
function viewReport(id) {
    window.location.href = `/frontend/view-report.html?id=${id}`;
}

function updateReport(id) {
    window.location.href = `/frontend/update-report.html?id=${id}`;
}

async function deleteReport(id) {
    const confirmDelete = confirm("Do you really want to delete this report?");
    if (!confirmDelete) return;

    const token = localStorage.getItem("token");

    try {
        const res = await fetch(`${API_BASE_URL}/items/${id}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (res.ok) {
            alert("Report deleted successfully!");
            fetchMyReports(currentPage); // refresh current page
            return;
        }

        // 🔴 handle backend error message
        const data = await res.json();

        alert(data.detail || "Unable to delete this report.");

    } catch (error) {
        console.error("Delete error:", error);
        alert("Server error while deleting report.");
    }
}


// ===================== INITIAL LOAD =====================
window.onload = () => {
    fetchMyReports();
};
