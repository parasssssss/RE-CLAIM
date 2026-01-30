// Enhanced Notifications JavaScript
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
  // ✅ Re-inject the HTML structure to keep the styling
  badge.innerHTML = `
    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
    <span class="relative inline-flex rounded-full h-5 w-5 bg-gradient-to-r from-red-500 to-pink-600 text-[10px] text-white items-center justify-center font-bold shadow-md ring-2 ring-white">
      ${data.count}
    </span>
  `;
  badge.classList.remove("hidden");
  // ...
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
      loadingElement.classList.remove("hidden");
      const res = await fetch(`${API_BASE}/latest?limit=${limit}`, fetchOptions);
      if (!res.ok) throw new Error("Failed to fetch notifications");
      const notifications = await res.json();
      loadingElement.classList.add("hidden");

      notificationsList.innerHTML = "";

      if (notifications.length === 0) {
        notificationsList.innerHTML = `
          <li class="notification-empty">
            <div class="notification-empty-icon">
              <i class="fas fa-bell-slash"></i>
            </div>
            <h4 class="font-semibold text-gray-700 mb-2">No notifications yet</h4>
            <p class="text-sm text-gray-500">We'll notify you when something arrives</p>
          </li>
        `;
        return;
      }

      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();

      notifications.forEach((notif) => {
        const notificationDate = new Date(notif.created_at);
        let dateLabel = "";
        if (notificationDate.toDateString() === today) dateLabel = "Today";
        else if (notificationDate.toDateString() === yesterday) dateLabel = "Yesterday";
        else dateLabel = notificationDate.toLocaleDateString();

        const li = document.createElement("li");
        li.className = `notification-item ${notif.is_read ? '' : 'unread'}`;
        li.dataset.id = notif.notification_id;
        li.dataset.read = notif.is_read;

        // Icon logic
        let icon = "fa-info-circle";
        let iconColor = "text-blue-500";
        if (notif.title?.toLowerCase().includes("match")) {
          icon = "fa-handshake";
          iconColor = "text-green-500";
        } else if (notif.title?.toLowerCase().includes("alert")) {
          icon = "fa-exclamation-triangle";
          iconColor = "text-yellow-500";
        } else if (notif.title?.toLowerCase().includes("success")) {
          icon = "fa-check-circle";
          iconColor = "text-green-500";
        }

        // Match link button
        const matchLink = notif.match_id
          ? `<button class="notification-action-btn view-match-btn mt-2 inline-flex items-center px-3 py-1 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500 text-white text-sm font-medium hover:opacity-90 transition">
              <i class="fas fa-link mr-1"></i> View Match
             </button>`
          : '';

        li.innerHTML = `
          <div class="flex items-start relative">
            <div class="flex-shrink-0 mr-4 mt-1">
              <div class="w-10 h-10 rounded-xl ${iconColor} bg-gradient-to-br ${iconColor.replace('text-', 'bg-')}/10 flex items-center justify-center">
                <i class="fas ${icon}"></i>
              </div>
            </div>
            <div class="flex-1">
              <div class="flex justify-between items-start">
                <h4 class="font-bold text-gray-900 mb-1">${notif.title}</h4>
                <span class="text-xs text-gray-400 ml-2">${formatTimeAgo(notif.created_at)}</span>
              </div>
              <p class="text-gray-600 mb-2">${notif.message}</p>
              ${matchLink}
              <div class="notification-time text-xs text-gray-400 mt-1">
                <i class="far fa-clock mr-1"></i> ${dateLabel} • ${notificationDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </div>
            </div>
            ${notif.is_read ? '' : '<div class="w-2 h-2 rounded-full bg-purple-500 ml-2 mt-3"></div>'}
          </div>
        `;

        // Mark as read on click
        li.addEventListener("click", (e) => {
          if (!e.target.closest('.view-match-btn')) {
            markAsRead(notif.notification_id, li);
          }
        });
 
        // View Match button click
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
      loadingElement.innerHTML = `
        <div class="flex flex-col items-center justify-center py-8">
          <div class="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <i class="fas fa-exclamation-triangle text-red-500 text-xl"></i>
          </div>
          <p class="text-gray-700 font-medium mb-2">Failed to load notifications</p>
          <button onclick="fetchLatestNotifications()" class="text-sm text-purple-600 hover:text-purple-700 font-medium">
            <i class="fas fa-redo mr-1"></i> Retry
          </button>
        </div>
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
          element.classList.remove('unread');
          element.dataset.read = true;
          element.querySelector('.bg-purple-500')?.remove();
        }
        fetchUnreadCount();
        fetchLatestNotifications();
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
        const originalText = markAllReadBtn.innerHTML;
        markAllReadBtn.innerHTML = '<i class="fas fa-check mr-2"></i>Marked all!';
        markAllReadBtn.classList.add('text-green-600');
        setTimeout(() => {
          markAllReadBtn.innerHTML = originalText;
          markAllReadBtn.classList.remove('text-green-600');
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

  // ---------- Dropdown toggle ----------
  bellBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("hidden");
    if (!dropdown.classList.contains("hidden")) {
      dropdown.classList.add("animate-slide-down");
      setTimeout(() => dropdown.classList.remove("animate-slide-down"), 300);
    }
  });

  // ---------- Close dropdown outside click ----------
  document.addEventListener("click", (e) => {
    if (!bellBtn.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.add("hidden");
    }
  });

  // ---------- Mark all read button ----------
  markAllReadBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    markAllAsRead();
  });

  // ---------- Settings button ----------
  settingsBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    window.location.href = "notification-settings.html";
  });

  // ---------- Initial load ----------
  fetchUnreadCount();
  fetchLatestNotifications();

  // ---------- Auto-refresh ----------
  setInterval(fetchUnreadCount, 30000);
  setInterval(fetchLatestNotifications, 60000);
});
