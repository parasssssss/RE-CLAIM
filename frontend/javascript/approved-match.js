/* ================= 1. STYLE & ANIMATION INJECTOR ================= */
const addGlobalStyles = () => {
    if (!document.getElementById('reclaim-dynamic-styles')) {
        const style = document.createElement('style');
        style.id = 'reclaim-dynamic-styles';
        style.textContent = `
            /* Toast Animations */
            @keyframes slideInToast {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes fadeOutToast {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(10px); opacity: 0; }
            }
            .toast-enter { animation: slideInToast 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            .toast-exit { animation: fadeOutToast 0.4s ease-in forwards; }

            /* Loading Spinner */
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            .animate-spin { animation: spin 1s linear infinite; }
            
            /* Entry Animation */
            @keyframes entry { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            .animate-entry { animation: entry 0.4s ease-out forwards; }
        `;
        document.head.appendChild(style);
    }
};

addGlobalStyles();

/* ================= 2. TOAST NOTIFICATION SYSTEM ================= */
const ToastManager = {
    container: null,
    init() {
        if (!document.getElementById('toast-container')) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none';
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('toast-container');
        }
    },
    show(message, type = 'error') {
        this.init();
        const toast = document.createElement('div');
        const isError = type === 'error';
        const borderClass = isError ? 'border-red-500' : 'border-green-500';
        const iconColor = isError ? 'text-red-600 bg-red-100' : 'text-green-600 bg-green-100';
        const title = isError ? 'Action Failed' : 'Success';
        
        // Simple Icons
        const iconSvg = isError 
            ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>'
            : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>';

        toast.className = `pointer-events-auto toast-enter flex items-start gap-4 p-4 min-w-[320px] max-w-sm bg-white rounded-xl shadow-lg border-l-4 ${borderClass}`;
        
        toast.innerHTML = `
            <div class="flex-shrink-0"><div class="${iconColor} rounded-full p-2"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">${iconSvg}</svg></div></div>
            <div class="flex-1 pt-0.5">
                <h3 class="font-serif font-bold text-slate-800 text-sm leading-5">${title}</h3>
                <p class="mt-1 text-sm text-slate-500 leading-relaxed">${message}</p>
            </div>
            <button onclick="this.parentElement.remove()" class="ml-4 text-slate-400 hover:text-slate-600"><svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg></button>
        `;
        this.container.appendChild(toast);
        setTimeout(() => {
            if(toast.parentElement) {
                toast.classList.replace('toast-enter', 'toast-exit');
                toast.addEventListener('animationend', () => toast.remove());
            }
        }, 5000);
    }
};

/* ================= 3. LOADING MANAGER ================= */
const LoadingManager = {
    show(button, text = 'Processing...') {
        if (!button) return;
        button.dataset.originalHTML = button.innerHTML;
        button.disabled = true;
        button.innerHTML = `
            <span class="flex items-center justify-center">
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-slate-900" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                ${text}
            </span>
        `;
        button.classList.add('opacity-75', 'cursor-not-allowed');
    },
    hide(button) {
        if (!button) return;
        button.innerHTML = button.dataset.originalHTML || 'Action';
        button.disabled = false;
        button.classList.remove('opacity-75', 'cursor-not-allowed');
    }
};

