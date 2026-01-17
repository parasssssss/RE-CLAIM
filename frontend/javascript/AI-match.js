const container = document.getElementById("reportsContainer");
const overlay = document.getElementById("matchOverlay");
const overlayContent = document.getElementById("overlayContent");

// Pagination state
let currentPage = 1;
const pageSize = 6; // Number of matches per page
let totalMatches = 0;
let matchesData = [];

// ===================== FETCH MATCHES =====================
async function fetchMatches(page = 1) {
  try {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("User not authenticated");

    const res = await fetch("http://127.0.0.1:8000/matches", {
      headers: { "Authorization": "Bearer " + token }
    });

    if (!res.ok) throw new Error("Failed to fetch matches");

    const data = await res.json();
    matchesData = data;
    totalMatches = data.length;
    renderMatchesPage(page);
  } catch (err) {
    console.error(err);
    container.innerHTML = `<p class="text-red-500 text-lg">Error loading matches</p>`;
  }
}

let currentUser = null;

// ===================== FETCH CURRENT USER =====================
async function fetchCurrentUser() {
  try {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("Not authenticated");

    const res = await fetch("http://127.0.0.1:8000/me", {
      headers: { Authorization: "Bearer " + token }
    });

    if (!res.ok) throw new Error("Failed to fetch user");

    currentUser = await res.json();
    console.log("Logged in user:", currentUser);
  } catch (err) {
    console.error(err);
  }
}


// ===================== RENDER SUMMARY CARD =====================
function renderSummaryCard(match) {
  const status = match.status.toUpperCase();

  const statusStyles = {
    APPROVED: "bg-emerald-100 text-emerald-700",
    PENDING: "bg-yellow-100 text-yellow-700",
    REJECTED: "bg-red-100 text-red-700"
  };

  return `
    <div class="relative">
      
      <!-- STATUS BADGE (TOP RIGHT) -->
      <div class="absolute top-4 right-4 z-10">
        <span class="px-3 py-1 rounded-full text-xs font-semibold ${statusStyles[status] || "bg-gray-100 text-gray-700"}">
          ${status}
        </span>
      </div>

      <!-- Top row: match % -->
      <div class="mb-4 px-5 pt-5">
        <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium
          ${status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' :
            status === 'PENDING' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-700'}">
          ${Math.round(match.similarity_score * 100)}% Match
        </span>
      </div>

      <!-- Image -->
      <div class="relative bg-[#f5f6f8] rounded-[28px] mb-4 overflow-hidden h-52 mx-5">
        <img src="http://127.0.0.1:8000/${match.found.image_path}" 
             class="w-full h-full object-cover object-center"
             alt="Found Item">
      </div>

      <!-- Text -->
      <div class="space-y-1 mb-4 px-5">
        <p class="text-xs font-medium text-emerald-500">${match.lost.brand ?? "Brand"}</p>
        <h3 class="font-serif text-lg font-semibold text-gray-900 leading-snug">
          ${match.lost.item_type ?? "Item Match"}
        </h3>
        <p class="text-[11px] text-gray-500">
          Matched on: ${new Date(match.found.created_at).toLocaleDateString()}
        </p>
      </div>

      <!-- Bottom -->
      <div class="flex items-center justify-between mt-1 pt-2 border-t border-gray-100 px-5 pb-6">
        <div>
          <p class="text-[11px] text-gray-400">Color</p>
          <p class="text-sm font-medium text-gray-900">${match.lost.color}</p>
        </div>
        <button onclick="openMatch(${JSON.stringify(match).replace(/"/g,'&quot;')})"
          class="btn-view px-6 py-2.5 text-sm font-medium border-2 border-gray-900 text-gray-900 rounded-full hover:bg-gray-900 hover:text-white transition">
          View Details
        </button>
      </div>

    </div>
  `;
}




