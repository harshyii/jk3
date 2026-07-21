/**
 * Haryana Tools - Utility Helpers
 * Reusable functions for formatting, validation, and common tasks.
 */

export const Utils = {
    // Format currency for India (INR)
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount || 0);
    },

    // Slugify a string for URL generation (Safely handles undefined/null)
    slugify(text) {
        if (!text) return '';
        
        return text.toString().toLowerCase()
            .replace(/\s+/g, '-')          // Replace spaces with -
            .replace(/[^\w\-]+/g, '')      // Remove all non-word chars
            .replace(/\-\-+/g, '-')        // Replace multiple - with single -
            .trim();
    },

    // Debounce to prevent excessive function calls (useful for search)
    debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    },

    // Lazy load images (standard browser feature, but helper helps with edge cases)
    lazyLoad() {
        const images = document.querySelectorAll('img[data-src]');
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    observer.unobserve(img);
                }
            });
        });
        images.forEach(img => observer.observe(img));
    },

    // Query String Parser
    getQueryParams() {
        return new URLSearchParams(window.location.search);
    }
};