export const ContactController = {
    init() {
        const partnershipForm = document.getElementById('partnership-form');
        const careForm = document.getElementById('care-form');

        // Replace with your actual deployed Google Apps Script Web App URL
        const scriptURL = 'https://script.google.com/macros/s/AKfycbxvncEe56fEMSjYhllVQZ-5sHJFzDUGql-NATYHFbJoH6Xr7ZA8HCRNCzP321h47Pmb/exec';

        if (partnershipForm) {
            partnershipForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const formData = {
                    formType: 'Partnership Inquiry',
                    name: document.getElementById('partner-name').value,
                    email: document.getElementById('partner-email').value,
                    phone: document.getElementById('partner-phone').value,
                    typeOrOrder: document.getElementById('partner-type').value,
                    subject: 'Partnership Proposal',
                    message: document.getElementById('partner-message').value,
                    timestamp: new Date().toISOString()
                };

                this.submitToGoogleSheets(scriptURL, formData, partnershipForm, 'Partnership request submitted successfully!');
            });
        }

        if (careForm) {
            careForm.addEventListener('submit', (e) => {
                e.preventDefault();

                const formData = {
                    formType: 'Customer Care Ticket',
                    name: document.getElementById('care-name').value,
                    email: 'N/A (Care Form)',
                    phone: document.getElementById('care-order').value ? `Order ID: ${document.getElementById('care-order').value}` : 'N/A',
                    typeOrOrder: document.getElementById('care-order').value || 'None',
                    subject: document.getElementById('care-issue').value,
                    message: document.getElementById('care-message').value,
                    timestamp: new Date().toISOString()
                };

                this.submitToGoogleSheets(scriptURL, formData, careForm, 'Support ticket submitted successfully!');
            });
        }
    },

    submitToGoogleSheets(url, data, formElement, successMessage) {
        if (url.includes('YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE')) {
            console.warn('⚠️ Google Apps Script URL not configured.');
            this.showNotification(successMessage, 'success');
            formElement.reset();
            return;
        }

        const submitBtn = formElement.querySelector('button[type="submit"]');
        const originalText = submitBtn ? submitBtn.innerHTML : '';
        
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Submitting...';
        }

        fetch(url, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(() => {
            this.showNotification(successMessage, 'success');
            formElement.reset();
        })
        .catch(error => {
            console.error('❌ Error submitting form data:', error);
            this.showNotification('Submission failed. Please try again later.', 'error');
        })
        .finally(() => {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    },

    showNotification(message, type = 'success') {
        if (window.UI && typeof window.UI.showToast === 'function') {
            window.UI.showToast(message, type);
        } else {
            alert(message);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => ContactController.init());