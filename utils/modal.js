// Modal utility for replacing native alert, confirm, and prompt dialogs

export class Modal {
    /**
     * Shows an alert modal
     * @param {string} message - Message to display
     * @returns {Promise<void>}
     */
    static alert(message) {
        return new Promise((resolve) => {
            const backdrop = this.createModal('alert', message, null);
            const okBtn = backdrop.querySelector('.modal-btn-primary');
            
            if (!okBtn) {
                console.error('Modal: OK button not found in alert modal');
                resolve();
                return;
            }
            
            okBtn.addEventListener('click', () => {
                this.closeModal(backdrop);
                resolve();
            });
            document.body.appendChild(backdrop);
            // Focus the OK button
            setTimeout(() => okBtn.focus(), 100);
        });
    }
    
    /**
     * Shows a confirm modal
     * @param {string} message - Message to display
     * @returns {Promise<boolean>} - Returns true if OK clicked, false if Cancel clicked
     */
    static confirm(message) {
        return new Promise((resolve) => {
            const backdrop = this.createModal('confirm', message, null);
            const okBtn = backdrop.querySelector('.modal-btn-primary');
            const cancelBtn = backdrop.querySelector('.modal-btn-secondary');
            
            if (!okBtn || !cancelBtn) {
                console.error('Modal: Buttons not found in confirm modal');
                resolve(false);
                return;
            }
            
            okBtn.addEventListener('click', () => {
                this.closeModal(backdrop);
                resolve(true);
            });
            
            cancelBtn.addEventListener('click', () => {
                this.closeModal(backdrop);
                resolve(false);
            });
            
            // Close on backdrop click (backdrop is the element itself)
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) {
                    this.closeModal(backdrop);
                    resolve(false);
                }
            });
            
            document.body.appendChild(backdrop);
            setTimeout(() => okBtn.focus(), 100);
        });
    }
    
    /**
     * Shows a prompt modal
     * @param {string} message - Message to display
     * @param {string} defaultValue - Default input value
     * @returns {Promise<string|null>} - Returns input value if OK clicked, null if Cancel clicked
     */
    static prompt(message, defaultValue = '') {
        return new Promise((resolve) => {
            const backdrop = this.createModal('prompt', message, defaultValue);
            const input = backdrop.querySelector('.modal-input');
            const okBtn = backdrop.querySelector('.modal-btn-primary');
            const cancelBtn = backdrop.querySelector('.modal-btn-secondary');
            
            if (!input || !okBtn || !cancelBtn) {
                console.error('Modal: Required elements not found in prompt modal', {
                    input: !!input,
                    okBtn: !!okBtn,
                    cancelBtn: !!cancelBtn,
                    backdrop: !!backdrop
                });
                resolve(null);
                return;
            }
            
            const handleOk = () => {
                const value = input.value;
                this.closeModal(backdrop);
                resolve(value);
            };
            
            const handleCancel = () => {
                this.closeModal(backdrop);
                resolve(null);
            };
            
            okBtn.addEventListener('click', handleOk);
            cancelBtn.addEventListener('click', handleCancel);
            
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleOk();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    handleCancel();
                }
            });
            
            // Close on backdrop click (backdrop is the element itself)
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) {
                    handleCancel();
                }
            });
            
            document.body.appendChild(backdrop);
            setTimeout(() => {
                if (input) {
                    input.focus();
                    input.select(); // Select default value if present
                }
            }, 100);
        });
    }
    
    /**
     * Creates a modal element
     * @param {string} type - Type of modal: 'alert', 'confirm', or 'prompt'
     * @param {string} message - Message to display
     * @param {string|null} defaultValue - Default input value (for prompt)
     * @returns {HTMLElement} Modal element
     */
    static createModal(type, message, defaultValue) {
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop';
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        
        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        
        const modalTitle = document.createElement('h3');
        modalTitle.className = 'modal-title';
        if (type === 'alert') {
            modalTitle.textContent = 'Alert';
        } else if (type === 'confirm') {
            modalTitle.textContent = 'Confirm';
        } else if (type === 'prompt') {
            modalTitle.textContent = 'Prompt';
        }
        modalHeader.appendChild(modalTitle);
        
        const modalBody = document.createElement('div');
        modalBody.className = 'modal-body';
        
        const modalMessage = document.createElement('p');
        modalMessage.className = 'modal-message';
        modalMessage.textContent = message;
        modalBody.appendChild(modalMessage);
        
        if (type === 'prompt') {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'modal-input';
            input.value = defaultValue || '';
            modalBody.appendChild(input);
        }
        
        const modalFooter = document.createElement('div');
        modalFooter.className = 'modal-footer';
        
        if (type === 'alert') {
            const okBtn = document.createElement('button');
            okBtn.className = 'btn btn-primary modal-btn-primary';
            okBtn.textContent = 'OK';
            modalFooter.appendChild(okBtn);
        } else {
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'btn btn-secondary modal-btn-secondary';
            cancelBtn.textContent = 'Cancel';
            modalFooter.appendChild(cancelBtn);
            
            const okBtn = document.createElement('button');
            okBtn.className = 'btn btn-primary modal-btn-primary';
            okBtn.textContent = 'OK';
            modalFooter.appendChild(okBtn);
        }
        
        modalContent.appendChild(modalHeader);
        modalContent.appendChild(modalBody);
        modalContent.appendChild(modalFooter);
        modal.appendChild(modalContent);
        backdrop.appendChild(modal);
        
        return backdrop;
    }
    
    /**
     * Closes and removes a modal
     * @param {HTMLElement} modal - Modal element to close
     */
    static closeModal(modal) {
        modal.classList.add('modal-closing');
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 200);
    }
}

