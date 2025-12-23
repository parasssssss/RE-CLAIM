// Change this to your backend URL
const API_BASE_URL = "http://localhost:8000";

async function fetchMyReports() {
    const token = localStorage.getItem("token"); // JWT stored after login

    if (!token) {
        alert("You must login first.");
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/my-items`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!res.ok) {
            throw new Error("Failed to fetch reports");
        }

        const items = await res.json();
        renderReports(items);

    } catch (err) {
        console.error(err);
        alert("Error fetching reports.");
    }
}

function renderReports(items) {
    const container = document.getElementById("reportsContainer");
    container.innerHTML = ""; 

    if (items.length === 0) {
        container.innerHTML = `
            <p class="text-gray-600 text-lg">No reports found.</p>
        `;
        return;
    }

    items.forEach(item => {
        const card = document.createElement("div");
        card.className = "item-card bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-2xl";

        card.innerHTML = `
            <!-- Image Section -->
            <div class="relative h-48 overflow-hidden bg-gray-100">
                <img src="http://127.0.0.1:8000/${item.image_path}" alt="Item Image" class="w-full h-full object-cover">
                <div class="absolute top-3 right-3">
                    <span class="bg-white/90 backdrop-blur-sm text-gray-900 text-xs font-semibold px-3 py-1 rounded-full border border-gray-200">
                        ${item.status ?? "Pending"}
                    </span>
                </div>
            </div>

            <!-- Content Section -->
            <div class="p-5">
                <h3 class="font-serif text-xl font-semibold text-gray-900 mb-2">${item.item_type}</h3>
                <div class="space-y-1 mb-3">
                    <p class="text-sm text-gray-600">
                        <span class="font-medium">Color:</span> ${item.color}
                    </p>
                    <p class="text-sm text-gray-600">
                        <span class="font-medium">Brand:</span> ${item.brand ?? "Unknown"}
                    </p>
                </div>
                <p class="text-xs text-gray-500 flex items-center">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    Reported on: ${new Date(item.created_at).toLocaleDateString()}
                </p>

                <!-- Action Buttons -->
                <div class="flex gap-2 mt-5 pt-4 border-t border-gray-100">
                    <button onclick="viewReport(${item.item_id})" class="btn-view flex-1 px-4 py-2.5 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800">
                        View
                    </button>
                    <button onclick="updateReport(${item.item_id})" class="btn-view flex-1 px-4 py-2.5 text-sm font-medium border-2 border-gray-900 text-gray-900 rounded-lg hover:bg-gray-900 hover:text-white">
                        Update
                    </button>
                    <button onclick="deleteReport(${item.item_id})" class="btn-view px-4 py-2.5 text-sm font-medium border-2 border-gray-300 text-gray-600 rounded-lg hover:border-red-600 hover:text-red-600 hover:bg-red-50">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        container.appendChild(card);
    });
}


function viewReport(id) {
    // redirect to view page with id
    window.location.href = `/frontend/view-report.html?id=${id}`;
}

function updateReport(id) {
    // redirect to update page with id
    window.location.href = `/frontend/update-report.html?id=${id}`;
}

async function deleteReport(id) {
    const confirmDelete = confirm("Do you really want to delete this report?");
    if (!confirmDelete) return;

    const token = localStorage.getItem("token");

    try {
        const res = await fetch(`${API_BASE_URL}/${id}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (res.ok) {
            alert("Report deleted successfully!");
            fetchMyReports(); // refresh
        } else {
            alert("Failed to delete report.");
        }

    } catch (error) {
        console.error(error);
        alert("Error while deleting.");
    }
}

// call function on page load
window.onload = () => {
    fetchMyReports();
};
