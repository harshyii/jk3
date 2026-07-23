/**
 * Haryana Tools - Checkout Controller
 * Fully converted to match cart.js keys, localStorage fallback (ht_cart and cart), and data structures.
 */

import { API } from './api.js';
import { UI } from './ui.js';
import { Utils } from './utils.js';

const Checkout = {
    cart: [],
    subtotal: 0,
    shippingCost: 150,
    finalAmount: 0,
    upiID: '9050623210@sbi',
    appliedDiscount: 0,
    couponCode: '',

    async init() {
        if (UI && typeof UI.setLoading === 'function') {
            UI.setLoading(true);
        }
        try {
            const rawCart = localStorage.getItem('ht_cart') || localStorage.getItem('cart') || '[]';
            this.cart = JSON.parse(rawCart);
            
            this.injectStyles();
            this.calculateTotals();
            this.renderSummary();
            this.bindEvents();

            const defaultMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'COD';
            this.handlePaymentMethodChange(defaultMethod, defaultMethod === 'COD' ? Math.round(Math.max(0, this.subtotal - this.appliedDiscount) * 0.05) : 0);
        } catch (err) {
            console.error('❌ Error initializing checkout:', err);
        } finally {
            if (UI && typeof UI.setLoading === 'function') {
                UI.setLoading(false);
            }
        }
    },

    injectStyles() {
        if (document.getElementById('ht-checkout-layout-fix')) return;
        const styleEl = document.createElement('style');
        styleEl.id = 'ht-checkout-layout-fix';
        styleEl.innerHTML = `
            #checkout-items-list {
                max-height: 1200px;
                width: 100%
                margin-left: auto
                overflow-y: auto;
                margin-right: auto
            }
            #checkout-items-list::-webkit-scrollbar {
                width: 4px;
            }
            #checkout-items-list::-webkit-scrollbar-thumb {
                background: #cbd5e1;
                border-radius: 4px;
            }
            main.container {
                max-width: 1200px !important;
                width: 100% !important;
                margin-left: auto !important;
                margin-right: auto !important;
            }
        `;
        document.head.appendChild(styleEl);
    },

    safeShowToast(message, type = 'info') {
        try {
            if (UI && typeof UI.showToast === 'function') {
                UI.showToast(message, type);
            } else {
                console.log(`[Toast ${type}]: ${message}`);
            }
        } catch (e) {
            console.warn('Toast display skipped:', message);
        }
    },

    calculateTotals() {
        this.subtotal = this.cart.reduce((sum, item) => {
            const price = parseFloat(item.price || item.SalePrice || item.MRP || 0);
            const qty = parseInt(item.quantity || item.qty || 1, 10);
            return sum + (price * qty);
        }, 0);

        const effectiveSubtotal = Math.max(0, this.subtotal - this.appliedDiscount);

        if (effectiveSubtotal > 5000) {
            this.shippingCost = 0;
        } else {
            this.shippingCost = effectiveSubtotal > 0 ? 150 : 0;
        }

        this.updateFinalTotal();
    },

    updateFinalTotal() {
        const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'COD';
        let surcharge = 0;
        const effectiveSubtotal = Math.max(0, this.subtotal - this.appliedDiscount);

        if (paymentMethod === 'COD') {
            surcharge = Math.round(effectiveSubtotal * 0.05);
        }

        this.finalAmount = effectiveSubtotal + this.shippingCost + surcharge;

        const subtotalEl = document.getElementById('checkout-subtotal');
        if (subtotalEl) subtotalEl.textContent = Utils.formatCurrency ? Utils.formatCurrency(effectiveSubtotal) : '₹' + effectiveSubtotal;

        const shippingEl = document.getElementById('checkout-shipping');
        if (shippingEl) {
            shippingEl.textContent = this.shippingCost === 0 ? 'FREE' : (Utils.formatCurrency ? Utils.formatCurrency(this.shippingCost) : '₹' + this.shippingCost);
        }

        const finalTotalEl = document.getElementById('final-total');
        if (finalTotalEl) finalTotalEl.textContent = Utils.formatCurrency ? Utils.formatCurrency(this.finalAmount) : '₹' + this.finalAmount;

        this.handlePaymentMethodChange(paymentMethod, surcharge);
    },

    handlePaymentMethodChange(method, codSurcharge) {
        let paymentExtraContainer = document.getElementById('payment-extra-container');
        
        if (!paymentExtraContainer) {
            const activeRadio = document.querySelector('input[name="paymentMethod"]:checked');
            const paymentCard = activeRadio ? activeRadio.closest('.card') : document.querySelector('.payment-methods-card') || document.querySelector('form');
            if (paymentCard) {
                paymentExtraContainer = document.createElement('div');
                paymentExtraContainer.id = 'payment-extra-container';
                paymentExtraContainer.className = 'mt-3 pt-3 border-top';
                paymentCard.appendChild(paymentExtraContainer);
            }
        }

        if (!paymentExtraContainer) return;

        if (method === 'COD') {
            paymentExtraContainer.innerHTML = `
                <div class="alert alert-warning small mb-0 rounded-3 border-0 shadow-sm bg-light-warning">
                    <div class="d-flex align-items-center">
                        <i class="bi bi-info-circle-fill text-warning fs-5 me-2"></i>
                        <div>
                            <strong>COD Fee:</strong> A 5% handling surcharge (${Utils.formatCurrency ? Utils.formatCurrency(codSurcharge) : '₹' + codSurcharge}) applies.
                        </div>
                    </div>
                </div>
            `;
        } else if (method === 'Online') {
            const currentAmount = this.finalAmount;
            const upiString = `upi://pay?pa=${this.upiID}&pn=Haryana%20Tools&am=${currentAmount}&cu=INR`;

            paymentExtraContainer.innerHTML = `
                <div class="text-center p-3 bg-white rounded-3 border shadow-sm mt-3">
                    <div class="badge bg-success-subtle text-success border border-success-subtle mb-2 px-3 py-1 rounded-pill fw-semibold">Instant UPI Payment</div>
                    <p class="fw-bold mb-1 text-dark small">Scan & Pay via any UPI App</p>
                    <p class="text-muted mb-2" style="font-size: 0.8rem;">Payee VPA: <strong class="text-dark">${this.upiID}</strong></p>
                    <div id="qrcode-container" class="d-flex justify-content-center my-2 bg-light p-2 rounded-3 border" style="min-height: 150px; align-items: center; justify-content: center;"></div>
                    <a href="${upiString}" class="btn btn-sm btn-success w-100 py-2 fw-bold shadow-sm">
                        <i class="bi bi-phone me-1"></i> Open in Mobile UPI App
                    </a>
                </div>
            `;

            setTimeout(() => {
                const qrBox = document.getElementById('qrcode-container');
                if (!qrBox) return;
                qrBox.innerHTML = '';

                try {
                    if (window.QRCode) {
                        if (typeof window.QRCode === 'function') {
                            new window.QRCode(qrBox, {
                                text: upiString,
                                width: 140,
                                height: 140,
                                colorDark: "#000000",
                                colorLight: "#ffffff",
                                correctLevel: window.QRCode.CorrectLevel ? window.QRCode.CorrectLevel.H : 1
                            });
                        } else {
                            qrBox.innerHTML = `<a href="${upiString}" class="btn btn-outline-success btn-sm">Pay ₹${currentAmount} via UPI</a>`;
                        }
                    } else {
                        qrBox.innerHTML = `
                            <div class="text-danger small p-2">
                                <p class="mb-1 fw-bold">QR Library missing.</p>
                                <a href="${upiString}" class="btn btn-outline-success btn-sm mt-1">Pay ₹${currentAmount}</a>
                            </div>
                        `;
                    }
                } catch (qrErr) {
                    console.error('QR Generation error:', qrErr);
                    qrBox.innerHTML = `<a href="${upiString}" class="btn btn-outline-success btn-sm">Pay ₹${currentAmount} via UPI</a>`;
                }
            }, 50);
        }
    },

    renderSummary() {
        const container = document.getElementById('checkout-items-list');
        if (!container) return;

        if (this.cart.length === 0) {
            container.innerHTML = `
                <div class="text-center py-3">
                    <div class="fs-3 mb-1 text-muted">🛒</div>
                    <p class="text-muted small mb-2">Your cart is currently empty.</p>
                    <a href="index.html" class="btn btn-sm btn-outline-primary px-3 fw-bold">Browse Catalog</a>
                </div>
            `;
            return;
        }

        const totalItemsCount = this.cart.reduce((sum, item) => sum + (Number(item.quantity || item.qty) || 1), 0);

        let summaryCard = container.closest('.card');
        if (summaryCard) {
            let summaryHeader = summaryCard.querySelector('h5');
            if (summaryHeader) {
                summaryHeader.className = 'h5 fw-bold mb-3 border-bottom pb-2 text-dark d-flex justify-content-between align-items-center';
                summaryHeader.innerHTML = `
                    <span>Order Summary</span>
                    <span class="badge bg-primary rounded-pill px-2 py-1 fw-semibold" style="font-size: 0.75rem;">${totalItemsCount} ${totalItemsCount === 1 ? 'Item' : 'Items'}</span>
                `;
            }
        }

        container.innerHTML = this.cart.map(item => {
            const itemPrice = parseFloat(item.price || item.SalePrice || item.MRP || 0);
            const itemQty = parseInt(item.quantity || item.qty || 1, 10);
            const itemImage = item.image || item.Image || 'src/images/placeholder.jpg';
            const itemName = item.name || item.Name || 'Industrial Product';

            return `
                <div class="d-flex align-items-center mb-2 pb-2 border-bottom position-relative">
                    <div class="flex-shrink-0 bg-light rounded-1 border p-1 me-2" style="width: 45px; height: 45px; display: flex; align-items: center; justify-content: center;">
                        <img src="${itemImage}" alt="${itemName}" style="max-width: 100%; max-height: 100%; object-fit: contain;" onerror="this.src='src/images/placeholder.jpg'">
                    </div>
                    <div class="flex-grow-1 overflow-hidden pe-1">
                        <h6 class="mb-0 text-truncate fw-bold text-dark" title="${itemName}" style="font-size: 0.82rem;">${itemName}</h6>
                        <div class="d-flex justify-content-between align-items-center mt-1">
                            <span class="text-muted" style="font-size: 0.75rem;">Qty: <strong class="text-dark">${itemQty}</strong></span>
                            <span class="text-primary fw-semibold" style="font-size: 0.82rem;">${Utils.formatCurrency ? Utils.formatCurrency(itemPrice * itemQty) : '₹' + (itemPrice * itemQty)}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    bindEvents() {
        const paymentRadios = document.querySelectorAll('input[name="paymentMethod"]');
        paymentRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                this.updateFinalTotal();
            });
        });

        const applyCouponBtn = document.getElementById('apply-coupon-btn');
        if (applyCouponBtn) {
            applyCouponBtn.addEventListener('click', () => {
                const codeInput = document.getElementById('coupon-code-input')?.value.trim().toUpperCase() || '';
                const msgEl = document.getElementById('coupon-message');

                if (codeInput === 'HARYANA10') {
                    this.appliedDiscount = Math.round(this.subtotal * 0.10);
                    this.couponCode = codeInput;
                    if (msgEl) {
                        msgEl.className = 'small mt-1 mb-0 text-success fw-semibold d-block';
                        msgEl.textContent = '✅ 10% discount applied!';
                    }
                    this.safeShowToast('Coupon applied successfully!', 'success');
                } else {
                    this.appliedDiscount = 0;
                    this.couponCode = '';
                    if (msgEl) {
                        msgEl.className = 'small mt-1 mb-0 text-danger fw-semibold d-block';
                        msgEl.textContent = '❌ Invalid code. Try "HARYANA10".';
                    }
                    this.safeShowToast('Invalid coupon code.', 'error');
                }
                this.calculateTotals();
            });
        }

        const checkoutForm = document.getElementById('checkout-form');
        if (checkoutForm) {
            checkoutForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                if (this.cart.length === 0) {
                    alert('Your cart is empty!');
                    return;
                }

                const orderData = {
                    fullName: document.getElementById('full-name')?.value,
                    phone: document.getElementById('phone')?.value,
                    email: document.getElementById('email')?.value || '',
                    address: document.getElementById('address')?.value,
                    city: document.getElementById('city')?.value,
                    pincode: document.getElementById('pincode')?.value,
                    state: document.getElementById('state')?.value,
                    paymentMethod: document.querySelector('input[name="paymentMethod"]:checked')?.value,
                    items: this.cart,
                    subtotal: this.subtotal,
                    discountAmount: this.appliedDiscount,
                    couponCode: this.couponCode,
                    shippingCost: this.shippingCost,
                    totalAmount: this.finalAmount,
                    date: new Date().toISOString()
                };

                const existingOrders = JSON.parse(localStorage.getItem('ht_orders') || localStorage.getItem('orders') || '[]');
                existingOrders.push(orderData);
                localStorage.setItem('ht_orders', JSON.stringify(existingOrders));
                localStorage.setItem('orders', JSON.stringify(existingOrders));

                this.safeShowToast('Processing your order securely...', 'info');

                const GOOGLE_SHEET_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyoaezPkHnSTJMbGD2yW5wMOypGIj6XPtWGLRDJ_X7BVDaM3eB3EyvlV4_0lUrkPtlkJw/exec';

                try {
                    await fetch(GOOGLE_SHEET_WEB_APP_URL, {
                        method: 'POST',
                        body: JSON.stringify(orderData)
                    });
                } catch (sheetError) {
                    console.error('❌ Network error communicating with Google Apps Script:', sheetError);
                }

                const adminWhatsAppNumber = '919050623210';
                const whatsappMessageText = encodeURIComponent(
                    `*New Order Placed! 🛒*\n\n` +
                    `*Name:* ${orderData.fullName}\n` +
                    `*Phone:* ${orderData.phone}\n` +
                    `*Address:* ${orderData.address}, ${orderData.city} - ${orderData.pincode} (${orderData.state})\n` +
                    `*Payment:* ${orderData.paymentMethod}\n` +
                    `*Total Amount:* ₹${orderData.totalAmount}\n\n` +
                    `*Items:*\n${orderData.items.map(i => `• ${i.name || i.Name} (Qty: ${i.quantity || i.qty || 1})`).join('\n')}`
                );

                this.safeShowToast('Order placed successfully! Redirecting...', 'success');
                localStorage.removeItem('ht_cart');
                localStorage.removeItem('cart');

                setTimeout(() => {
                    window.open(`https://wa.me/${adminWhatsAppNumber}?text=${whatsappMessageText}`, '_blank');
                    window.location.href = 'index.html';
                }, 1000);
            });
        }
    }
};

document.addEventListener('DOMContentLoaded', () => Checkout.init());