// ===================== RENDER COMPARISON CARD =====================
function renderComparisonCard(match) {
  return `
    <div class="p-8 bg-white">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h3 class="font-serif text-2xl font-bold text-gray-900">Match Details</h3>
          <p class="text-gray-600 mt-1">
            Similarity Score:
            <span class="font-semibold text-gray-900">
              ${Math.round(match.similarity_score * 100)}%
            </span>
          </p>
        </div>
        <div class="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
          <span class="text-2xl font-bold text-green-600">
            ${Math.round(match.similarity_score * 100)}%
          </span>
        </div>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <!-- Found Item -->
        <div class="bg-gray-50 border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all">
          <div class="flex items-center mb-4">
            <div class="h-10 w-10 rounded-full bg-green-600 flex items-center justify-center mr-3">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <h4 class="font-serif text-lg font-semibold text-gray-900">Found Item</h4>
          </div>
          <img src="http://127.0.0.1:8000/${match.found.image_path}" class="w-full h-40 object-cover rounded-lg mb-4 border border-gray-300">
          <div class="space-y-2">
            <p class="text-sm text-gray-700"><span class="font-semibold">Color:</span> ${match.found.color}</p>
            <p class="text-sm text-gray-700"><span class="font-semibold">Brand:</span> ${match.found.brand}</p>
            <p class="text-sm text-gray-700"><span class="font-semibold">Found At:</span> ${match.found.lost_location || "N/A"}</p>
            <p class="text-sm text-gray-700"><span class="font-semibold">Date:</span> ${new Date(match.found.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        <!-- Lost Item -->
        <div class="bg-gray-50 border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all">
          <div class="flex items-center mb-4">
            <div class="h-10 w-10 rounded-full bg-gray-900 flex items-center justify-center mr-3">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </div>
            <h4 class="font-serif text-lg font-semibold text-gray-900">Lost Item</h4>
          </div>
          <img src="http://127.0.0.1:8000/${match.lost.image_path}" class="w-full h-40 object-cover rounded-lg mb-4 border border-gray-300">
          <div class="space-y-2">
            <p class="text-sm text-gray-700"><span class="font-semibold">Color:</span> ${match.lost.color}</p>
            <p class="text-sm text-gray-700"><span class="font-semibold">Brand:</span> ${match.lost.brand}</p>
            <p class="text-sm text-gray-700"><span class="font-semibold">Last Seen:</span> ${match.lost.lost_location || "N/A"}</p>
            <p class="text-sm text-gray-700"><span class="font-semibold">Date:</span> ${new Date(match.lost.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      <!-- STATUS INFO BOX -->
      <div class="${
        match.status === 'RECLAIMED'
          ? 'bg-yellow-50 border-yellow-200'
          : match.status === 'REJECTED'
          ? 'bg-red-50 border-red-200'
          : match.status === 'APPROVED'
          ? 'bg-green-50 border-green-200'
          : 'bg-gray-50 border-gray-200'
      } border rounded-lg p-4 mb-6">
        <div class="flex items-start">
          <div>
            <p class="text-sm font-semibold ${
              match.status === 'RECLAIMED'
                ? 'text-yellow-900'
                : match.status === 'REJECTED'
                ? 'text-red-900'
                : match.status === 'APPROVED'
                ? 'text-green-900'
                : 'text-gray-900'
            }">
              ${match.status.toUpperCase()}
            </p>
            <p class="text-sm mt-1 ${
              match.status === 'RECLAIMED'
                ? 'text-yellow-700'
                : match.status === 'REJECTED'
                ? 'text-red-700'
                : match.status === 'APPROVED'
                ? 'text-green-700'
                : 'text-gray-700'
            }">
              ${
                match.status === 'RECLAIMED'
                  ? 'This item has been successfully claimed.'
                  : match.status === 'REJECTED'
                  ? 'This match was reviewed and rejected.'
                  : match.status === 'APPROVED'
                  ? 'This match has been verified and approved.'
                  : 'This match is pending verification.'
              }
            </p>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-3 pt-6 border-t border-gray-200">
        <button onclick="closeMatch()"
          class="px-6 py-2.5 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-all">
          Close
        </button>

        <!-- ADMIN ONLY -->
        ${currentUser?.role_id === 2 && match.status.toUpperCase() === "PENDING" ? `
          <button onclick="approveMatch(${match.match_id})"
            class="px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-all">
            Approve
          </button>
          <button onclick="rejectMatch(${match.match_id})"
            class="px-6 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-all">
            Reject
          </button>
        ` : ""}
      </div>
    </div>
  `;
}


