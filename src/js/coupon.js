/**
 * Haryana Tools - Coupon Validator
 * Manages promotional codes for B2B bulk discounts.
 */

import { UI } from './ui.js';

export const Coupon = {
    // In a real-world scenario, fetch these from a JSON file (e.g., /data/coupons.json)
    validCoupons: {
        'BULK10': 0.10, // 10% off
        'MAINTENANCE5': 0.05 // 5% off
    },

    apply(code) {
        const normalizedCode = code.toUpperCase().trim();
        
        if (this.validCoupons[normalizedCode]) {
            const discount = this.validCoupons[normalizedCode];
            localStorage.setItem('appliedCoupon', JSON.stringify({
                code: normalizedCode,
                discount: discount
            }));
            UI.showToast(`Coupon ${normalizedCode} applied!`, 'success');
            return discount;
        } else {
            UI.showToast('Invalid or expired coupon code.', 'danger');
            return 0;
        }
    },

    getDiscount() {
        const stored = localStorage.getItem('appliedCoupon');
        return stored ? JSON.parse(stored) : null;
    },

    clear() {
        localStorage.removeItem('appliedCoupon');
    }
};

window.Coupon = Coupon;