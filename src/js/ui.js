export const UI = {
    showToast(message, type = 'success', onClick = null) {
        const toastEl = document.getElementById('global-toast');
        if (!toastEl) return;
        
        // Use innerHTML instead of textContent to allow custom HTML markup (like a button/link badge)
        toastEl.innerHTML = `
            <div class="d-flex align-items-center justify-content-between w-100">
                <span>${message}</span>
                ${onClick ? `<span class="badge bg-white text-dark ms-2 px-2 py-1 shadow-sm fw-bold" style="font-size: 0.75rem;">View &rarr;</span>` : ''}
            </div>
        `;
        
        toastEl.className = `toast show align-items-center text-white bg-${type} border-0 shadow-lg p-2`;
        
        // Make cursor pointer if a click action is provided
        toastEl.style.cursor = onClick ? 'pointer' : 'default';

        // Clear previous click listeners to avoid stacking
        if (toastEl._clickListener) {
            toastEl.removeEventListener('click', toastEl._clickListener);
        }

        if (typeof onClick === 'function') {
            toastEl._clickListener = (e) => {
                onClick();
                toastEl.classList.remove('show');
            };
            toastEl.addEventListener('click', toastEl._clickListener);
        }

        if (toastEl._timeoutId) clearTimeout(toastEl._timeoutId);
        toastEl._timeoutId = setTimeout(() => {
            toastEl.classList.remove('show');
        }, 4000);
    }
};

window.UI = UI;
window.showToast = (message, type, onClick) => UI.showToast(message, type, onClick);