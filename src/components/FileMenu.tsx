import { FunctionComponent } from 'preact';
import { useState, useRef, useEffect } from 'preact/hooks';
import {
	PlusIcon,
	PhotoIcon,
	CameraIcon,
	DocumentIcon
} from '@heroicons/react/24/outline';
import { Button } from './ui/Button';
import createLazyComponent from '../utils/LazyComponent';

// Create lazy-loaded CameraModal
const LazyCameraModal = createLazyComponent(
    () => import('./CameraModal'),
    'CameraModal'
);

interface FileMenuProps {
    onPhotoSelect: (files: File[]) => void;
    onCameraCapture: (file: File) => void;
    onFileSelect: (files: File[]) => void;
}

const FileMenu: FunctionComponent<FileMenuProps> = ({
    onPhotoSelect,
    onCameraCapture,
    onFileSelect
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [showCameraModal, setShowCameraModal] = useState(false);
    const [isBrowser, setIsBrowser] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const photoInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const firstMenuItemRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        setIsBrowser(true);
    }, []);

    useEffect(() => {
        if (!isBrowser) return;
        
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                handleClose();
            }
        };

        if (isOpen) {
            document.addEventListener('click', handleClickOutside);
            // Focus the first menu item when menu opens
            setTimeout(() => {
                firstMenuItemRef.current?.focus();
            }, 10);
        }

        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [isOpen, isBrowser]);

    // Handle keyboard navigation
    useEffect(() => {
        if (!isBrowser || !isOpen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                handleClose();
                triggerRef.current?.focus();
            } else if (event.key === 'Tab' && !event.shiftKey) {
                const menuItems = menuRef.current?.querySelectorAll('button.file-menu-item');
                const lastItem = menuItems?.[menuItems.length - 1];
                
                if (document.activeElement === lastItem) {
                    event.preventDefault();
                    firstMenuItemRef.current?.focus();
                }
            } else if (event.key === 'Tab' && event.shiftKey) {
                const menuItems = menuRef.current?.querySelectorAll('button.file-menu-item');
                const firstItem = menuItems?.[0];
                
                if (document.activeElement === firstItem) {
                    event.preventDefault();
                    const lastItem = menuItems?.[menuItems.length - 1] as HTMLButtonElement;
                    lastItem?.focus();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, isBrowser]);

    const handleClose = () => {
        if (isOpen && !isClosing) {
            setIsClosing(true);
            setTimeout(() => {
                setIsOpen(false);
                setIsClosing(false);
            }, 150); // Match animation duration
        }
    };

    const handlePhotoClick = () => {
        photoInputRef.current?.click();
        handleClose();
    };

    const handleCameraClick = () => {
        setShowCameraModal(true);
        handleClose();
    };

    const handleCameraCapture = (file: File) => {
        onCameraCapture(file);
        setShowCameraModal(false);
    };

    const handleFileClick = () => {
        fileInputRef.current?.click();
        handleClose();
    };

    const filterDisallowedFiles = (files: File[]): File[] => {
        return files.filter(file => {
            	const fileExtension = file.name.split('.').pop()?.toLowerCase();
            // Disallow ZIP files and executables
            const disallowedExtensions = ['zip', 'exe', 'bat', 'cmd', 'msi', 'app'];
            return !disallowedExtensions.includes(fileExtension || '');
        });
    };

    const handlePhotoChange = (e: Event) => {
        const target = e.target as HTMLInputElement;
        const files = Array.from(target.files || []);
        if (files.length > 0) {
            onPhotoSelect(files);
        }
        target.value = '';
    };

    const handleFileChange = (e: Event) => {
        const target = e.target as HTMLInputElement;
        const allFiles = Array.from(target.files || []);
        
        // Filter out disallowed extensions like zip and exe
        const safeFiles = filterDisallowedFiles(allFiles);
        
        // Further filter out images and videos which should use the photo option
        const nonMediaFiles = safeFiles.filter(file => {
            return !file.type.startsWith('image/') && !file.type.startsWith('video/');
        });
        
        if (nonMediaFiles.length > 0) {
            onFileSelect(nonMediaFiles);
        }
        
        if (nonMediaFiles.length !== allFiles.length) {
            // Alert user if files were removed
            const removedCount = allFiles.length - nonMediaFiles.length;
            if (removedCount > 0) {
                if (safeFiles.length !== allFiles.length) {
                    alert('Some files were not uploaded. ZIP and executable files are not allowed. Images and videos should use the "Attach photos" option.');
                } else {
                    alert('Images and videos should be uploaded using the "Attach photos" option.');
                }
            }
        }
        
        target.value = '';
    };

    return (
        <div className="file-menu" ref={menuRef}>
            <Button
                type="button"
                variant="icon"
                size="sm"
                onClick={() => setIsOpen(!isOpen)}
                title="Add attachment"
                aria-label="Open file attachment menu"
                aria-haspopup="true"
                aria-expanded={isOpen}
                ref={triggerRef}
                className="file-menu-trigger"
            >
                <PlusIcon className="w-5 h-5" aria-hidden="true" />
            </Button>
            
            {(isOpen || isClosing) && (
                <div 
                    className={`file-menu-dropdown ${isClosing ? 'closing' : ''}`}
                    role="menu"
                    aria-labelledby="attachment-menu"
                >
                    <Button 
                        type="button" 
                        variant="ghost"
                        onClick={handlePhotoClick}
                        role="menuitem"
                        ref={firstMenuItemRef}
                        className="file-menu-item w-full justify-between"
                    >
                        <span>Attach photos</span>
                        <PhotoIcon className="w-5 h-5" aria-hidden="true" />
                    </Button>
                    
                    <Button 
                        type="button" 
                        variant="ghost"
                        onClick={handleCameraClick}
                        role="menuitem"
                        className="file-menu-item w-full justify-between"
                    >
                        <span>Take Photo</span>
                        <CameraIcon className="w-5 h-5" aria-hidden="true" />
                    </Button>
                    
                    <Button 
                        type="button" 
                        variant="ghost"
                        onClick={handleFileClick}
                        role="menuitem"
                        className="file-menu-item w-full justify-between"
                    >
                        <span>Attach files</span>
                        <DocumentIcon className="w-5 h-5" aria-hidden="true" />
                    </Button>
                </div>
            )}

            <input
                type="file"
                ref={photoInputRef}
                className="file-input"
                accept="image/*"
                multiple
                onChange={handlePhotoChange}
                aria-hidden="true"
                tabIndex={-1}
            />
            <input
                type="file"
                ref={fileInputRef}
                className="file-input"
                accept="application/pdf,text/plain,text/csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,audio/*"
                multiple
                onChange={handleFileChange}
                aria-hidden="true"
                tabIndex={-1}
            />
            
            {isBrowser && (
                <LazyCameraModal
                    isOpen={showCameraModal}
                    onClose={() => setShowCameraModal(false)}
                    onCapture={handleCameraCapture}
                />
            )}
        </div>
    );
};

export default FileMenu; 