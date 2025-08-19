import { FunctionComponent } from 'preact';
import { useState, useRef, useEffect } from 'preact/hooks';
import {
	PlusIcon,
	PhotoIcon,
	CameraIcon,
	XMarkIcon
} from '@heroicons/react/24/outline';
import { Button } from './ui/Button';
import CameraModal from './CameraModal';

interface FileMenuProps {
    onFileSelect: (files: File[]) => void;
    onCameraCapture: (file: File) => void;
    isReadyToUpload?: boolean;
}

const FileMenu: FunctionComponent<FileMenuProps> = ({
    onFileSelect,
    onCameraCapture,
    isReadyToUpload = true
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [showCameraModal, setShowCameraModal] = useState(false);
    const [isBrowser, setIsBrowser] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
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
                if (firstMenuItemRef.current && typeof firstMenuItemRef.current.focus === 'function') {
                    firstMenuItemRef.current.focus();
                }
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
                    if (firstMenuItemRef.current && typeof firstMenuItemRef.current.focus === 'function') {
                        firstMenuItemRef.current.focus();
                    }
                }
            } else if (event.key === 'Tab' && event.shiftKey) {
                const menuItems = menuRef.current?.querySelectorAll('button.file-menu-item');
                const firstItem = menuItems?.[0];
                
                if (document.activeElement === firstItem) {
                    event.preventDefault();
                    const lastItem = menuItems?.[menuItems.length - 1] as HTMLButtonElement;
                    if (lastItem && typeof lastItem.focus === 'function') {
                        lastItem.focus();
                    }
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

    const handleFileClick = () => {
        fileInputRef.current?.click();
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

    const filterDisallowedFiles = (files: File[]): File[] => {
        return files.filter(file => {
            	const fileExtension = file.name.split('.').pop()?.toLowerCase();
            // Disallow ZIP files and executables
            const disallowedExtensions = ['zip', 'exe', 'bat', 'cmd', 'msi', 'app'];
            return !disallowedExtensions.includes(fileExtension || '');
        });
    };

    const handleFileChange = (e: Event) => {
        const target = e.target as HTMLInputElement;
        const allFiles = Array.from(target.files || []);
        
        // Filter out disallowed extensions like zip and exe
        const safeFiles = filterDisallowedFiles(allFiles);
        
        if (safeFiles.length > 0) {
            onFileSelect(safeFiles);
        }
        
        if (safeFiles.length !== allFiles.length) {
            // Show inline error notification if files were removed
            const removedCount = allFiles.length - safeFiles.length;
            if (removedCount > 0) {
                setErrorMessage(`Some files were not uploaded. ZIP and executable files are not allowed.`);
                // Auto-hide error after 5 seconds
                setTimeout(() => setErrorMessage(null), 5000);
            }
        }
        
        target.value = '';
    };

    return (
        <div className="relative flex items-center" ref={menuRef}>
            <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => isReadyToUpload && setIsOpen(!isOpen)}
                title={isReadyToUpload ? "Add attachment" : "File upload not ready yet"}
                aria-label="Open file attachment menu"
                aria-haspopup="true"
                aria-expanded={isOpen}
                ref={triggerRef}
                disabled={!isReadyToUpload}
                icon={<PlusIcon className="w-5 h-5" aria-hidden="true" />}
                className={`${!isReadyToUpload ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            
            {(isOpen || isClosing) && (
                <div 
                    className={`absolute bottom-full left-0 mb-2 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg p-1 min-w-[200px] shadow-lg z-[2000] transition-all duration-200 ${isClosing ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}
                    role="menu"
                    aria-labelledby="attachment-menu"
                >
                    <Button 
                        type="button" 
                        variant="ghost"
                        onClick={handleFileClick}
                        role="menuitem"
                        ref={firstMenuItemRef}
                        className="file-menu-item flex items-center justify-between w-full px-3 py-3 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 rounded transition-colors duration-200 text-xs sm:text-sm"
                    >
                        <span>Add photos & files</span>
                        <PhotoIcon className="w-5 h-5" aria-hidden="true" />
                    </Button>
                    
                    <Button 
                        type="button" 
                        variant="ghost"
                        onClick={handleCameraClick}
                        role="menuitem"
                        className="file-menu-item flex items-center justify-between w-full px-3 py-3 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 rounded transition-colors duration-200 text-xs sm:text-sm border-t border-gray-200 dark:border-dark-border"
                    >
                        <span>Take Photo</span>
                        <CameraIcon className="w-5 h-5" aria-hidden="true" />
                    </Button>
                </div>
            )}

            {/* Error notification */}
            {errorMessage && (
                <div 
                    className="absolute bottom-full left-0 mb-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 min-w-[250px] shadow-lg z-[2001]"
                    role="alert"
                    aria-live="polite"
                >
                    <div className="flex items-start gap-2">
                        <div className="flex-1 text-sm text-red-700 dark:text-red-300">
                            {errorMessage}
                        </div>
                        <button
                            onClick={() => setErrorMessage(null)}
                            className="flex-shrink-0 p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200 transition-colors"
                            aria-label="Dismiss error message"
                        >
                            <XMarkIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*,video/*,audio/*,application/pdf,text/plain,text/csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                multiple
                onChange={handleFileChange}
                aria-hidden="true"
                tabIndex={-1}
            />
            
            {isBrowser && (
                <CameraModal
                    isOpen={showCameraModal}
                    onClose={() => setShowCameraModal(false)}
                    onCapture={handleCameraCapture}
                />
            )}
        </div>
    );
};

export default FileMenu; 