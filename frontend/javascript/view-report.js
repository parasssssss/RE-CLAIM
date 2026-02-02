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
        // alert("Unable to fetch report"); // Suppressed alert for smoother UX
    }
}

function renderReport(item) {
    // 1. Handle Image
    const img = document.getElementById("itemImage");
    const placeholder = document.getElementById("imagePlaceholder");
    
    if (item.image_path) {
        img.src = `${API_BASE_URL}/${item.image_path}`;
        img.classList.remove("hidden");
        // Hide placeholder if image exists
        if(placeholder) placeholder.classList.add("hidden");
        
        // Add subtle fade-in effect on load
        img.onload = () => img.classList.add('opacity-100');
    }

    // 2. Populate Text Fields
    setText("itemType", item.item_type);
    setText("itemColor", item.color);
    setText("itemBrand", item.brand ?? "Unknown");
    setText("itemLocation", item.lost_location ?? "—");
    setText("itemDescription", item.description ?? "No description provided");
    setText("itemDate", new Date(item.created_at).toLocaleDateString(undefined, { 
        year: 'numeric', month: 'long', day: 'numeric' 
    }));

    // 3. Status Logic (Enhanced Visuals)
    const statusText = item.status ?? "Pending";
    const statusEl = document.getElementById("itemStatus");
    const badgeEl = document.getElementById("itemStatusBadge"); // The parent span
    const dotEl = badgeEl.querySelector("span"); // The blinking dot
    
    if(statusEl) statusEl.innerText = statusText;

    // Apply color themes based on status
    if (badgeEl && dotEl) {
        const s = statusText.toLowerCase();
        
        // Remove default yellow styling first
        dotEl.classList.remove('bg-yellow-500');

        if (s.includes('recovered') || s.includes('found')) {
            // GREEN Theme
            dotEl.classList.add('bg-emerald-500');
            badgeEl.classList.add('border-emerald-500/30', 'bg-emerald-900/40', 'text-emerald-100');
        } else if (s.includes('lost') || s.includes('missing')) {
            // RED Theme
            dotEl.classList.add('bg-red-500');
            badgeEl.classList.add('border-red-500/30', 'bg-red-900/40', 'text-red-100');
        } else {
            // YELLOW/DEFAULT Theme
            dotEl.classList.add('bg-yellow-500');
            badgeEl.classList.add('border-yellow-500/30', 'text-yellow-100');
        }
    }
}

// Helper to safely set text
function setText(id, value) {
    const el = document.getElementById(id);
    if(el) el.innerText = value;
}

// 4. Button Actions
document.getElementById("backBtn").onclick = () => {
    window.location.href = "my-reports.html"; // Fixed path
};

document.getElementById("updateBtn").onclick = () => {
   window.location.href = `update-report.html?id=${itemId}`;
};

// Set the print date automatically
    document.getElementById('printDate').innerText = new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    
// Start
fetchReport();