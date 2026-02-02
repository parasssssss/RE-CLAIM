const API_BASE_URL = "http://localhost:8000";

// get item id from URL
const params = new URLSearchParams(window.location.search);
const itemId = params.get("id");

if (!itemId) {
    alert("Invalid report ID");
    window.location.href = "/frontend/my-reports.html";
}

// DOM elements
const form = document.getElementById("updateForm");
const itemImage = document.getElementById("itemImage");
const imagePlaceholder = document.getElementById("imagePlaceholder");
const itemStatus = document.getElementById("itemStatus");

const itemType = document.getElementById("itemType");
const brand = document.getElementById("brand");
const color = document.getElementById("color");
const description = document.getElementById("description");
const lostAt = document.getElementById("lostAt");

const backBtn = document.getElementById("backBtn");
const lockedOverlay = document.getElementById("lockedOverlay");
const lockedBackBtn = document.getElementById("lockedBackBtn");

function fillForm(item) {
    console.log("Filling form with:", item);

    if (item.image_path) {
        itemImage.src = `${API_BASE_URL}/${item.image_path}`;
        itemImage.classList.remove("hidden");
        // Hide placeholder
        if(imagePlaceholder) imagePlaceholder.classList.add("hidden");
    }

    if (itemStatus) itemStatus.innerText = item.status || "Pending";

    // Style the status badge
    if(item.status && (item.status.toLowerCase().includes('found') || item.status.toLowerCase().includes('matched'))) {
        itemStatus.className = "px-4 py-2 rounded-xl bg-emerald-100 border border-emerald-200 text-xs font-bold text-emerald-800";
    }

    if (itemType) itemType.value = item.item_type || "";
    if (brand) brand.value = item.brand || "";
    if (color) color.value = item.color || "";
    if (description) description.value = item.description || "";
    if (lostAt) lostAt.value = item.lost_location || "";
}

/* =============================
   Fetch existing report details
============================= */
async function fetchReport() {
    const token = localStorage.getItem("token");

    if (!token) {
        alert("Login required");
        window.location.href = "/login.html";
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/items/item/${itemId}`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (res.status === 403) {
            const data = await res.json();
            lockForm(data.detail || "This report is locked.");
            return;
        }

        if (!res.ok) {
            throw new Error("Failed to fetch report");
        }

        const item = await res.json();
        fillForm(item);

    } catch (err) {
        console.error(err);
        alert("Unable to load report");
    }
}

/* =============================
   Submit updated report
============================= */
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");

    const updatedData = {
        item_type: itemType.value,
        brand: brand.value,
        color: color.value,
        description: description.value,
        lost_location: lostAt.value,
    };

    try {
        const res = await fetch(`${API_BASE_URL}/items/item/${itemId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(updatedData)
        });

        if (!res.ok) {
            const errData = await res.json();
            if (res.status === 403) {
                lockForm(errData.detail);
                return;
            }
            throw new Error(errData.detail || "Update failed");
        }

        alert("Report updated successfully!");
        window.location.href = `/frontend/view-report.html?id=${itemId}`;

    } catch (err) {
        console.error(err);
        alert("Error updating report");
    }
});

/* =============================
   UI Actions
============================= */
function goBack() {
    window.location.href = `/frontend/view-report.html?id=${itemId}`;
}

backBtn.addEventListener("click", goBack);
if(lockedBackBtn) lockedBackBtn.addEventListener("click", goBack);

// load data
window.onload = fetchReport;

function lockForm(message) {
    // Show the nice overlay instead of just alerting
    if(lockedOverlay) {
        lockedOverlay.classList.remove("hidden");
        // Update overlay message if needed
        const p = lockedOverlay.querySelector("p");
        if(p) p.innerText = message;
    } else {
        alert(message);
    }
}