// ===================== RENDER PAGE WITH PAGINATION =====================
function renderMatchesPage(page = 1) {
  container.innerHTML = "";
  currentPage = page;

  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const pageItems = matchesData.slice(start, end);

  pageItems.forEach(match => {
    const card = document.createElement("div");
    card.className = "item-card bg-white rounded-[32px] shadow-md border border-gray-100 px-0 flex flex-col";

    card.innerHTML = renderSummaryCard(match);
    container.appendChild(card);

    const btn = card.querySelector(".btn-view");
    if (btn) btn.addEventListener("click", () => openMatch(match));
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

  const totalPages = Math.ceil(totalMatches / pageSize);
  pagination.innerHTML = "";

  // Previous button
  const prevBtn = document.createElement("button");
  prevBtn.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>`;
  prevBtn.className = `px-3 py-2 rounded-lg ${currentPage === 1 ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white"} transition-all duration-200`;
  prevBtn.disabled = currentPage === 1;
  prevBtn.addEventListener("click", () => { if (currentPage > 1) renderMatchesPage(currentPage - 1); });
  pagination.appendChild(prevBtn);

  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    btn.className = `px-4 py-2 rounded-lg font-medium ${i === currentPage ? "bg-gray-900 text-white" : "bg-white border-2 border-gray-300 text-gray-900 hover:border-gray-900"} transition-all duration-200`;
    btn.addEventListener("click", () => renderMatchesPage(i));
    pagination.appendChild(btn);
  }

  // Next button
  const nextBtn = document.createElement("button");
  nextBtn.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>`;
  nextBtn.className = `px-3 py-2 rounded-lg ${currentPage === totalPages ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white"} transition-all duration-200`;
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.addEventListener("click", () => { if (currentPage < totalPages) renderMatchesPage(currentPage + 1); });
  pagination.appendChild(nextBtn);
}

// ===================== OVERLAY FUNCTIONS =====================
window.openMatch = function(match) {
  overlayContent.innerHTML = renderComparisonCard(match);
  overlay.classList.remove("hidden");
};

window.closeMatch = function() {
  overlay.classList.add("hidden");
};



// ===================== ADMIN APPROVE MATCH =====================
window.approveMatch = async function(matchId) {
  try {
    const token = localStorage.getItem("token");

    const res = await fetch(`http://127.0.0.1:8000/admin/approve-match/${matchId}`, {
      method: "POST",
      headers: { Authorization: "Bearer " + token }
    });

    if (!res.ok) throw new Error("Approve failed");

    alert("Match approved");
    closeMatch();
    fetchMatches(currentPage);
  } catch (err) {
    console.error(err);
    alert("Error approving match");
  }
};

// ===================== ADMIN REJECT MATCH =====================
window.rejectMatch = async function(matchId) {
  try {
    const token = localStorage.getItem("token");

    const res = await fetch(`http://127.0.0.1:8000/admin/reject-match/${matchId}`, {
      method: "POST",
      headers: { Authorization: "Bearer " + token }
    });

    if (!res.ok) throw new Error("Reject failed");

    alert("Match rejected");
    closeMatch();
    fetchMatches(currentPage);
  } catch (err) {
    console.error(err);
    alert("Error rejecting match");
  }
};


// ===================== INITIAL FETCH =====================
(async () => {
  await fetchCurrentUser();
  fetchMatches(currentPage);
})();

