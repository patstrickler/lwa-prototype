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
            console.log('Modal.confirm called with message:', message);
            const backdrop = this.createModal('confirm', message, null);
            console.log('Modal backdrop created:', backdrop);
            const okBtn = backdrop.querySelector('.modal-btn-primary');
            const cancelBtn = backdrop.querySelector('.modal-btn-secondary');
            
            if (!okBtn || !cancelBtn) {
                console.error('Modal: Buttons not found in confirm modal', {
                    backdrop: !!backdrop,
                    okBtn: !!okBtn,
                    cancelBtn: !!cancelBtn,
                    backdropHTML: backdrop.innerHTML.substring(0, 200)
                });
                resolve(false);
                return;
            }
            
            console.log('Modal buttons found, appending to body');
            
            // Get modal element for styling
            const modal = backdrop.querySelector('.modal');
            
            // Prevent event propagation on modal content clicks
            if (modal) {
                modal.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            }
            
            okBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeModal(backdrop);
                resolve(true);
            });
            
            cancelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeModal(backdrop);
                resolve(false);
            });
            
            // Close on backdrop click (backdrop is the element itself)
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.closeModal(backdrop);
                    resolve(false);
                }
            });
            
            // Append to body and ensure visibility
            document.body.appendChild(backdrop);
            console.log('Modal backdrop appended to body');
            
            // Force visibility styles immediately
            backdrop.style.display = 'flex';
            backdrop.style.visibility = 'visible';
            backdrop.style.opacity = '1';
            backdrop.style.zIndex = '10000';
            backdrop.style.position = 'fixed';
            backdrop.style.top = '0';
            backdrop.style.left = '0';
            backdrop.style.right = '0';
            backdrop.style.bottom = '0';
            backdrop.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            backdrop.style.alignItems = 'center';
            backdrop.style.justifyContent = 'center';
            
            // Ensure modal is visible
            if (modal) {
                modal.style.display = 'block';
                modal.style.visibility = 'visible';
                modal.style.opacity = '1';
            }
            
            console.log('Modal styles applied, backdrop in DOM:', document.body.contains(backdrop));
            
            // Focus after a short delay to ensure DOM is ready
            setTimeout(() => {
                if (okBtn) {
                    okBtn.focus();
                }
                console.log('Modal should be visible now');
            }, 100);
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
     * Shows a select modal
     * @param {string} message - Message to display
     * @param {Array<Object>} options - Array of options: [{value, label}]
     * @param {string|null} defaultValue - Default selected value
     * @returns {Promise<string|null>} - Returns selected value if OK clicked, null if Cancel clicked
     */
    static select(message, options = [], defaultValue = null) {
        return new Promise((resolve) => {
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
            modalTitle.textContent = 'Select';
            modalHeader.appendChild(modalTitle);
            
            const modalBody = document.createElement('div');
            modalBody.className = 'modal-body';
            
            const modalMessage = document.createElement('p');
            modalMessage.className = 'modal-message';
            modalMessage.textContent = message;
            modalBody.appendChild(modalMessage);
            
            const select = document.createElement('select');
            select.className = 'modal-select';
            select.style.width = '100%';
            select.style.padding = '8px';
            select.style.marginTop = '10px';
            
            options.forEach(option => {
                const optionEl = document.createElement('option');
                optionEl.value = option.value;
                optionEl.textContent = option.label;
                if (option.value === defaultValue) {
                    optionEl.selected = true;
                }
                select.appendChild(optionEl);
            });
            
            modalBody.appendChild(select);
            
            const modalFooter = document.createElement('div');
            modalFooter.className = 'modal-footer';
            
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'btn btn-secondary modal-btn-secondary';
            cancelBtn.textContent = 'Cancel';
            cancelBtn.addEventListener('click', () => {
                this.closeModal(backdrop);
                resolve(null);
            });
            modalFooter.appendChild(cancelBtn);
            
            const okBtn = document.createElement('button');
            okBtn.className = 'btn btn-primary modal-btn-primary';
            okBtn.textContent = 'OK';
            okBtn.addEventListener('click', () => {
                const value = select.value;
                this.closeModal(backdrop);
                resolve(value);
            });
            modalFooter.appendChild(okBtn);
            
            modalContent.appendChild(modalHeader);
            modalContent.appendChild(modalBody);
            modalContent.appendChild(modalFooter);
            modal.appendChild(modalContent);
            backdrop.appendChild(modal);
            
            // Close on backdrop click
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) {
                    this.closeModal(backdrop);
                    resolve(null);
                }
            });
            
            document.body.appendChild(backdrop);
            setTimeout(() => {
                select.focus();
            }, 100);
        });
    }
    
    /**
     * Shows a custom modal with HTML content
     * @param {Object} options - Modal options
     * @param {string} options.title - Modal title
     * @param {string} options.content - HTML content
     * @param {Array} options.buttons - Array of button configs: [{text, class, value}]
     * @returns {Promise<any>} - Returns the value of the clicked button
     */
    static custom({ title, content, buttons = [] }) {
        return new Promise((resolve) => {
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
            modalTitle.textContent = title;
            modalHeader.appendChild(modalTitle);
            
            const modalBody = document.createElement('div');
            modalBody.className = 'modal-body';
            modalBody.innerHTML = content;
            
            const modalFooter = document.createElement('div');
            modalFooter.className = 'modal-footer';
            
            buttons.forEach(buttonConfig => {
                const btn = document.createElement('button');
                btn.className = `btn ${buttonConfig.class || 'btn-secondary'}`;
                btn.textContent = buttonConfig.text;
                btn.addEventListener('click', () => {
                    this.closeModal(backdrop);
                    resolve(buttonConfig.value);
                });
                modalFooter.appendChild(btn);
            });
            
            modalContent.appendChild(modalHeader);
            modalContent.appendChild(modalBody);
            modalContent.appendChild(modalFooter);
            modal.appendChild(modalContent);
            backdrop.appendChild(modal);
            
            // Close on backdrop click
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) {
                    this.closeModal(backdrop);
                    resolve(false);
                }
            });
            
            // Handle radio button changes for access type
            const accessTypeRadios = modalBody.querySelectorAll('input[name="access-type"]');
            const restrictedOptions = modalBody.querySelector('#restricted-access-options');
            if (accessTypeRadios.length > 0 && restrictedOptions) {
                accessTypeRadios.forEach(radio => {
                    radio.addEventListener('change', () => {
                        if (radio.value === 'restricted') {
                            restrictedOptions.style.display = 'block';
                        } else {
                            restrictedOptions.style.display = 'none';
                        }
                    });
                });
            }
            
            document.body.appendChild(backdrop);
            setTimeout(() => {
                const firstBtn = modalFooter.querySelector('button');
                if (firstBtn) firstBtn.focus();
            }, 100);
        });
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

