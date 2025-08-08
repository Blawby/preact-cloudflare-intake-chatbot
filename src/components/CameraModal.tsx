import { FunctionComponent } from 'preact';
import { useRef, useEffect, useState } from 'preact/hooks';
import Modal from './Modal';
import { CameraIcon } from '@heroicons/react/24/solid';
import { Button } from './ui/Button';

interface CameraModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCapture: (file: File) => void;
}

const CameraModal: FunctionComponent<CameraModalProps> = ({
    isOpen,
    onClose,
    onCapture
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [error, setError] = useState('');

    // Initialize the camera
    useEffect(() => {
        if (isOpen) {
            startCamera();
        }
        return () => {
            stopCamera();
        };
    }, [isOpen]);

    const startCamera = async () => {
        try {
            setError('');
            setIsCameraReady(false);
            
            if (streamRef.current) {
                stopCamera();
            }
            
            // Default to environment camera (back camera) for simplicity
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            
            streamRef.current = stream;
            
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    setIsCameraReady(true);
                };
            }
        } catch (err) {
            console.error('Error accessing camera:', err);
            setError('Could not access camera. Please check permissions.');
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsCameraReady(false);
    };

    const takePhoto = () => {
        if (!isCameraReady || !videoRef.current || !canvasRef.current) return;
        
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw video frame to canvas
        const context = canvas.getContext('2d');
        if (context) {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Convert to blob and then to File
            canvas.toBlob((blob) => {
                if (blob) {
                    const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
                    onCapture(file);
                    onClose();
                }
            }, 'image/jpeg', 0.9);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="" fullScreen={true}>
            <div className="flex flex-col h-full w-full">
                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm text-center absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 max-w-80">
                        <p>{error}</p>
                    </div>
                )}
                
                <div className="relative w-full h-full overflow-hidden bg-black flex-grow">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                    />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                </div>
                
                <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center py-4 z-5">
                    <Button
                        type="button"
                        variant="primary"
                        onClick={takePhoto}
                        disabled={!isCameraReady}
                        title="Take photo"
                        className="bg-none border-none cursor-pointer flex items-center justify-center transition-all duration-200 w-20 h-20 rounded-full bg-white bg-opacity-80 shadow-lg p-0 relative disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <CameraIcon className="w-16 h-16 text-accent" />
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default CameraModal; 