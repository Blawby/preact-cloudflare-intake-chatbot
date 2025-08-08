import { FunctionComponent } from 'preact';
import { createPortal } from 'preact/compat';
import { useEffect, useState } from 'preact/hooks';
import { XMarkIcon, PlayIcon } from '@heroicons/react/24/outline';
import { type AggregatedMedia } from '../utils/mediaAggregation';
import { Button } from './ui/Button';

interface LightboxProps {
    media: AggregatedMedia;
    onClose: () => void;
}

const Lightbox: FunctionComponent<LightboxProps> = ({ media, onClose }) => {
    const [isClosing, setIsClosing] = useState(false);
    const [isBrowser, setIsBrowser] = useState(false);
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);

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

    const handleVideoClick = () => {
        setIsVideoPlaying(true);
    };

    if (!isBrowser) return null;

    const renderMediaContent = () => {
        if (media.category === 'video') {
            return (
                <div className="max-w-full max-h-80vh rounded-lg overflow-hidden shadow-2xl">
                    {!isVideoPlaying ? (
                        <div className="relative cursor-pointer max-w-full max-h-80vh" onClick={handleVideoClick}>
                            <video 
                                src={media.url} 
                                className="w-full h-auto max-h-80vh object-contain"
                                muted
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center gap-2">
                                <PlayIcon className="text-white w-12 h-12" />
                                <p className="text-white text-sm font-medium">Click to play</p>
                            </div>
                        </div>
                    ) : (
                        <video 
                            src={media.url} 
                            className="w-full h-auto max-h-80vh"
                            controls
                            autoPlay
                        />
                    )}
                </div>
            );
        }

        return (
            <img 
                src={media.url} 
                alt={media.name} 
                className="max-w-full max-h-80vh object-contain rounded-lg shadow-2xl cursor-default" 
                onClick={(e) => e.stopPropagation()} 
            />
        );
    };

    const content = (
        <div className={`fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-9999 cursor-pointer animate-fade-in ${isClosing ? 'animate-fade-out' : ''}`} onClick={handleClose}>
            <div className="relative max-w-90vw max-h-90vh flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
                {renderMediaContent()}
                <div className="text-center text-white">
                    <h3 className="text-lg font-semibold mb-1">{media.name}</h3>
                    <p className="text-sm opacity-80">
                        {media.type} • {Math.round(media.size / 1024)} KB
                    </p>
                </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClose} className="absolute top-4 right-4 w-10 h-10 border-none bg-black bg-opacity-50 text-white rounded-full cursor-pointer flex items-center justify-center transition-all duration-200 hover:bg-black hover:bg-opacity-70 hover:scale-110 animate-zoom-in">
                <XMarkIcon className="w-6 h-6" />
            </Button>
        </div>
    );

    return createPortal(content, document.body);
};

export default Lightbox; 