import { FunctionComponent } from 'preact';

interface SkeletonLoaderProps {
    height?: string;
    width?: string;
    borderRadius?: string;
    className?: string;
}

const SkeletonLoader: FunctionComponent<SkeletonLoaderProps> = ({
    height = '40px',
    width = '100%',
    borderRadius = '8px',
    className = ''
}) => {
    return (
        <div
            className={`bg-gradient-to-r from-skeleton-start via-skeleton-end to-skeleton-start bg-200 animate-skeleton-loading opacity-70 ${className}`}
            style={{
                height,
                width,
                borderRadius,
            }}
            aria-hidden="true"
        />
    );
};

export default SkeletonLoader; 