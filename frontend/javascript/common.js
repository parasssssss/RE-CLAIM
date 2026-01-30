// Common JavaScript for all dashboard pages
document.addEventListener('DOMContentLoaded', function() {
    // Highlight active page in sidebar
    const currentPage = window.location.pathname.split('/').pop();
    const sidebarLinks = document.querySelectorAll('#sidebar a');
    
    sidebarLinks.forEach(link => {
        const linkHref = link.getAttribute('href');
        if (linkHref === currentPage || 
            (currentPage === 'index.html' && linkHref === 'dashboard.html') ||
            (currentPage === 'dashboard.html' && linkHref === 'index.html')) {
            link.classList.add('sidebar-active', 'bg-gray-900', 'text-white');
            link.classList.remove('text-gray-700', 'hover:bg-gray-50');
            
            // Update icon color
            const icon = link.querySelector('svg');
            if (icon) {
                icon.classList.remove('text-gray-400');
                icon.classList.add('text-gray-300');
            }
        }
    });
    
    // Mobile sidebar toggle
    const toggleSidebarBtn = document.getElementById('toggleSidebar');
    const closeSidebarBtn = document.getElementById('closeSidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebar = document.getElementById('sidebar');
    
    if (toggleSidebarBtn) {
        toggleSidebarBtn.addEventListener('click', function() {
            sidebar.classList.add('active');
            sidebarOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }
    
    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener('click', closeSidebar);
    }
    
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeSidebar);
    }
    
    function closeSidebar() {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }
});


document.addEventListener("DOMContentLoaded", () => {
    redirectDashboardLink();
});

function redirectDashboardLink() {
    const dashboardLink = document.getElementById("sidebar-dashboard-link");
    const token = localStorage.getItem("token");

    // If the link or token doesn't exist, stop
    if (!dashboardLink || !token) return;

    try {
        // 1. Decode the JWT Token
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        const payload = JSON.parse(jsonPayload);

        // 2. Check Role ID (2 = Admin, 3 = Staff)
        // Adjust 'role_id' if your token uses a different key like 'role' or 'sub'
        if (payload.role_id === 2) {
            dashboardLink.href = "dashboard_admin.html";
        } else {
            dashboardLink.href = "dashboard_normie.html";
        }

    } catch (error) {
        console.error("Error decoding token for sidebar redirect:", error);
        // Fallback: send to landing if token is corrupt
        dashboardLink.href = "landing.html";
    }
}