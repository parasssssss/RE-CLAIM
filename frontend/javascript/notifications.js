// Enhanced Notifications JavaScript - Premium Theme Edition
document.addEventListener("DOMContentLoaded", () => {
  const bellBtn = document.getElementById("notification-bell");
  const badge = document.getElementById("notification-badge");
  const dropdown = document.getElementById("notification-dropdown");
  const notificationsList = document.getElementById("notifications-list");
  const loadingElement = document.getElementById("notifications-loading");
  const markAllReadBtn = document.getElementById("mark-all-read");
  const settingsBtn = document.getElementById("notifications-settings");

  const API_BASE = "http://127.0.0.1:8000/notifications";

  // Get JWT token from localStorage
  const token = localStorage.getItem("token");
  if (!token) {
    console.warn("No JWT token found. Notifications will not load.");
    return;
  }

  const fetchOptions = {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  };

  // ---------- Fetch unread count ----------
  async function fetchUnreadCount() {
    try {
      const res = await fetch(`${API_BASE}/unread_count`, fetchOptions);
      if (!res.ok) throw new Error("Failed to fetch unread count");
      const data = await res.json();
      
      if (data.count > 0) {
        // ✅ PREMIUM BADGE STYLE
        badge.innerHTML = `
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-4 w-4 bg-yellow-500 border-2 border-white text-[9px] text-white items-center justify-center font-bold shadow-sm">
            ${data.count > 9 ? '9+' : data.count}
          </span>
        `;
        badge.classList.remove("hidden");
      } else {
        badge.textContent = "";
        badge.classList.add("hidden");
      }
    } catch (err) {
      console.error("Error fetching unread count:", err);
    }
  }

  // ---------- Fetch latest notifications ----------
  async function fetchLatestNotifications(limit = 5) {
    try {
      if(loadingElement) loadingElement.classList.remove("hidden");
      
      const res = await fetch(`${API_BASE}/latest?limit=${limit}`, fetchOptions);
      if (!res.ok) throw new Error("Failed to fetch notifications");
      const notifications = await res.json();
      
      if(loadingElement) loadingElement.classList.add("hidden");
      notificationsList.innerHTML = "";

      // Empty State
      if (notifications.length === 0) {
        // Check if the HTML already has the empty state div, if so show it
        const existingEmpty = document.getElementById("notifications-empty");
        if(existingEmpty) {
            existingEmpty.classList.remove("hidden");
        } else {
            // Fallback injection if HTML element is missing
            notificationsList.innerHTML = `
              <li class="flex flex-col items-center justify-center py-12 text-center">
                <div class="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-3 shadow-sm border border-slate-100">
                  <i class="fas fa-bell-slash text-slate-300 text-xl"></i>
                </div>
                <h4 class="font-bold text-slate-700 text-sm mb-1">All caught up</h4>
                <p class="text-xs text-slate-400">No new alerts to display.</p>
              </li>
            `;
        }
        return;
      } else {
         const existingEmpty = document.getElementById("notifications-empty");
         if(existingEmpty) existingEmpty.classList.add("hidden");
      }

      notifications.forEach((notif) => {
        // Logic for styling based on type
        let iconClass = "fa-info";
        let iconBgClass = "bg-slate-100 text-slate-500";
        let borderClass = "border-l-transparent";
        
        const titleLower = notif.title?.toLowerCase() || "";

        if (titleLower.includes("match")) {
          iconClass = "fa-bolt"; // Premium bolt icon
          iconBgClass = "bg-yellow-100 text-yellow-600 border border-yellow-200";
        } else if (titleLower.includes("alert") || titleLower.includes("warning")) {
          iconClass = "fa-exclamation";
          iconBgClass = "bg-red-50 text-red-500 border border-red-100";
        } else if (titleLower.includes("success") || titleLower.includes("approved")) {
          iconClass = "fa-check";
          iconBgClass = "bg-green-50 text-green-600 border border-green-100";
        }

        // Unread styling
        const unreadStyles = !notif.is_read 
            ? "bg-slate-50/80 border-l-2 border-l-yellow-400" 
            : "bg-transparent border-l-2 border-l-transparent hover:bg-slate-50";

        // View Match Button (Styled)
        const matchLink = notif.match_id
          ? `<button class="view-match-btn mt-2.5 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-slate-800 transition-all shadow-sm hover:shadow-md group/btn">
               <span>View Analysis</span>
               <i class="fas fa-arrow-right text-[8px] group-hover/btn:translate-x-0.5 transition-transform text-yellow-400"></i>
             </button>`
          : '';

        const li = document.createElement("li");
        li.className = `group flex gap-4 p-5 transition-all duration-200 cursor-pointer border-b border-slate-100/50 last:border-0 ${unreadStyles}`;
        li.dataset.id = notif.notification_id;
        li.dataset.read = notif.is_read;

        li.innerHTML = `
          <div class="flex-shrink-0 pt-1">
            <div class="w-10 h-10 rounded-full flex items-center justify-center ${iconBgClass} shadow-sm group-hover:scale-110 transition-transform duration-300">
              <i class="fas ${iconClass} text-xs"></i>
            </div>
          </div>
          
          <div class="flex-1 min-w-0">
            <div class="flex justify-between items-start mb-1">
              <h4 class="text-sm font-bold text-slate-900 leading-tight ${!notif.is_read ? 'font-serif' : 'font-sans text-slate-700'}">
                ${notif.title}
              </h4>
              ${!notif.is_read ? '<span class="w-1.5 h-1.5 rounded-full bg-yellow-500 shadow-sm ml-2 flex-shrink-0 mt-1.5"></span>' : ''}
            </div>
            
            <p class="text-xs text-slate-500 leading-relaxed line-clamp-2">
              ${notif.message}
            </p>
            
            ${matchLink}
            
            <p class="text-[10px] font-bold text-slate-300 uppercase tracking-wider mt-2 group-hover:text-yellow-600/70 transition-colors flex items-center gap-1">
               <i class="far fa-clock text-[9px]"></i> ${formatTimeAgo(notif.created_at)}
            </p>
          </div>
        `;

        // Click Handler (Mark Read)
        li.addEventListener("click", (e) => {
          if (!e.target.closest('.view-match-btn')) {
            markAsRead(notif.notification_id, li);
          }
        });
 
        // Match Button Handler
        const viewMatchBtn = li.querySelector('.view-match-btn');
        if (viewMatchBtn) {
          viewMatchBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            window.location.href = `items.html?match_id=${notif.match_id}`;
          });
        }

        notificationsList.appendChild(li);
      });

    } catch (err) {
      console.error("Error fetching notifications:", err);
      // Premium Error State
      notificationsList.innerHTML = `
        <li class="p-8 text-center">
          <div class="inline-flex p-2 bg-red-50 rounded-full text-red-400 mb-2">
            <i class="fas fa-wifi"></i>
          </div>
          <p class="text-xs text-slate-500 font-medium">Connection interrupted</p>
          <button onclick="fetchLatestNotifications()" class="mt-2 text-xs font-bold text-slate-900 underline hover:text-yellow-600">Retry</button>
        </li>
      `;
    }
  }

  // ---------- Mark as read ----------
  async function markAsRead(id, element) {
    try {
      const res = await fetch(`${API_BASE}/${id}/read`, {
        method: "PATCH",
        headers: fetchOptions.headers
      });

      if (res.ok) {
        if (element) {
          // Visual update to "Read" state
          element.classList.remove('bg-slate-50/80', 'border-l-yellow-400');
          element.classList.add('bg-transparent', 'border-l-transparent');
          
          // Remove the yellow dot if it exists
          const dot = element.querySelector('.bg-yellow-500');
          if(dot) dot.remove();
          
          // Switch font to sans (read state)
          const title = element.querySelector('h4');
          if(title) title.classList.replace('font-serif', 'font-sans');
          if(title) title.classList.replace('text-slate-900', 'text-slate-700');
        }
        fetchUnreadCount(); // Refresh badge
      }
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  }

  // ---------- Mark all as read ----------
  async function markAllAsRead() {
    try {
      const res = await fetch(`${API_BASE}/mark_all_read`, {
        method: "PATCH",
        headers: fetchOptions.headers
      });

      if (res.ok) {
        // Fancy button feedback
        const originalText = markAllReadBtn.innerHTML;
        markAllReadBtn.innerHTML = '<i class="fas fa-check text-green-500"></i> Done';
        markAllReadBtn.classList.add('text-green-600', 'bg-green-50');
        
        setTimeout(() => {
          markAllReadBtn.innerHTML = originalText;
          markAllReadBtn.classList.remove('text-green-600', 'bg-green-50');
        }, 2000);

        fetchUnreadCount();
        fetchLatestNotifications();
      }
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  }

  // ---------- Format time ago ----------
  function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  // ---------- Dropdown toggle with Animation Logic ----------
  if(bellBtn && dropdown) {
      bellBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isHidden = dropdown.classList.contains("hidden");
        
        if (isHidden) {
          dropdown.classList.remove("hidden");
          // Animation Frame for smooth entrance
          requestAnimationFrame(() => {
             dropdown.classList.remove("opacity-0", "scale-95", "translate-y-[-10px]");
             dropdown.classList.add("opacity-100", "scale-100", "translate-y-0");
          });
          fetchLatestNotifications(); // Refresh data on open
        } else {
          closeDropdown();
        }
      });
  }

  function closeDropdown() {
      if(!dropdown) return;
      dropdown.classList.remove("opacity-100", "scale-100", "translate-y-0");
      dropdown.classList.add("opacity-0", "scale-95", "translate-y-[-10px]");
      
      // Wait for animation to finish before hiding
      setTimeout(() => {
          dropdown.classList.add("hidden");
      }, 200);
  }

  // ---------- Close dropdown outside click ----------
  document.addEventListener("click", (e) => {
    if (bellBtn && dropdown && !bellBtn.contains(e.target) && !dropdown.contains(e.target)) {
      closeDropdown();
    }
  });

  // ---------- Mark all read button ----------
  if(markAllReadBtn) {
      markAllReadBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        markAllAsRead();
      });
  }

  // ---------- Settings button ----------
  if(settingsBtn) {
      settingsBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        window.location.href = "notification-settings.html";
      });
  }

  // ---------- Initial load ----------
  fetchUnreadCount();
  // We don't load the list immediately to save resources, only when clicked or initially if you prefer
  // fetchLatestNotifications(); 

  // ---------- Auto-refresh ----------
  setInterval(fetchUnreadCount, 30000);
});