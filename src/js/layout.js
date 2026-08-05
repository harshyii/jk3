export const Layout = {
    async init() {
        console.log("🚀 Layout script initialized!");
        
        const partials = [
            { id: 'head-placeholder', file: '../src/partials/head.html' },
            { id: 'header-placeholder', file: '../src/partials/header.html' },
            { id: 'navbar-placeholder', file: '../src/partials/navbar.html' },
            { id: 'mega-menu-placeholder', file: '../src/partials/mega-menu.html' },
            { id: 'breadcrumb-placeholder', file: '../src/partials/breadcrumb.html' },
            { id: 'filters-placeholder', file: '../src/partials/filters.html' },
            { id: 'footer-placeholder', file: '../src/partials/footer.html' },
            { id: 'toast-placeholder', file: '../src/partials/toast.html' },
            { id: 'modal-placeholder', file: '../src/partials/modal.html' },
            { id: 'product-card-placeholder', file: '../src/partials/product-card.html' },
            { id: 'offcanvas-placeholder', file: 'src/partials/offcanvas.html' }
        ];

        for (const partial of partials) {
            const element = document.getElementById(partial.id);
            if (element) {
                try {
                    const response = await fetch(partial.file);
                    if (response.ok) {
                        let htmlContent = await response.text();
                        htmlContent = htmlContent
                            .replace(/class="([^"]*\b)container(\b[^"]*)"/g, 'class="$1container-fluid$2"')
                            .replace(/class="([^"]*\b)container-md(\b[^"]*)"/g, 'class="$1container-fluid$2"')
                            .replace(/class="([^"]*\b)container-lg(\b[^"]*)"/g, 'class="$1container-fluid$2"');
                        element.innerHTML = htmlContent;
                    }
                } catch (e) {
                    console.warn(`⚠️ Failed to load partial: ${partial.file}`, e);
                }
            }
        }

        // 👉 FIX: Re-initialize Bootstrap dropdowns and interactive components after injection
        if (typeof bootstrap !== 'undefined') {
            document.querySelectorAll('[data-bs-toggle="dropdown"]').forEach(dropdownEl => {
                new bootstrap.Dropdown(dropdownEl);
            });
            document.querySelectorAll('[data-bs-toggle="collapse"]').forEach(collapseEl => {
                new bootstrap.Collapse(collapseEl, { toggle: false });
            });
        }

        updateCartBadge();
        
        // Initialize dynamic SEO fallback checks after partials are rendered
        updateDynamicSEO();
        setTimeout(updateDynamicSEO, 600);
    }
};

// Global Add-To-Cart Event Listener
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.add-to-cart-btn');
    if (!btn) return;
    e.preventDefault();

    const product = {
        slug: btn.dataset.slug,
        name: btn.dataset.name,
        price: parseFloat(btn.dataset.price) || 0,
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

// Update Cart Badge Counter Element
function updateCartBadge() {
    const badge = document.getElementById('cart-counter');
    if (badge) {
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
        badge.textContent = totalItems;
        badge.style.display = totalItems > 0 ? 'inline-block' : 'none';
    }
}

// Dynamic SEO Fallback Injector to fix missing Title and Meta Description issues in audits
function updateDynamicSEO() {
    let pageTitle = document.title;
    let metaDesc = document.querySelector('meta[name="description"]');

    if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.name = 'description';
        document.head.appendChild(metaDesc);
    }

    const h1 = document.querySelector('h1');
    if (!pageTitle || pageTitle === "" || pageTitle.includes("Document") || pageTitle.includes("404")) {
        if (h1 && h1.textContent) {
            document.title = `${h1.textContent.trim()} | Herbal Store`;
        }
    }

    if (!metaDesc.getAttribute('content') || metaDesc.getAttribute('content').trim() === "") {
        const firstParagraph = document.querySelector('p');
        if (firstParagraph && firstParagraph.textContent) {
            metaDesc.setAttribute('content', firstParagraph.textContent.trim().substring(0, 150));
        } else {
            metaDesc.setAttribute('content', "Explore high quality products, organic selections, and expert guides at Herbal Store.");
        }
    }
}

// Integration update for affiliates tracking notification
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    
    if (refCode) {
        localStorage.setItem('ht_affiliate_ref', refCode);
        localStorage.setItem('ht_affiliate_expiry', new Date().getTime() + (30 * 24 * 60 * 60 * 1000));
        
        // Trigger a nice UI toast notifying the user of the referral partner tracking
        setTimeout(() => {
            if (window.UI && typeof window.UI.showToast === 'function') {
                window.UI.showToast(`Partner referral active (${refCode})`, 'success');
            }
        }, 600);
    }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('Service Worker registered successfully:', reg.scope))
      .catch((err) => console.error('Service Worker registration failed:', err));
  });
}

// Automatically trigger layout initialization on script load
Layout.init();