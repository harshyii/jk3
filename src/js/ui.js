export const UI = {
    showToast(message, type = 'success', onClick = null) {
        const toastEl = document.getElementById('global-toast');
        if (!toastEl) return;
        
        toastEl.textContent = message;
        toastEl.className = `toast show bg-${type} text-white shadow-lg`;
        
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
        }, 3000);
    }
};

window.UI = UI;
window.showToast = (message, type, onClick) => UI.showToast(message, type, onClick);