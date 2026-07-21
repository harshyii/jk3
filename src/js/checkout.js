/**
 * Haryana Tools - Checkout Controller
 * Manages cart summary, item count badges, COD surcharges, free shipping rules, coupon integration, 
 * local storage order saving, Google Sheets logging (Code.gs handles emails & sheet logging), and WhatsApp direct trigger.
 */

import { API } from './api.js';
import { UI } from './ui.js';
import { Utils } from './utils.js';

const Checkout = {
    cart: [],
    subtotal: 0,
    shippingCost: 150, // Standard shipping if under ₹5,000
    finalAmount: 0,
    upiID: '9050623210@sbi',
    appliedDiscount: 0,
    couponCode: '',

    async init() {
        UI.setLoading(true);
        try {
            this.cart = API.getCart ? API.getCart() : JSON.parse(localStorage.getItem('cart') || '[]');
            
            this.calculateTotals();
            this.renderSummary();
            this.bindEvents();
        } catch (err) {
            console.error('❌ Error initializing checkout:', err);
        } finally {
            UI.setLoading(false);
        }
    },

    safeShowToast(message, type = 'info') {
        try {
            if (document.getElementById('toast-placeholder') && typeof UI.showToast === 'function') {
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
            const price = item.price || item.SalePrice || 0;
            const qty = item.quantity || item.qty || 1;
            return sum + (price * qty);
        }, 0);

        // Calculate effective subtotal after applying discount
        const effectiveSubtotal = Math.max(0, this.subtotal - this.appliedDiscount);

        // Free shipping rule: Above ₹5,000 is free (based on effective subtotal)
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

        // COD option adds 5% to total pricing (based on effective subtotal)
        if (paymentMethod === 'COD') {
            surcharge = Math.round(effectiveSubtotal * 0.05);
        }

        this.finalAmount = effectiveSubtotal + this.shippingCost + surcharge;

        // Update DOM elements
        const subtotalEl = document.getElementById('checkout-subtotal');
        if (subtotalEl) subtotalEl.textContent = Utils.formatCurrency(effectiveSubtotal);

        const shippingEl = document.getElementById('checkout-shipping');
        if (shippingEl) {
            shippingEl.textContent = this.shippingCost === 0 ? 'FREE' : Utils.formatCurrency(this.shippingCost);
        }

        const finalTotalEl = document.getElementById('final-total');
        if (finalTotalEl) finalTotalEl.textContent = Utils.formatCurrency(this.finalAmount);

        this.handlePaymentMethodChange(paymentMethod, surcharge);
    },

    handlePaymentMethodChange(method, codSurcharge) {
        let paymentExtraContainer = document.getElementById('payment-extra-container');
        
        if (!paymentExtraContainer) {
            const paymentCard = document.querySelector('input[name="paymentMethod"]')?.closest('.card');
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
                <div class="alert alert-warning small mb-0">
                    ℹ️ <strong>Cash on Delivery (COD) Fee:</strong> A 5% handling fee (${Utils.formatCurrency(codSurcharge)}) has been added to your order.
                </div>
            `;
            this.safeShowToast('COD selected: 5% surcharge added to total.', 'info');
        } else if (method === 'Online') {
            paymentExtraContainer.innerHTML = `
                <div class="text-center p-3 bg-white rounded border">
                    <p class="fw-semibold mb-2 text-dark">Scan & Pay via any UPI App</p>
                    <p class="small text-muted mb-2">Payee VPA: <strong>${this.upiID}</strong></p>
                    <div id="qrcode-container" class="d-flex justify-content-center my-3 bg-light p-2 rounded"></div>
                    <a href="upi://pay?pa=${this.upiID}&pn=Haryana%20Tools&am=${this.finalAmount}&cu=INR" class="btn btn-sm btn-success w-100 fw-bold">
                        📱 Open in Mobile UPI App
                    </a>
                </div>
            `;

            const qrBox = document.getElementById('qrcode-container');
            if (qrBox && window.QRCode) {
                qrBox.innerHTML = '';
                const upiString = `upi://pay?pa=${this.upiID}&pn=Haryana%20Tools&am=${this.finalAmount}&cu=INR`;
                new QRCode(qrBox, {
                    text: upiString,
                    width: 180,
                    height: 180,
                    colorDark: "#000000",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.H
                });
            } else if (qrBox) {
                qrBox.innerHTML = '<span class="text-danger small">QR Library (qrcode.min.js) not loaded.</span>';
            }

            this.safeShowToast('Online UPI payment selected. Scan QR or click mobile app button.', 'info');
        }
    },

    renderSummary() {
        const container = document.getElementById('checkout-items-list');
        if (!container) return;

        if (this.cart.length === 0) {
            container.innerHTML = '<p class="text-muted text-center py-3">Your cart is empty.</p>';
            return;
        }

        const totalItemsCount = this.cart.reduce((sum, item) => sum + (Number(item.quantity || item.qty) || 1), 0);

        let summaryCard = container.closest('.card');
        if (summaryCard) {
            let summaryHeader = summaryCard.querySelector('.order-summary-title');
            if (!summaryHeader) {
                summaryHeader = summaryCard.querySelector('h4');
                if (summaryHeader) {
                    summaryHeader.className = 'h5 fw-bold mb-3 border-bottom pb-2 d-flex justify-content-between align-items-center order-summary-title';
                }
            }
            if (summaryHeader) {
                summaryHeader.innerHTML = `
                    <span>Order Summary</span>
                    <span class="badge bg-primary rounded-pill fs-6">${totalItemsCount} ${totalItemsCount === 1 ? 'Item' : 'Items'}</span>
                `;
            }
        }

        container.innerHTML = this.cart.map(item => `
            <div class="d-flex align-items-center mb-3 pb-2 border-bottom">
                <img src="${item.image || item.Image || 'https://via.placeholder.com/50'}" alt="${item.name || item.Name}" style="width: 50px; height: 50px; object-fit: contain;" class="rounded bg-light p-1 me-3">
                <div class="flex-grow-1 overflow-hidden">
                    <h6 class="mb-0 text-truncate small fw-bold">${item.name || item.Name}</h6>
                    <small class="text-muted">Qty: ${item.quantity || item.qty || 1} • <span class="text-primary">${Utils.formatCurrency(item.price || item.SalePrice || 0)}</span></small>
                </div>
            </div>
        `).join('');
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
                        msgEl.className = 'small mb-3 text-success fw-semibold';
                        msgEl.textContent = '✅ Coupon applied: 10% off!';
                    }
                    this.safeShowToast('Coupon applied successfully!', 'success');
                } else {
                    this.appliedDiscount = 0;
                    this.couponCode = '';
                    if (msgEl) {
                        msgEl.className = 'small mb-3 text-danger fw-semibold';
                        msgEl.textContent = '❌ Invalid coupon code.';
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

                // 1. Save order locally for backup record
                const existingOrders = JSON.parse(localStorage.getItem('orders') || '[]');
                existingOrders.push(orderData);
                localStorage.setItem('orders', JSON.stringify(existingOrders));

                console.log('📦 Order Placed & Saved Locally:', orderData);
                this.safeShowToast('Processing your order...', 'info');

                // 2. TRIGGER: Send Order to Google Sheets via Web App (Code.gs handles database logging & Brevo email dispatch)
                const GOOGLE_SHEET_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyhxs13n-042usHoCU48cI-Y-Pzyg4SWdFWa0RnqC3S8_Ho6_lL7X35bRf-9Y8eAEkWnw/exec';

                try {
                    const response = await fetch(GOOGLE_SHEET_WEB_APP_URL, {
                        method: 'POST',
                        body: JSON.stringify(orderData)
                    });
                    if (response.ok) {
                        console.log('✅ Order successfully transmitted to Google Apps Script backend.');
                    } else {
                        console.error('❌ Failed to transmit order to Google Apps Script.');
                    }
                } catch (sheetError) {
                    console.error('❌ Network error communicating with Google Apps Script:', sheetError);
                }

                // 3. TRIGGER: WhatsApp Message Generation & Redirection to 9050623210
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
                localStorage.removeItem('cart');

                // Redirect and open WhatsApp after tasks conclude
                setTimeout(() => {
                    window.open(`https://wa.me/${adminWhatsAppNumber}?text=${whatsappMessageText}`, '_blank');
                    window.location.href = 'index.html';
                }, 1000);
            });
        }
    }
};

document.addEventListener('DOMContentLoaded', () => Checkout.init());