/* ================= 4. MAIN LOGIC (IIFE) ================= */
(() => {
    // Configuration
    const API_BASE_URL = "http://127.0.0.1:8000";

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
            const res = await fetch(`${API_BASE_URL}/users/me`, {
                headers: { "Authorization": "Bearer " + token }
            });
            if (res.ok) currentUser = await res.json();
        } catch (err) { console.error("User fetch error:", err); }
    }

    async function fetchMatches(page = 1) {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                ToastManager.show("Authentication required.", "error");
                return;
            }

            const res = await fetch(`${API_BASE_URL}/matches/approved-matches`, {
                headers: { "Authorization": "Bearer " + token }
            });

            if (!res.ok) throw new Error("Failed to fetch matches");

            const data = await res.json();
            matchesData = data;
            totalMatches = data.length;
            renderMatchesPage(page);
        } catch (err) {
            console.error(err);
            ToastManager.show("Could not load matches. Server might be down.", "error");
            if(container) {
                container.innerHTML = `
                    <div class="col-span-full py-12 text-center bg-red-50 rounded-2xl border border-red-100 animate-entry">
                        <p class="text-red-600 font-medium"><i class="fas fa-wifi mr-2"></i>Unable to connect to server.</p>
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
                <div class="col-span-full flex flex-col items-center justify-center py-20 text-center animate-entry">
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

        pageItems.forEach((match, index) => {
            const card = document.createElement("div");
            // Stagger animation delay based on index
            card.style.animationDelay = `${index * 50}ms`;
            card.className = "item-card bg-white rounded-[24px] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 flex flex-col h-full animate-entry";
            card.innerHTML = renderSummaryCard(match);
            container.appendChild(card);

            const btn = card.querySelector(".btn-view");
            if (btn) btn.onclick = () => window.openMatch(match);
        });

        renderPagination();
    }

    // ===================== PAGINATION UI =====================
    function renderPagination() {
        if(!paginationContainer) return;
        paginationContainer.innerHTML = "";
        
        const totalPages = Math.ceil(totalMatches / pageSize);
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

        // Handle image paths safely
        const foundImg = match.found.image_path ? `${API_BASE_URL}/${match.found.image_path}` : 'https://via.placeholder.com/400x300?text=No+Image';

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
                    <img src="${foundImg}" class="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
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

    // ===================== COMPARISON CARD =====================
    function renderComparisonCard(match) {
        const score = Math.round(match.similarity_score * 100);
        
        let bannerColor = "bg-green-50 border-green-200 text-green-800";
        let bannerTitle = "Match Approved";
        let bannerDesc = "This item has been verified. You can claim it below.";

        if(match.status === 'RECLAIMED') {
            bannerColor = "bg-yellow-50 border-yellow-200 text-yellow-800";
            bannerTitle = "Item Claimed";
            bannerDesc = "You have successfully claimed this item.";
        }

        const foundImg = match.found.image_path ? `${API_BASE_URL}/${match.found.image_path}` : 'https://via.placeholder.com/300';
        const lostImg = match.lost.image_path ? `${API_BASE_URL}/${match.lost.image_path}` : 'https://via.placeholder.com/300';

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
                                <img src="${foundImg}" class="w-full h-full object-contain" onerror="this.onerror=null; this.src='https://via.placeholder.com/400x300?text=Image+Error'">
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
                                 <img src="${lostImg}" class="w-full h-full object-contain" onerror="this.onerror=null; this.src='https://via.placeholder.com/400x300?text=Image+Error'">
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
                        <button onclick="claimItem(${match.match_id}, this)" class="px-6 py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 text-slate-900 font-bold rounded-lg hover:from-yellow-400 hover:to-yellow-500 transition shadow-[0_0_15px_rgba(234,179,8,0.3)] flex items-center gap-2 text-sm transform active:scale-95">
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

    // Updated Claim Item Function with Loading State & Toast
    window.claimItem = async function(matchId, btnElement) {
        try {
            // 1. Show Loading
            LoadingManager.show(btnElement, "Claiming...");

            const token = localStorage.getItem("token");
            if(!token) {
                 ToastManager.show("You must be logged in.", "error");
                 LoadingManager.hide(btnElement);
                 return;
            }

            const res = await fetch(`${API_BASE_URL}/items/claim-item/${matchId}`, {
                method: "POST",
                headers: { "Authorization": "Bearer " + token }
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.detail || "Claim failed");

            // 2. Success Feedback
            ToastManager.show("Item successfully claimed!", "success");
            
            // 3. Update UI locally
            const m = matchesData.find(x => x.match_id === matchId);
            if(m) m.status = "RECLAIMED";
            
            // Close modal after short delay
            setTimeout(() => {
                window.closeMatch();
                renderMatchesPage(currentPage);
            }, 1000);

        } catch (err) {
            console.error(err);
            ToastManager.show(err.message || "Error claiming item.", "error");
            LoadingManager.hide(btnElement);
        }
    };

})();