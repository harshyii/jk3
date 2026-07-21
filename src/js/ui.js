/**
 * Haryana Tools - UI Component Helpers
 * Simplifies interactions with Bootstrap 5 components.
 */

export const UI = {
    // Show a toast notification
    showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container');
        const toastEl = document.createElement('div');
        toastEl.className = `toast align-items-center text-white bg-${type} border-0 show`;
        toastEl.role = 'alert';
        toastEl.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        toastContainer.appendChild(toastEl);
        setTimeout(() => toastEl.remove(), 3000);
    },

    // Toggle offcanvas menu programmatically
    toggleOffcanvas(id) {
        const offcanvasEl = document.getElementById(id);
        const offcanvas = bootstrap.Offcanvas.getInstance(offcanvasEl) || new bootstrap.Offcanvas(offcanvasEl);
        offcanvas.toggle();
    },

    // Set page title and update breadcrumbs
    setPageMeta(title, breadcrumbs = []) {
        document.title = `${title} | Haryana Tools`;
        const breadcrumbEl = document.getElementById('breadcrumb-list');
        if (breadcrumbEl) {
            breadcrumbEl.innerHTML = breadcrumbs.map(b => 
                `<li class="breadcrumb-item"><a href="${b.url}">${b.text}</a></li>`
            ).join('');
        }
    },

    // Show loading spinner
    setLoading(isLoading) {
        const loader = document.getElementById('global-loader');
        if (loader) loader.style.display = isLoading ? 'block' : 'none';
    }
};