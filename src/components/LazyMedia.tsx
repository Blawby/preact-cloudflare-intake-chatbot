import { FunctionComponent } from 'preact';
import { useRef, useEffect, useState } from 'preact/hooks';
import { memo } from 'preact/compat';

interface LazyMediaProps {
    src: string;
    type: string;
    alt?: string;
    className?: string;
    onClick?: () => void;
}

const LazyMedia: FunctionComponent<LazyMediaProps> = ({ src, type, alt = '', className = '', onClick }) => {
    const mediaRef = useRef<HTMLElement>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            {
                rootMargin: '50px 0px', // Start loading when within 50px of viewport
                threshold: 0.1
            }
        );

        if (mediaRef.current) {
            observer.observe(mediaRef.current);
        }

        return () => observer.disconnect();
    }, []);

    const handleLoad = () => {
        setIsLoaded(true);
    };

    const handleError = () => {
        setError(true);
        setIsLoaded(true);
    };

    const handleImageClick = () => {
        if (onClick) {
            onClick();
        }
    };

    const isImage = type.startsWith('image/');
    const isVideo = type.startsWith('video/');
    const isAudio = type.startsWith('audio/');

    return (
        <div 
            ref={mediaRef} 
            className={`lazy-media-container ${className} ${isLoaded ? 'loaded' : 'loading'}`}
        >
            {!isLoaded && (
                <div class="media-placeholder">
                    <div class="loading-indicator">
                        <span class="dot"></span>
                        <span class="dot"></span>
                        <span class="dot"></span>
                    </div>
                </div>
            )}
            
            {error && (
                <div class="media-error">
                    <span>Failed to load media</span>
                </div>
            )}

            {isVisible && !error && (
                isImage ? (
                    <img
                        src={src}
                        alt={alt}
                        onLoad={handleLoad}
                        onError={handleError}
                        onClick={handleImageClick}
                        class={isLoaded ? 'visible' : 'hidden'}
                    />
                ) : isVideo ? (
                    <video
                        src={src}
                        controls
                        onLoadedData={handleLoad}
                        onError={handleError}
                        class={isLoaded ? 'visible' : 'hidden'}
                    />
                ) : isAudio ? (
                    <audio
                        src={src}
                        controls
                        onLoadedData={handleLoad}
                        onError={handleError}
                        class={isLoaded ? 'visible' : 'hidden'}
                    />
                ) : (
                    <div class="unsupported-media">
                        <a href={src} target="_blank" rel="noopener noreferrer">
                            Download File
                        </a>
                    </div>
                )
            )}
        </div>
    );
};

export default memo(LazyMedia); 