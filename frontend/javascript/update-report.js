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
const itemStatus = document.getElementById("itemStatus");

const itemType = document.getElementById("itemType");
const brand = document.getElementById("brand");
const color = document.getElementById("color");
const description = document.getElementById("description");
const lostAt = document.getElementById("lostAt");
const date = document.getElementById("date");

const backBtn = document.getElementById("backBtn");

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
        const res = await fetch(`${API_BASE_URL}/item/${itemId}`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

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
   Fill form with data
============================= */
function fillForm(item) {
    // image
    if (item.image_path) {
        itemImage.src = `${API_BASE_URL}/${item.image_path}`;
        itemImage.classList.remove("hidden");
    }

    itemStatus.innerText = item.status ?? "Pending";

    itemType.value = item.item_type ?? "";
    brand.value = item.brand ?? "";
    color.value = item.color ?? "";
    description.value = item.description ?? "";
    lostAt.value = item.lost_location ?? "";

    if (item.lost_date) {
        date.value = item.lost_date.split("T")[0];
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
        const res = await fetch(`${API_BASE_URL}/item/${itemId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(updatedData)
        });

        if (!res.ok) {
            throw new Error("Update failed");
        }

        alert("Report updated successfully!");
        window.location.href = `/frontend/view-report.html?id=${itemId}`;

    } catch (err) {
        console.error(err);
        alert("Error updating report");
    }
});

/* =============================
   Cancel button
============================= */
backBtn.addEventListener("click", () => {
    window.location.href = `/frontend/view-report.html?id=${itemId}`;
});

// load data
window.onload = fetchReport;
