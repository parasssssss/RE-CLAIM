document.addEventListener("DOMContentLoaded", () => {
    // Only run on the notifications page
    const feedContainer = document.getElementById("notifications-feed");
    if (!feedContainer) return; 

    // Elements
    const filterBtns = document.querySelectorAll(".filter-btn");
    const searchInput = document.getElementById("notif-search");
    const loadingState = document.getElementById("page-loading");
    const markAllBtn = document.getElementById("mark-all-read-page");
    
    // State
    let allNotifications = []; 
    const API_BASE = "http://127.0.0.1:8000/notifications";
    const token = localStorage.getItem("token");

    // Initialize
    fetchHistory();

    // --- 1. Fetch Real Data ---
    async function fetchHistory() {
        if (!token) return window.location.href = "index.html";

        // Show Loading
        loadingState.classList.remove("hidden");
        feedContainer.innerHTML = '';
        feedContainer.appendChild(loadingState);

        try {
            // Fetch last 100 notifications for the history page
            const res = await fetch(`${API_BASE}/latest?limit=100`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            
            if (!res.ok) throw new Error("Failed to load");

            const rawData = await res.json();
            
            // Map Database Schema to UI Format
            allNotifications = rawData.map(item => {
                return {
                    id: item.notification_id,
                    title: item.title,
                    message: item.message,
                    time: item.created_at,
                    read: item.is_read,
                    match_id: item.match_id,
                    // Auto-detect type based on keywords since DB might not have 'type' column
                    type: detectType(item.title) 
                };
            });

            updateSidebarCounts();
            renderFeed(allNotifications);

        } catch (err) {
            console.error(err);
            feedContainer.innerHTML = `
                <div class="flex flex-col items-center justify-center py-16 text-center">
                    <div class="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-3">
                        <i class="fas fa-wifi text-red-400 text-xl"></i>
                    </div>
                    <h3 class="text-gray-900 font-bold">Connection Failed</h3>
                    <p class="text-gray-500 text-sm mb-4">Could not load activity log.</p>
                    <button onclick="location.reload()" class="text-indigo-600 font-bold text-sm hover:underline">Try Again</button>
                </div>`;
        }
    }

    // --- 2. Render Logic ---
    function renderFeed(data) {
        feedContainer.innerHTML = ''; // Clear loading

        if (data.length === 0) {
            feedContainer.innerHTML = `
                <div class="flex flex-col items-center justify-center py-20">
                    <div class="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                        <i class="fas fa-inbox text-gray-300 text-3xl"></i>
                    </div>
                    <h3 class="text-gray-900 font-bold text-lg">No activity found</h3>
                    <p class="text-gray-500 text-sm mt-1">Try adjusting your filters or search terms.</p>
                </div>`;
            return;
        }

        // Group by Date
        const groups = { 'Today': [], 'Yesterday': [], 'Earlier': [] };
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();

        data.forEach(item => {
            const d = new Date(item.time).toDateString();
            if (d === today) groups['Today'].push(item);
            else if (d === yesterday) groups['Yesterday'].push(item);
            else groups['Earlier'].push(item);
        });

        // Render Groups
        Object.keys(groups).forEach(dateLabel => {
            if (groups[dateLabel].length === 0) return;

            // Date Header
            const header = document.createElement("div");
            header.className = "flex items-center gap-4 mb-4 mt-8 first:mt-0";
            header.innerHTML = `
                <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">${dateLabel}</h3>
                <div class="h-px bg-gray-100 w-full"></div>
            `;
            feedContainer.appendChild(header);

            // Card Container
            const listGroup = document.createElement("div");
            listGroup.className = "space-y-3";

            groups[dateLabel].forEach(notif => {
                const card = createNotificationCard(notif);
                listGroup.appendChild(card);
            });
            feedContainer.appendChild(listGroup);
        });
    }

    // --- 3. Helper: Create UI Card ---
    // --- Helper: Create Premium UI Card ---
    function createNotificationCard(item) {
        const el = document.createElement("div");
        el.className = "notification-card-enter mb-4"; // Add animation class
        
        // --- Theme Logic ---
        let icon = "fa-info";
        let iconStyle = "bg-slate-100 text-slate-500";
        let borderStyle = "border-l-4 border-l-transparent";
        
        // Match (Gold/Luxury)
        if (item.type === 'match') { 
            icon = "fa-bolt"; 
            iconStyle = "bg-yellow-50 text-yellow-600 ring-1 ring-yellow-400/20"; 
            if(!item.read) borderStyle = "border-l-4 border-l-yellow-400 bg-yellow-50/10";
        }
        // Alert (Red)
        else if (item.type === 'alert') { 
            icon = "fa-exclamation"; 
            iconStyle = "bg-red-50 text-red-600 ring-1 ring-red-400/20"; 
            if(!item.read) borderStyle = "border-l-4 border-l-red-500 bg-red-50/10";
        }
        // Success (Green)
        else if (item.type === 'success') { 
            icon = "fa-check"; 
            iconStyle = "bg-green-50 text-green-600 ring-1 ring-green-400/20"; 
        }

        // --- Read vs Unread Visuals ---
        // Unread: White background, Shadow, distinct border
        // Read: Transparent/Gray background, Flat
        const containerClasses = item.read 
            ? "bg-slate-50/50 border border-slate-100 opacity-75 hover:opacity-100" 
            : "bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-yellow-200 transform hover:-translate-y-0.5";

        el.innerHTML = `
            <div class="relative p-5 rounded-2xl transition-all duration-300 cursor-pointer ${containerClasses} ${borderStyle} group">
                <div class="flex items-start gap-5">
                    <div class="w-12 h-12 rounded-xl flex items-center justify-center ${iconStyle} flex-shrink-0 shadow-sm">
                        <i class="fas ${icon} text-lg"></i>
                    </div>
                    
                    <div class="flex-1 min-w-0 pt-0.5">
                        <div class="flex items-center justify-between mb-1.5">
                            <h4 class="font-bold text-slate-900 text-base truncate pr-4 group-hover:text-yellow-700 transition-colors">
                                ${item.title}
                            </h4>
                            <span class="text-xs text-slate-400 font-bold tracking-wider uppercase flex items-center gap-2">
                                ${formatTime(item.time)}
                                ${!item.read ? '<span class="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>' : ''}
                            </span>
                        </div>
                        
                        <p class="text-sm text-slate-600 leading-relaxed max-w-2xl">
                            ${item.message}
                        </p>
                        
                        ${item.match_id ? `
                            <div class="mt-4 flex gap-3">
                                <button class="view-match-link px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-all flex items-center gap-2 shadow-sm">
                                    View Analysis <i class="fas fa-arrow-right text-yellow-400"></i>
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        
        // Interaction Logic (Keep existing)
        el.querySelector('div').addEventListener("click", (e) => {
             // Logic remains the same...
            if (!e.target.closest('.view-match-link')) {
                 if (!item.read) markAsRead(item.id, el.querySelector('div')); // Pass the inner div
            }
        });
        
        // ... (Keep existing button listeners) ...
        const linkBtn = el.querySelector('.view-match-link');
        if(linkBtn) {
            linkBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                window.location.href = `items.html?match_id=${item.match_id}`;
            });
        }

        return el;
    }
    // --- 4. Logic Helpers ---
    
    // Auto-detect type based on keywords
    function detectType(title) {
        const t = (title || "").toLowerCase();
        if (t.includes("match") || t.includes("found")) return 'match';
        if (t.includes("alert") || t.includes("warning") || t.includes("failed")) return 'alert';
        if (t.includes("success") || t.includes("verified") || t.includes("claimed")) return 'success';
        return 'system';
    }

    async function markAsRead(id, cardEl) {
        try {
            const res = await fetch(`${API_BASE}/${id}/read`, {
                method: "PATCH",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                // Update UI instantly
                cardEl.classList.remove("ring-1", "ring-indigo-50", "shadow-sm", "border-l-4", "border-l-indigo-500");
                cardEl.classList.add("opacity-80", "border", "border-gray-100");
                
                // Update data model
                const item = allNotifications.find(n => n.id === id);
                if(item) item.read = true;
                
                updateSidebarCounts();
            }
        } catch (e) { console.error(e); }
    }

    function updateSidebarCounts() {
        const unreadCount = allNotifications.filter(n => !n.read).length;
        document.getElementById("count-all").textContent = allNotifications.length;
        const unreadBadge = document.getElementById("count-unread");
        unreadBadge.textContent = unreadCount;
        
        // Hide badge if 0
        if(unreadCount === 0) unreadBadge.classList.add("hidden");
        else unreadBadge.classList.remove("hidden");
    }

    function formatTime(dateStr) {
        return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // --- 5. Event Listeners ---
    
    // Filters
    filterBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            filterBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            const type = btn.dataset.filter;
            let filtered = allNotifications;

            if (type === 'unread') filtered = allNotifications.filter(n => !n.read);
            else if (type === 'match') filtered = allNotifications.filter(n => n.type === 'match');
            else if (type === 'system') filtered = allNotifications.filter(n => n.type !== 'match');

            renderFeed(filtered);
        });
    });

    // Search
    searchInput.addEventListener("input", (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allNotifications.filter(n => 
            n.title.toLowerCase().includes(term) || 
            n.message.toLowerCase().includes(term)
        );
        renderFeed(filtered);
    });

    // Mark All Read
    if(markAllBtn) {
        markAllBtn.addEventListener("click", async () => {
            try {
                const res = await fetch(`${API_BASE}/mark_all_read`, {
                    method: "PATCH",
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                    allNotifications.forEach(n => n.read = true);
                    renderFeed(allNotifications); // Re-render to clear unread styles
                    updateSidebarCounts();
                }
            } catch(e) { console.error(e); }
        });
    }
});