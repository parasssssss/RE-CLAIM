// ✅ IIFE to prevent variable conflicts
(() => {
    // State variables
    let currentPage = 1;
    const pageSize = 6; 
    let totalMatches = 0;
    let matchesData = [];
    let currentUser = null;

    // DOM Elements (assigned after load)
    let container, paginationContainer, overlay, overlayContent, modalBackdrop, modalPanel;

    // ===================== INITIAL LOAD =====================
    document.addEventListener("DOMContentLoaded", () => {
        // 1. Assign Elements
        container = document.getElementById("reportsContainer");
        paginationContainer = document.getElementById("pagination");
        overlay = document.getElementById("matchOverlay");
        overlayContent = document.getElementById("overlayContent");
        modalBackdrop = document.getElementById("modalBackdrop");
        modalPanel = document.getElementById("modalPanel");

        // 2. Start Fetching
        fetchCurrentUser();
        fetchMatches(currentPage);
    });

    // ===================== FETCH DATA =====================
    async function fetchCurrentUser() {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;
            const res = await fetch("http://127.0.0.1:8000/users/me", {
                headers: { "Authorization": "Bearer " + token }
            });
            if (res.ok) currentUser = await res.json();
        } catch (err) { console.error(err); }
    }

    async function fetchMatches(page = 1) {
        try {
            const token = localStorage.getItem("token");
            if (!token) throw new Error("User not authenticated");

            const res = await fetch("http://127.0.0.1:8000/matches/approved-matches", {
                headers: { "Authorization": "Bearer " + token }
            });

            if (!res.ok) throw new Error("Failed to fetch matches");

            const data = await res.json();
            matchesData = data;
            totalMatches = data.length;
            renderMatchesPage(page);
        } catch (err) {
            console.error(err);
            if(container) {
                container.innerHTML = `
                    <div class="col-span-full py-12 text-center bg-red-50 rounded-2xl border border-red-100">
                        <p class="text-red-600 font-medium">Unable to load approved matches.</p>
                    </div>`;
            }
        }
    }

    // ===================== RENDER PAGE =====================
    function renderMatchesPage(page = 1) {
        if(!container) return;
        container.innerHTML = "";
        currentPage = page;

        // Empty State
        if (matchesData.length === 0) {
            container.innerHTML = `
                <div class="col-span-full flex flex-col items-center justify-center py-20 text-center">
                   <div class="bg-gray-100 rounded-full h-20 w-20 flex items-center justify-center mb-4">
                        <i class="fas fa-clipboard-check text-gray-400 text-3xl"></i>
                   </div>
                   <h3 class="text-xl font-bold text-gray-900">No Approved Matches</h3>
                   <p class="text-gray-500 mt-2">Verified matches will appear here.</p>
                </div>
            `;
            if(paginationContainer) paginationContainer.innerHTML = "";
            return;
        }

        // Slice Data for Pagination
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        const pageItems = matchesData.slice(start, end);

        pageItems.forEach(match => {
            const card = document.createElement("div");
            // Premium Floating Card Style
            card.className = "item-card bg-white rounded-[24px] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 flex flex-col h-full";
            card.innerHTML = renderSummaryCard(match);
            container.appendChild(card);

            const btn = card.querySelector(".btn-view");
            if (btn) btn.onclick = () => window.openMatch(match);
        });

        renderPagination();
    }

    // ===================== PAGINATION UI =====================
   // ===================== PAGINATION UI =====================
function renderPagination() {
    if(!paginationContainer) return;
    paginationContainer.innerHTML = "";
    
    // Debugging: Check your data count
    console.log(`Total Matches: ${totalMatches}, Page Size: ${pageSize}`);

    const totalPages = Math.ceil(totalMatches / pageSize);
    console.log(`Calculated Pages: ${totalPages}`);

    // FIX: Comment this out to see pagination even if there is only 1 page
    // if (totalPages <= 1) return; 

    // If no items, definitely hide it
    if (totalMatches === 0) return;

    // Previous Button
    const prevBtn = document.createElement("button");
    prevBtn.innerHTML = `<i class="fas fa-chevron-left"></i>`;
    prevBtn.className = `w-10 h-10 flex items-center justify-center rounded-lg border ${currentPage === 1 ? "bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:text-gray-900 transition"}`;
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => { if (currentPage > 1) renderMatchesPage(currentPage - 1); };
    paginationContainer.appendChild(prevBtn);

    // Page Numbers
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement("button");
        btn.textContent = i;
        btn.className = `w-10 h-10 flex items-center justify-center rounded-lg border text-sm font-bold ${i === currentPage ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 transition"}`;
        btn.onclick = () => renderMatchesPage(i);
        paginationContainer.appendChild(btn);
    }

    // Next Button
    const nextBtn = document.createElement("button");
    nextBtn.innerHTML = `<i class="fas fa-chevron-right"></i>`;
    nextBtn.className = `w-10 h-10 flex items-center justify-center rounded-lg border ${currentPage === totalPages ? "bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:text-gray-900 transition"}`;
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => { if (currentPage < totalPages) renderMatchesPage(currentPage + 1); };
    paginationContainer.appendChild(nextBtn);
}
    // ===================== RENDER CARDS =====================
    function renderSummaryCard(match) {
        const status = match.status.toUpperCase();
        const score = Math.round(match.similarity_score * 100);

        let badgeClass = "bg-gray-100 text-gray-600";
        if (status === "APPROVED") badgeClass = "bg-emerald-100 text-emerald-700 border border-emerald-200";
        if (status === "RECLAIMED") badgeClass = "bg-yellow-100 text-yellow-700 border border-yellow-200";

        const imgPath = match.found.image_path 
            ? `http://127.0.0.1:8000/${match.found.image_path}` 
            : 'https://via.placeholder.com/400x300?text=No+Image';

        return `
            <div class="relative group flex flex-col h-full">
                <div class="absolute top-4 right-4 z-10">
                    <span class="px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase ${badgeClass} shadow-sm">
                        ${status}
                    </span>
                </div>
                <div class="absolute top-4 left-4 z-10">
                    <div class="flex items-center gap-1 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm border border-white/50">
                        <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span class="text-xs font-bold text-gray-800">${score}% Match</span>
                    </div>
                </div>
                <div class="relative h-64 overflow-hidden bg-gray-100 border-b border-gray-100">
                    <img src="${imgPath}" class="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                    onerror="this.onerror=null; this.src='https://via.placeholder.com/400x300?text=Image+Error'">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
                    <div class="absolute bottom-4 left-4 right-4 text-white">
                        <p class="text-xs font-medium text-yellow-300 mb-0.5 uppercase tracking-wide">${match.lost.brand || "Unknown"}</p>
                        <h3 class="font-serif text-xl font-bold truncate">${match.lost.item_type || "Item"}</h3>
                    </div>
                </div>
                <div class="p-6 flex-1 flex flex-col">
                    <div class="grid grid-cols-2 gap-4 mb-6">
                        <div><p class="text-[10px] font-bold text-gray-400 uppercase">Color</p><p class="text-sm font-medium text-gray-900 capitalize">${match.lost.color}</p></div>
                        <div><p class="text-[10px] font-bold text-gray-400 uppercase">Found</p><p class="text-sm font-medium text-gray-900">${new Date(match.found.created_at).toLocaleDateString()}</p></div>
                    </div>
                    <div class="mt-auto pt-4 border-t border-gray-50">
                        <button class="btn-view w-full py-3 px-4 bg-gray-900 text-white text-sm font-bold rounded-xl shadow-md hover:bg-gray-800 transition-all hover:-translate-y-0.5">
                            View Details
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // ===================== COMPARISON CARD (ORIGINAL WHITE THEME + FIXED IMAGES) =====================
function renderComparisonCard(match) {
    const score = Math.round(match.similarity_score * 100);
    
    // Original Banner Logic
    let bannerColor = "bg-green-50 border-green-200 text-green-800";
    let bannerTitle = "Match Approved";
    let bannerDesc = "This item has been verified. You can claim it below.";

    if(match.status === 'RECLAIMED') {
        bannerColor = "bg-yellow-50 border-yellow-200 text-yellow-800";
        bannerTitle = "Item Claimed";
        bannerDesc = "You have successfully claimed this item.";
    }

    const foundImg = match.found.image_path ? `http://127.0.0.1:8000/${match.found.image_path}` : 'https://via.placeholder.com/300';
    const lostImg = match.lost.image_path ? `http://127.0.0.1:8000/${match.lost.image_path}` : 'https://via.placeholder.com/300';

    return `
        <div class="flex flex-col h-full max-h-[90vh] bg-white rounded-lg shadow-xl overflow-hidden">
            
            <div class="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div>
                    <h2 class="text-2xl font-serif font-bold text-gray-900">Approved Match</h2>
                    <p class="text-sm text-gray-500 mt-1">Ref ID: #${match.match_id}</p>
                </div>
                <div class="flex items-center gap-2">
                     <div class="w-12 h-12 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-sm border-2 border-green-200">
                        ${score}%
                     </div>
                </div>
            </div>

            <div class="overflow-y-auto p-8 bg-white">
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 relative">
                    
                    <div class="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 hidden md:flex w-12 h-12 items-center justify-center rounded-full bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-600 shadow-md border-4 border-white">
                        <span class="font-black text-white text-xs font-serif italic pr-0.5">VS</span>
                    </div>
                    
                    <div class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden group hover:border-green-300 transition-colors">
                        <div class="bg-green-50/50 px-4 py-3 border-b border-green-100 text-green-900 font-bold text-xs uppercase tracking-wide flex justify-between">
                            <span>Found Item</span>
                            <i class="fas fa-box-open opacity-50"></i>
                        </div>
                        
                        <div class="w-full h-64 bg-gray-100 flex items-center justify-center overflow-hidden relative">
                            <img src="${foundImg}" 
                                 class="w-full h-full object-contain" 
                                 onerror="this.onerror=null; this.src='https://via.placeholder.com/400x300?text=Image+Error'">
                        </div>

                        <div class="p-4 grid grid-cols-2 gap-2 text-sm bg-white">
                            <div><span class="text-gray-400 text-xs font-bold uppercase">Brand</span><br><span class="text-gray-800 font-medium">${match.found.brand || "--"}</span></div>
                            <div><span class="text-gray-400 text-xs font-bold uppercase">Color</span><br><span class="text-gray-800 font-medium">${match.found.color || "--"}</span></div>
                        </div>
                    </div>

                    <div class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden group hover:border-blue-300 transition-colors">
                        <div class="bg-blue-50/50 px-4 py-3 border-b border-blue-100 text-blue-900 font-bold text-xs uppercase tracking-wide flex justify-between">
                            <span>Your Report</span>
                            <i class="fas fa-file-alt opacity-50"></i>
                        </div>
                        
                        <div class="w-full h-64 bg-gray-100 flex items-center justify-center overflow-hidden relative">
                             <img src="${lostImg}" 
                                  class="w-full h-full object-contain" 
                                  onerror="this.onerror=null; this.src='https://via.placeholder.com/400x300?text=Image+Error'">
                        </div>

                        <div class="p-4 grid grid-cols-2 gap-2 text-sm bg-white">
                            <div><span class="text-gray-400 text-xs font-bold uppercase">Brand</span><br><span class="text-gray-800 font-medium">${match.lost.brand || "--"}</span></div>
                            <div><span class="text-gray-400 text-xs font-bold uppercase">Color</span><br><span class="text-gray-800 font-medium">${match.lost.color || "--"}</span></div>
                        </div>
                    </div>
                </div>

                <div class="${bannerColor} border rounded-xl p-4 flex gap-3 shadow-sm items-start">
                    <i class="fas fa-info-circle mt-1 text-lg"></i>
                    <div>
                        <h4 class="font-bold text-sm uppercase">${bannerTitle}</h4>
                        <p class="text-sm opacity-90">${bannerDesc}</p>
                    </div>
                </div>
            </div>

            <div class="bg-gray-50 px-8 py-5 border-t border-gray-200 flex flex-row-reverse gap-3">
                <button onclick="closeMatch()" class="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition shadow-sm">
                    Close
                </button>
                
                ${(currentUser?.role_id === 4 && match.status !== "RECLAIMED") ? `
                    <button onclick="claimItem(${match.match_id})" class="px-6 py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 text-slate-900 font-bold rounded-lg hover:from-yellow-400 hover:to-yellow-500 transition shadow-[0_0_15px_rgba(234,179,8,0.3)] flex items-center gap-2 text-sm transform active:scale-95">
                        <i class="fas fa-signature"></i> Claim Ownership
                    </button>
                ` : ""}
            </div>
        </div>
    `;
}

    // ===================== GLOBAL ACTIONS =====================
    window.openMatch = function(match) {
        if(!overlayContent) return;
        overlayContent.innerHTML = renderComparisonCard(match);
        overlay.classList.remove("hidden");
        setTimeout(() => {
            modalBackdrop.classList.remove("opacity-0");
            modalPanel.classList.remove("scale-95", "opacity-0");
            modalPanel.classList.add("scale-100", "opacity-100");
        }, 10);
    };

    window.closeMatch = function() {
        if(!modalBackdrop || !modalPanel) return;
        modalBackdrop.classList.add("opacity-0");
        modalPanel.classList.remove("scale-100", "opacity-100");
        modalPanel.classList.add("scale-95", "opacity-0");
        setTimeout(() => { overlay.classList.add("hidden"); }, 300);
    };

    window.claimItem = async function(matchId) {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`http://127.0.0.1:8000/items/claim-item/${matchId}`, {
                method: "POST",
                headers: { "Authorization": "Bearer " + token }
            });
            if (!res.ok) throw new Error("Failed");
            alert("Item successfully claimed!");
            window.closeMatch();
            
            // Update local data
            const m = matchesData.find(x => x.match_id === matchId);
            if(m) m.status = "RECLAIMED";
            renderMatchesPage(currentPage);
        } catch (err) { alert("Error claiming item."); }
    };

})();