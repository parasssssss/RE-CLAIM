        // Image upload preview functionality
        const imageInput = document.getElementById('image');
        const uploadArea = imageInput.closest('.upload-area');

        imageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const fileName = file.name;
                const fileSize = (file.size / 1024 / 1024).toFixed(2);
                uploadArea.innerHTML = `
                    <div class="flex items-center justify-center space-x-3">
                        <svg class="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <div class="text-left">
                            <p class="text-sm font-medium text-gray-900">${fileName}</p>
                            <p class="text-xs text-gray-500">${fileSize} MB</p>
                        </div>
                        <button type="button" onclick="resetUpload()" class="text-gray-400 hover:text-gray-600">
                            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                `;
            }
        });

        function resetUpload() {
            const imageInput = document.getElementById('image');
            const uploadArea = imageInput.closest('.upload-area');
            imageInput.value = '';
            uploadArea.innerHTML = `
                <input type="file" id="image" accept="image/*" class="hidden">
                <label for="image" class="cursor-pointer">
                    <svg class="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    <p class="text-sm text-gray-600 font-medium mb-1">Click to upload or drag and drop</p>
                    <p class="text-xs text-gray-500">PNG, JPG, WEBP up to 10MB</p>
                </label>
            `;
            // Re-attach event listener
            document.getElementById('image').addEventListener('change', arguments.callee);
        }



// report-item.js
document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("form");
    const imageInput = document.getElementById("image");

    // ------------------------
    // Handle form submission
    // ------------------------
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const formData = new FormData();

        // Collect values from form inputs
        formData.append("item_type", document.getElementById("itemType").value);
        formData.append("brand", document.getElementById("brand").value);
        formData.append("color", document.getElementById("color").value);
        formData.append("description", document.getElementById("description").value);
        formData.append("lost_at_location", document.getElementById("lostAt").value);

        // Add image if uploaded
        if (imageInput.files.length > 0) {
            formData.append("image", imageInput.files[0]);
        }

        // Optional: dynamically set status for staff/found items
        const statusInput = document.getElementById("status"); // hidden input in staff form
        if (statusInput) {
            formData.append("status", statusInput.value); // LOST or FOUND
        }

        try {
            const token = localStorage.getItem("token"); // JWT token
            const response = await fetch("http://127.0.0.1:8000/report-item", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                const errData = await response.json();
                let errMsg = "Something went wrong";
                if (Array.isArray(errData.detail)) {
                    errMsg = errData.detail.map(d => d.msg).join(", ");
                } else if (typeof errData.detail === "string") {
                    errMsg = errData.detail;
                }
                alert("Error: " + errMsg);
                return;
            }

            const data = await response.json();
            console.log("Item reported:", data);
            alert(`Item reported successfully! Item ID: ${data.item_id}`);
            form.reset(); // clear form fields
        } catch (err) {
            console.error("Error:", err);
            alert("Failed to report item. Check console for details.");
        }
    });

    // ------------------------
    // Optional: click upload area to open file selector
    // ------------------------
    const uploadArea = document.querySelector(".upload-area");
    if (uploadArea) {
        uploadArea.addEventListener("click", () => {
            imageInput.click();
        });
    }
});
