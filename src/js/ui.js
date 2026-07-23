/**
 * Haryana Tools - UI Component Helpers
 * Simplifies interactions with Bootstrap 5 components.
 */

// Inside your ui.js file
export const UI = {
    showToast(message, type = 'success') {
        // Your toast display logic here...
        const toastEl = document.getElementById('global-toast');
        if (!toastEl) return;
        
        toastEl.textContent = message;
        toastEl.className = `toast show bg-${type} text-white`;
        
        setTimeout(() => {
            toastEl.classList.remove('show');
        }, 3000);
    }
};

// Expose it globally to prevent "is not defined" errors
window.UI = UI;
window.showToast = (message, type) => UI.showToast(message, type);