import { FunctionComponent } from 'preact';
import { createPortal } from 'preact/compat';
import { useEffect, useState } from 'preact/hooks';
import { XMarkIcon, PlayIcon } from '@heroicons/react/24/outline';
import { type AggregatedMedia } from '../utils/mediaAggregation';

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
                <div className="lightbox-video-container">
                    {!isVideoPlaying ? (
                        <div className="video-placeholder" onClick={handleVideoClick}>
                            <video 
                                src={media.url} 
                                className="video-preview"
                                muted
                            />
                            <div className="video-overlay">
                                <PlayIcon className="play-icon w-12 h-12" />
                                <p className="play-text">Click to play</p>
                            </div>
                        </div>
                    ) : (
                        <video 
                            src={media.url} 
                            className="lightbox-video"
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
                className="lightbox-image" 
                onClick={(e) => e.stopPropagation()} 
            />
        );
    };

    const content = (
        <div className={`lightbox-overlay ${isClosing ? 'closing' : ''}`} onClick={handleClose}>
            <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
                {renderMediaContent()}
                <div className="lightbox-info">
                    <h3 className="lightbox-title">{media.name}</h3>
                    <p className="lightbox-meta">
                        {media.type} • {Math.round(media.size / 1024)} KB
                    </p>
                </div>
            </div>
            <button className="lightbox-close" onClick={handleClose}>
                <XMarkIcon className="w-6 h-6" />
            </button>
        </div>
    );

    return createPortal(content, document.body);
};

export default Lightbox; 