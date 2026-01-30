// ✅ IIFE to prevent variable conflicts
(() => {
    const container = document.getElementById("reportsContainer");
    const overlay = document.getElementById("matchOverlay");
    const overlayContent = document.getElementById("overlayContent");
    const modalBackdrop = document.getElementById("modalBackdrop");
    const modalPanel = document.getElementById("modalPanel");

    // Pagination state
    let currentPage = 1;
    const pageSize = 6; 
    let totalMatches = 0;
    let matchesData = [];
    let currentUser = null;

    // ===================== INITIAL FETCH =====================
    // This runs immediately when file loads
    (async () => {
        await fetchCurrentUser();
        fetchMatches(currentPage);
    })();

    // ===================== FETCH MATCHES =====================
    async function fetchMatches(page = 1) {
        try {
            const token = localStorage.getItem("token");
            if (!token) throw new Error("User not authenticated");

            const res = await fetch("http://127.0.0.1:8000/matches/matches", {
                headers: { "Authorization": "Bearer " + token }
            });

            if (!res.ok) throw new Error("Failed to fetch matches");

            const data = await res.json();
            matchesData = data;
            totalMatches = data.length;
            renderMatchesPage(page);
        } catch (err) {
            console.error(err);
            container.innerHTML = `
                <div class="col-span-full flex flex-col items-center justify-center py-16 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <i class="fas fa-exclamation-circle text-gray-300 text-4xl mb-4"></i>
                    <p class="text-gray-500 text-lg">Unable to load AI matches at this time.</p>
                </div>`;
        }
    }

    // ===================== FETCH CURRENT USER =====================
    async function fetchCurrentUser() {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const res = await fetch("http://127.0.0.1:8000/users/me", {
                headers: { Authorization: "Bearer " + token }
            });

            if (res.ok) currentUser = await res.json();
        } catch (err) {
            console.error(err);
        }
    }

    // ===================== RENDER SUMMARY CARD =====================
    function renderSummaryCard(match) {
        const status = match.status ? match.status.toUpperCase() : "PENDING";
        const score = Math.round(match.similarity_score * 100);

        // Status Styles
        let badgeClass = "bg-gray-100 text-gray-600";
        if (status === "APPROVED") badgeClass = "bg-emerald-100 text-emerald-700 border border-emerald-200";
        if (status === "PENDING") badgeClass = "bg-yellow-100 text-yellow-700 border border-yellow-200";
        if (status === "REJECTED") badgeClass = "bg-red-100 text-red-700 border border-red-200";

        // Image Handling with Fallback
        const imgPath = match.found.image_path 
            ? `http://127.0.0.1:8000/${match.found.image_path}` 
            : 'https://via.placeholder.com/400x300?text=No+Image';

        return `
            <div class="relative group h-full flex flex-col">
                <div class="absolute top-4 right-4 z-10">
                    <span class="px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase ${badgeClass} shadow-sm">
                        ${status}
                    </span>
                </div>

                <div class="absolute top-4 left-4 z-10">
                    <div class="flex items-center gap-1 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm border border-white/50">
                        <div class="w-2 h-2 rounded-full ${score > 80 ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse"></div>
                        <span class="text-xs font-bold text-gray-800">${score}% Match</span>
                    </div>
                </div>

                <div class="relative h-64 overflow-hidden bg-gray-100 border-b border-gray-100">
                    <img src="${imgPath}" 
                         class="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                         onerror="this.onerror=null; this.src='https://via.placeholder.com/400x300?text=Image+Error'"
                         alt="Found Item">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-60"></div>
                    
                    <div class="absolute bottom-4 left-4 right-4 text-white">
                        <p class="text-xs font-medium text-yellow-300 mb-0.5 uppercase tracking-wide">${match.lost.brand || "Unknown Brand"}</p>
                        <h3 class="font-serif text-xl font-bold truncate">${match.lost.item_type || "Unknown Item"}</h3>
                    </div>
                </div>

                <div class="p-6 flex-1 flex flex-col">
                    <div class="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <p class="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Color</p>
                            <p class="text-sm font-medium text-gray-900 capitalize">${match.lost.color || "N/A"}</p>
                        </div>
                        <div>
                            <p class="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Date Found</p>
                            <p class="text-sm font-medium text-gray-900">${new Date(match.found.created_at).toLocaleDateString()}</p>
                        </div>
                    </div>

                    <div class="mt-auto pt-4 border-t border-gray-50">
                        <button class="btn-view w-full group relative flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
                            View Analysis
                            <i class="fas fa-arrow-right ml-2 group-hover:translate-x-1 transition-transform"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // ===================== RENDER COMPARISON CARD (MODAL) =====================
    
    function renderComparisonCard(match) {
        const score = Math.round(match.similarity_score * 100);
        
        // Dynamic Status Banner
        let bannerColor = "bg-gray-50 border-gray-200 text-gray-800";
        let bannerIcon = "fa-info-circle";
        let bannerTitle = "Status Unknown";
        let bannerDesc = "Status is pending.";

        if(match.status === 'APPROVED') {
            bannerColor = "bg-green-50 border-green-200 text-green-800";
            bannerIcon = "fa-check-circle";
            bannerTitle = "Match Approved";
            bannerDesc = "This match has been verified. The guest has been notified.";
        } else if(match.status === 'REJECTED') {
            bannerColor = "bg-red-50 border-red-200 text-red-800";
            bannerIcon = "fa-times-circle";
            bannerTitle = "Match Rejected";
            bannerDesc = "This match was marked as incorrect.";
        } else if(match.status === 'PENDING') {
            bannerColor = "bg-yellow-50 border-yellow-200 text-yellow-800";
            bannerIcon = "fa-hourglass-half";
            bannerTitle = "Verification Pending";
            bannerDesc = "Please review the details below and approve if these items match.";
        }

        const foundImg = match.found.image_path ? `http://127.0.0.1:8000/${match.found.image_path}` : 'https://via.placeholder.com/300';
        const lostImg = match.lost.image_path ? `http://127.0.0.1:8000/${match.lost.image_path}` : 'https://via.placeholder.com/300';

        return `
            <div class="flex flex-col h-full max-h-[90vh]">
                <div class="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div>
                        <h2 class="text-2xl font-serif font-bold text-gray-900">Match Analysis</h2>
                        <p class="text-sm text-gray-500 mt-1">Ref ID: #${match.match_id}</p>
                    </div>
                    <div class="flex flex-col items-end">
                        <div class="flex items-center gap-2">
                             <div class="w-12 h-12 rounded-full ${score > 85 ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'} flex items-center justify-center font-bold text-sm">
                                ${score}%
                            </div>
                            <div class="text-right">
                                <p class="text-xs font-bold text-gray-400 uppercase tracking-wide">Confidence</p>
                                <p class="text-sm font-bold text-gray-900">AI Similarity Score</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="overflow-y-auto p-8 bg-white">
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 relative">
                        
                        <div class="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 hidden md:flex w-10 h-10 bg-white rounded-full items-center justify-center font-bold text-gray-300 shadow-md border border-gray-100 text-xs">
                            VS
                        </div>

                        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group hover:border-green-200 transition-colors">
                            <div class="bg-green-50/50 px-4 py-3 border-b border-green-100 flex items-center gap-2">
                                <i class="fas fa-search-location text-green-600"></i>
                                <span class="font-bold text-green-900 text-sm uppercase tracking-wide">Found Item (Inventory)</span>
                            </div>
                            <div class="h-64 overflow-hidden bg-gray-100 relative">
                                <img src="${foundImg}" class="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500">
                            </div>
                            <div class="p-5 space-y-3">
                                <div class="grid grid-cols-2 gap-4">
                                    <div><p class="text-xs text-gray-400 font-bold uppercase">Brand</p><p class="text-sm font-medium">${match.found.brand || "--"}</p></div>
                                    <div><p class="text-xs text-gray-400 font-bold uppercase">Color</p><p class="text-sm font-medium">${match.found.color || "--"}</p></div>
                                    <div class="col-span-2"><p class="text-xs text-gray-400 font-bold uppercase">Location Found</p><p class="text-sm font-medium">${match.found.lost_location || "Unknown"}</p></div>
                                    <div class="col-span-2"><p class="text-xs text-gray-400 font-bold uppercase">Date</p><p class="text-sm font-medium">${new Date(match.found.created_at).toLocaleString()}</p></div>
                                </div>
                            </div>
                        </div>

                        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group hover:border-gray-300 transition-colors">
                            <div class="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                                <i class="fas fa-user text-gray-600"></i>
                                <span class="font-bold text-gray-900 text-sm uppercase tracking-wide">Guest Report (Lost)</span>
                            </div>
                            <div class="h-64 overflow-hidden bg-gray-100 relative">
                                <img src="${lostImg}" class="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500">
                            </div>
                            <div class="p-5 space-y-3">
                                <div class="grid grid-cols-2 gap-4">
                                    <div><p class="text-xs text-gray-400 font-bold uppercase">Brand</p><p class="text-sm font-medium">${match.lost.brand || "--"}</p></div>
                                    <div><p class="text-xs text-gray-400 font-bold uppercase">Color</p><p class="text-sm font-medium">${match.lost.color || "--"}</p></div>
                                    <div class="col-span-2"><p class="text-xs text-gray-400 font-bold uppercase">Last Seen</p><p class="text-sm font-medium">${match.lost.lost_location || "Unknown"}</p></div>
                                    <div class="col-span-2"><p class="text-xs text-gray-400 font-bold uppercase">Date Reported</p><p class="text-sm font-medium">${new Date(match.lost.created_at).toLocaleString()}</p></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="${bannerColor} border rounded-xl p-4 flex gap-4 items-start shadow-sm">
                        <div class="mt-0.5"><i class="fas ${bannerIcon} text-lg"></i></div>
                        <div>
                            <h4 class="font-bold text-sm uppercase tracking-wide">${bannerTitle}</h4>
                            <p class="text-sm opacity-90 mt-1">${bannerDesc}</p>
                        </div>
                    </div>
                </div>

                <div class="bg-gray-50 px-8 py-5 border-t border-gray-100 flex flex-row-reverse gap-3">
                    <button onclick="closeMatch()" class="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition shadow-sm">
                        Close
                    </button>

                    ${(currentUser?.role_id === 2 && match.status === "PENDING") ? `
                        <button onclick="approveMatch(${match.match_id})" class="px-5 py-2.5 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition shadow-lg shadow-green-200 flex items-center gap-2">
                            <i class="fas fa-check"></i> Confirm Match
                        </button>
                        <button onclick="rejectMatch(${match.match_id})" class="px-5 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition shadow-lg shadow-red-200 flex items-center gap-2">
                            <i class="fas fa-times"></i> Reject
                        </button>
                    ` : ""}
                </div>
            </div>
        `;
    }

    // ===================== RENDER PAGE =====================
    function renderMatchesPage(page = 1) {
        container.innerHTML = "";
        currentPage = page;

        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        const pageItems = matchesData.slice(start, end);

        if (pageItems.length === 0) {
            container.innerHTML = `
                <div class="col-span-full flex flex-col items-center justify-center py-20 text-center">
                   <div class="bg-gray-100 rounded-full h-20 w-20 flex items-center justify-center mb-4">
                        <i class="fas fa-robot text-gray-400 text-3xl"></i>
                   </div>
                   <h3 class="text-xl font-bold text-gray-900">No Matches Found</h3>
                   <p class="text-gray-500 mt-2">The AI hasn't detected any matches yet.</p>
                </div>
            `;
            return;
        }

        pageItems.forEach(match => {
            const card = document.createElement("div");
            card.className = "item-card bg-white rounded-[24px] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-1";
            card.innerHTML = renderSummaryCard(match);
            container.appendChild(card);

            const btn = card.querySelector(".btn-view");
            if (btn) btn.onclick = () => window.openMatch(match);
        });

        renderPagination();
    }

    // ===================== PAGINATION UI =====================
    function renderPagination() {
        let pagination = document.getElementById("pagination");
        const totalPages = Math.ceil(totalMatches / pageSize);
        pagination.innerHTML = "";

        if (totalPages <= 1) return;

        // Previous
        const prevBtn = document.createElement("button");
        prevBtn.innerHTML = `<i class="fas fa-chevron-left"></i>`;
        prevBtn.className = `w-10 h-10 flex items-center justify-center rounded-lg border ${currentPage === 1 ? "bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:text-gray-900 transition"}`;
        prevBtn.disabled = currentPage === 1;
        prevBtn.onclick = () => { if (currentPage > 1) renderMatchesPage(currentPage - 1); };
        pagination.appendChild(prevBtn);

        // Numbers
        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement("button");
            btn.textContent = i;
            btn.className = `w-10 h-10 flex items-center justify-center rounded-lg border text-sm font-bold ${i === currentPage ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 transition"}`;
            btn.onclick = () => renderMatchesPage(i);
            pagination.appendChild(btn);
        }

        // Next
        const nextBtn = document.createElement("button");
        nextBtn.innerHTML = `<i class="fas fa-chevron-right"></i>`;
        nextBtn.className = `w-10 h-10 flex items-center justify-center rounded-lg border ${currentPage === totalPages ? "bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:text-gray-900 transition"}`;
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.onclick = () => { if (currentPage < totalPages) renderMatchesPage(currentPage + 1); };
        pagination.appendChild(nextBtn);
    }

    // ===================== OVERLAY LOGIC (GLOBAL EXPORTS) =====================
    window.openMatch = function(match) {
        overlayContent.innerHTML = renderComparisonCard(match);
        overlay.classList.remove("hidden");
        
        // Trigger Animation
        setTimeout(() => {
            modalBackdrop.classList.remove("opacity-0");
            modalPanel.classList.remove("scale-95", "opacity-0");
            modalPanel.classList.add("scale-100", "opacity-100");
        }, 10);
    };

    window.closeMatch = function() {
        modalBackdrop.classList.add("opacity-0");
        modalPanel.classList.remove("scale-100", "opacity-100");
        modalPanel.classList.add("scale-95", "opacity-0");
        
        setTimeout(() => {
            overlay.classList.add("hidden");
        }, 300); // Wait for transition
    };

    // ===================== ADMIN ACTIONS =====================
    window.approveMatch = async function(matchId) {
        if(!confirm("Are you sure you want to approve this match? This will notify the guest.")) return;
        
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`http://127.0.0.1:8000/admin/admin/approve-match/${matchId}`, {
                method: "POST",
                headers: { Authorization: "Bearer " + token }
            });
            if (!res.ok) throw new Error("Approve failed");
            
            alert("Match approved successfully!");
            window.closeMatch();
            fetchMatches(currentPage);
        } catch (err) {
            console.error(err);
            alert("Error approving match");
        }
    };

    window.rejectMatch = async function(matchId) {
        if(!confirm("Are you sure you want to reject this match?")) return;

        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`http://127.0.0.1:8000/admin/admin/reject-match/${matchId}`, {
                method: "POST",
                headers: { Authorization: "Bearer " + token }
            });
            if (!res.ok) throw new Error("Reject failed");
            
            alert("Match rejected.");
            window.closeMatch();
            fetchMatches(currentPage);
        } catch (err) {
            console.error(err);
            alert("Error rejecting match");
        }
    };

})();