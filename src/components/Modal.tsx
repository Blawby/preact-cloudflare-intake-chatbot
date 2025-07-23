import { FunctionComponent } from 'preact';
import { createPortal } from 'preact/compat';
import { useEffect, useState } from 'preact/hooks';
import { Button } from './ui/Button';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: preact.ComponentChildren;
    title?: string;
    fullScreen?: boolean;
}

const Modal: FunctionComponent<ModalProps> = ({ isOpen, onClose, children, title, fullScreen = false }) => {
    // Add state to track if we're in browser environment
    const [isBrowser, setIsBrowser] = useState(false);

    // Set browser state on mount
    useEffect(() => {
        setIsBrowser(true);
    }, []);

    useEffect(() => {
        // Only run in browser environment
        if (!isBrowser) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose, isBrowser]);

    // Return null during SSR or when closed
    if (!isOpen || !isBrowser) return null;

    const modalContent = (
        <div class={`modal-overlay ${fullScreen ? 'fullscreen' : ''}`} onClick={onClose}>
            <div class={`modal-content ${fullScreen ? 'fullscreen' : ''}`} onClick={e => e.stopPropagation()}>
                {(title || !fullScreen) && (
                    <div class="modal-header">
                        {title && <h2 class="modal-title">{title}</h2>}
                        <Button variant="ghost" size="sm" onClick={onClose} className="modal-close">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                                <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                            </svg>
                        </Button>
                    </div>
                )}
                <div class={`modal-body ${fullScreen ? 'fullscreen' : ''}`}>
                    {children}
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default Modal; 