/**
 * Haryana Tools - Global Layout Injector & Cart Listener
 */

export const Layout = {
    async init() {
        console.log("🚀 Layout script initialized!");

        const partials = [
            { id: 'head-placeholder', file: 'src/partials/head.html' },
            { id: 'header-placeholder', file: 'src/partials/header.html' },
            { id: 'navbar-placeholder', file: 'src/partials/navbar.html' },
            { id: 'mega-menu-placeholder', file: 'src/partials/mega-menu.html' },
            { id: 'breadcrumb-placeholder', file: 'src/partials/breadcrumb.html' },
            { id: 'filters-placeholder', file: 'src/partials/filters.html' },
            { id: 'footer-placeholder', file: 'src/partials/footer.html' },
            { id: 'toast-placeholder', file: 'src/partials/toast.html' },
            { id: 'modal-placeholder', file: 'src/partials/modal.html' },
            { id: 'pagination-placeholder', file: 'src/partials/pagination.html' },
            { id: 'product-card-placeholder', file: 'src/partials/product-card.html' },
            { id: 'offcanvas-placeholder', file: 'src/partials/offcanvas.html' }
        ];

        for (const partial of partials) {
            const element = document.getElementById(partial.id);
            if (element) {
                try {
                    const response = await fetch(partial.file);
                    if (response.ok) {
                        element.innerHTML = await response.text();
                    }
                } catch (e) {
                    // Ignore missing partials silently
                }
            }
        }

        updateCartBadge();
    }
};

/**
 * ==========================================
 * GLOBAL ADD TO CART & CART BADGE HANDLER
 * ==========================================
 */
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.add-to-cart-btn');
    if (!btn) return;

    e.preventDefault();

    const product = {
        slug: btn.dataset.slug,
        name: btn.dataset.name,
        price: parseFloat(btn.dataset.price),
        image: btn.dataset.image,
        quantity: 1
    };

    if (!product.slug) {
        console.error('❌ Missing product slug on button!');
        return;
    }

    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existingIndex = cart.findIndex(item => item.slug === product.slug);

    if (existingIndex > -1) {
        cart[existingIndex].quantity += 1;
    } else {
        cart.push(product);
    }

    localStorage.setItem('cart', JSON.stringify(cart));

    try {
        if (window.UI && typeof window.UI.showToast === 'function') {
            window.UI.showToast(`✅ Added ${product.name} to cart!`, 'success');
        } else {
            console.log(`✅ Added ${product.name} to cart!`);
        }
    } catch (err) {
        console.log(`Added ${product.name} to cart.`);
    }

    updateCartBadge();
});

function updateCartBadge() {
    const badge = document.getElementById('cart-counter');
    if (badge) {
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
        badge.textContent = totalItems;
        badge.style.display = totalItems > 0 ? 'inline-block' : 'none';
    }
}

// Run immediately
Layout.init();