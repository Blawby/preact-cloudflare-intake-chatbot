import { FunctionComponent } from 'preact';
import { createPortal } from 'preact/compat';
import { useEffect, useState } from 'preact/hooks';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface LightboxProps {
    src: string;
    alt: string;
    onClose: () => void;
}

const Lightbox: FunctionComponent<LightboxProps> = ({ src, alt, onClose }) => {
    const [isClosing, setIsClosing] = useState(false);
    const [isBrowser, setIsBrowser] = useState(false);

    useEffect(() => {
        setIsBrowser(true);
    }, []);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
        }, 300);
    };

    useEffect(() => {
        if (!isBrowser) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                handleClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isBrowser]);

    if (!isBrowser) return null;

    const content = (
        <div class={`lightbox-overlay ${isClosing ? 'closing' : ''}`} onClick={handleClose}>
            <img src={src} alt={alt} class="lightbox-image" onClick={(e) => e.stopPropagation()} />
            <button class="lightbox-close" onClick={handleClose}>
                <XMarkIcon className="w-6 h-6" />
            </button>
        </div>
    );

    return createPortal(content, document.body);
};

export default Lightbox; 