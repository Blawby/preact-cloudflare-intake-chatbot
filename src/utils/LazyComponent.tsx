import { ComponentType, FunctionComponent, Fragment } from 'preact';
import { Suspense, lazy } from 'preact/compat';
import { useState, useEffect } from 'preact/hooks';
import SkeletonLoader from '../components/SkeletonLoader';

// Configurations for different component types
const LOADER_CONFIGS = {
    'MediaControls': {
        height: '40px',
        width: '40px',
        borderRadius: '50%',
    },
    'Modal': {
        height: '200px',
        width: '100%',
        borderRadius: '8px',
    },
    'FileMenu': {
        height: '40px',
        width: '200px',
        borderRadius: '8px',
    },
    'Lightbox': {
        height: '300px',
        width: '100%',
        borderRadius: '8px',
    },
    'CameraModal': {
        height: '300px',
        width: '100%',
        borderRadius: '8px',
    },
    'default': {
        height: '40px',
        width: '100%',
        borderRadius: '8px',
    }
};

type LazyLoaderProps = {
    componentName: string;
    fallback?: JSX.Element;
};

const LazyLoader: FunctionComponent<LazyLoaderProps> = ({ 
    componentName, 
    fallback 
}) => {
    const config = LOADER_CONFIGS[componentName as keyof typeof LOADER_CONFIGS] || LOADER_CONFIGS.default;
    
    return fallback || (
        		<div className={`lazy-skeleton-container ${componentName.toLowerCase()}-skeleton`}>
            <SkeletonLoader 
                height={config.height}
                width={config.width}
                borderRadius={config.borderRadius}
            />
        </div>
    );
};

/**
 * Creates a lazy-loaded component with a skeleton loader
 * @param importFn - Dynamic import function
 * @param componentName - Name of the component for custom styling
 * @returns Lazy loaded component with skeleton fallback
 */
export function createLazyComponent<P>(
    importFn: () => Promise<{ default: ComponentType<P> }>,
    componentName: string
): FunctionComponent<P> {
    const LazyComponent = lazy(importFn);
    
    return (props: P) => {
        const [isClient, setIsClient] = useState(false);
        
        useEffect(() => {
            setIsClient(true);
        }, []);
        
        // On server or during static rendering, return a simple loader
        if (!isClient) {
            return <LazyLoader componentName={componentName} />;
        }
        
        return (
            <Suspense fallback={<LazyLoader componentName={componentName} />}>
                <LazyComponent {...props} />
            </Suspense>
        );
    };
}

export default createLazyComponent; 