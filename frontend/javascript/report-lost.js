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
            
            /* Shake Animation */
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                20%, 40%, 60%, 80% { transform: translateX(5px); }
            }
            .animate-shake { animation: shake 0.6s ease-in-out; }

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
            toast.classList.replace('toast-enter', 'toast-exit');
            toast.addEventListener('animationend', () => toast.remove());
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
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
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
        button.innerHTML = button.dataset.originalHTML || 'Submit';
        button.disabled = false;
        button.classList.remove('opacity-75', 'cursor-not-allowed');
    }
};

/* ================= 4. MAIN LOGIC (IIFE) ================= */
(() => {
    const API_BASE_URL = "http://127.0.0.1:8000"; 
    
    // DOM Elements
    const form = document.getElementById("reportForm");
    const imageInput = document.getElementById("image");
    const uploadArea = document.querySelector(".upload-area");
    const submitBtn = document.querySelector("button[type='submit']");
    const charCount = document.getElementById("charCount");
    const descInput = document.getElementById("description");

    // Initialize
    document.addEventListener("DOMContentLoaded", async () => {
        await checkUserRoleAndAdjustUI();
        initializeImagePreview();
        initializeCharCount();
        initializeFormSubmission();
    });

    // --- A. User Role & UI Adjustment (Staff Logic) ---
    async function checkUserRoleAndAdjustUI() {
        const token = localStorage.getItem("token");
        if (!token) return; 

        try {
            const res = await fetch(`${API_BASE_URL}/users/me`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (res.ok) {
                const user = await res.json();
                
                // If Staff (Role ID 3)
                if (user.role_id === 3) {
                    console.log("Staff Mode Activated");
                    applyStaffUI();
                }
            }
        } catch (err) {
            console.error("Failed to fetch user role:", err);
        }
    }

    function applyStaffUI() {
        const setHtml = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
        const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };

        setText("sidebar-report-text", "Report Found Item");
        setText("page-title-text", "Report Found Item");
        setHtml("item-question-text", 'What did you find? <span class="text-red-500">*</span>');
        setHtml("location-label-text", 'Location Found <span class="text-red-500">*</span>');

        if (submitBtn) {
            submitBtn.innerHTML = `
                <span class="flex items-center justify-center">
                    <i class="fas fa-check-circle text-yellow-500 mr-2"></i> Submit Found Report
                </span>
            `;
            submitBtn.classList.remove("bg-gray-900", "hover:bg-gray-800");
            submitBtn.classList.add("bg-gray-800", "hover:bg-gray-700", "border", "border-yellow-500/30");
        }

        const helper = document.querySelector(".text-center p.text-\\[10px\\]");
        if (helper) helper.innerHTML = `<i class="fas fa-id-badge text-yellow-500"></i> Staff Entry • Priority Indexing`;
    }

    // --- B. Image Preview Logic ---
    function initializeImagePreview() {
        if (!imageInput || !uploadArea) return;

        // Create Preview Container (Dynamic)
        let previewContainer = document.getElementById("image-preview-container");
        if (!previewContainer) {
            previewContainer = document.createElement("div");
            previewContainer.id = "image-preview-container";
            previewContainer.className = "hidden mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200 flex items-center justify-between animate-entry shadow-sm";
            uploadArea.parentNode.insertBefore(previewContainer, uploadArea.nextSibling);
        }

        // Click Area triggers Input
        uploadArea.addEventListener("click", () => imageInput.click());

        // File Selection Change
        imageInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                // Validate Size (5MB limit)
                if (file.size > 5 * 1024 * 1024) {
                    ToastManager.show("File size too large. Max 5MB.", "error");
                    imageInput.value = "";
                    return;
                }

                const fileSize = (file.size / 1024 / 1024).toFixed(2);
                
                previewContainer.innerHTML = `
                    <div class="flex items-center space-x-3">
                        <div class="bg-white p-2.5 rounded-full shadow-sm border border-yellow-100">
                            <i class="fas fa-image text-yellow-500 text-lg"></i>
                        </div>
                        <div>
                            <p class="text-sm font-bold text-gray-900 truncate max-w-[180px]">${file.name}</p>
                            <p class="text-xs text-gray-500 font-medium">${fileSize} MB</p>
                        </div>
                    </div>
                    <button type="button" id="removeImageBtn" class="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-all">
                        <i class="fas fa-times"></i>
                    </button>
                `;

                uploadArea.classList.add("hidden");
                previewContainer.classList.remove("hidden");

                document.getElementById("removeImageBtn").addEventListener("click", () => {
                    imageInput.value = "";
                    uploadArea.classList.remove("hidden");
                    previewContainer.classList.add("hidden");
                });
            }
        });
    }

    // --- C. Character Count ---
    function initializeCharCount() {
        if (!descInput || !charCount) return;
        descInput.addEventListener("input", () => {
            const len = descInput.value.length;
            charCount.textContent = len;
            if (len > 450) charCount.className = "text-xs font-bold text-red-500 transition-colors";
            else charCount.className = "text-xs font-bold text-yellow-600 transition-colors";
        });
    }

    // --- D. Form Submission ---
    function initializeFormSubmission() {
        if (!form) return;

        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const token = localStorage.getItem("token");
            if (!token) {
                ToastManager.show("Session expired. Please login again.", "error");
                setTimeout(() => window.location.href = "login.html", 2000);
                return;
            }

            // 1. Loading State
            LoadingManager.show(submitBtn, "AI Analyzing...");

            // 2. Prepare Data (FIXED: Explicitly append fields by ID)
            const formData = new FormData();
            
            // We manually grab values by ID to ensure they are included 
            // even if the HTML 'name' attribute is missing.
            const getVal = (id) => {
                const el = document.getElementById(id);
                return el ? el.value : "";
            };

            formData.append("item_type", getVal("item_type"));
            formData.append("brand", getVal("brand")); // This fixes your brand error
            formData.append("color", getVal("color"));
            formData.append("description", getVal("description"));
            formData.append("lost_at_location", getVal("lost_at_location"));
            
            // Handle Image separately
            if (imageInput && imageInput.files[0]) {
                formData.append("image", imageInput.files[0]);
            }

            // Debug: Check what is actually being sent
            console.log("Submitting Payload:");
            for (let pair of formData.entries()) {
                console.log(pair[0] + ': ' + pair[1]);
            }

            try {
                // 3. API Request
                const response = await fetch(`${API_BASE_URL}/items/report-item`, {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${token}` },
                    body: formData
                });

                const data = await response.json();

                if (response.ok) {
                    // --- SUCCESS ---
                    ToastManager.show(data.message || "Item reported successfully!", "success");
                    
                    submitBtn.innerHTML = `
                        <span class="flex items-center justify-center text-green-100">
                            <i class="fas fa-check mr-2"></i> Success!
                        </span>
                    `;
                    submitBtn.classList.replace("bg-gray-900", "bg-green-600");
                    submitBtn.classList.replace("bg-gray-800", "bg-green-600");

                    setTimeout(() => window.location.href = "my-reports.html", 1500);

                } else {
                    // --- ERROR HANDLING ---
                    console.error("Backend Error:", data);

                    // Handle Pydantic Validation Errors (422)
                    if (response.status === 422 && Array.isArray(data.detail)) {
                        const firstError = data.detail[0];
                        const fieldName = firstError.loc[1] || "Field";
                        const errorMsg = firstError.msg;
                        ToastManager.show(`${fieldName}: ${errorMsg}`, "error");
                        
                        // Highlight the field (Try to find by ID first, then Name)
                        const inputField = document.getElementById(fieldName) || document.querySelector(`[name="${fieldName}"]`);
                        if(inputField) {
                            inputField.classList.add("border-red-500", "animate-shake");
                            setTimeout(()=> inputField.classList.remove("border-red-500", "animate-shake"), 2000);
                            inputField.focus();
                        }

                    } else {
                        ToastManager.show(data.detail || "Failed to submit report.", "error");
                    }
                    LoadingManager.hide(submitBtn);
                }

            } catch (err) {
                console.error("Network Error:", err);
                ToastManager.show("Server connection failed. Is the backend running?", "error");
                LoadingManager.hide(submitBtn);
            }
        });
    }

})();