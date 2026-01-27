const API_BASE_URL = "http://localhost:8000";

// get item_id from URL
const params = new URLSearchParams(window.location.search);
const itemId = params.get("id");

if (!itemId) {
    alert("Invalid report ID");
    window.location.href = "/my-reports.html";
}

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

        if (!res.ok) {
            throw new Error("Failed to load report");
        }

        const item = await res.json();
        renderReport(item);

    } catch (err) {
        console.error(err);
        alert("Unable to fetch report");
    }
}

function renderReport(item) {
    // image
    const img = document.getElementById("itemImage");
    img.src = `${API_BASE_URL}/${item.image_path}`;
    img.classList.remove("hidden");

    // text fields
    document.getElementById("itemType").innerText = item.item_type;
    document.getElementById("itemColor").innerText = item.color;
    document.getElementById("itemBrand").innerText = item.brand ?? "Unknown";
    document.getElementById("itemStatus").innerText = item.status ?? "Pending";
    document.getElementById("itemLocation").innerText = item.lost_location ?? "—";
    document.getElementById("itemDescription").innerText =
        item.description ?? "No description provided";

    document.getElementById("itemDate").innerText =
        new Date(item.created_at).toLocaleDateString();
}

// buttons
document.getElementById("backBtn").onclick = () => {
    window.location.href = "/frontend/my-reports.html";
};

document.getElementById("updateBtn").onclick = () => {
    window.location.href = `/frontend/update-report.html?id=${itemId}`;
};

// load on page start
window.onload = fetchReport;
