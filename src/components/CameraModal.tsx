import { FunctionComponent } from 'preact';
import { useRef, useEffect, useState } from 'preact/hooks';
import Modal from './Modal';
import { CameraIcon } from '@heroicons/react/24/solid';

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
            <div className="camera-modal">
                {error && (
                    <div className="camera-error">
                        <p>{error}</p>
                    </div>
                )}
                
                <div className="camera-preview">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                    />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                </div>
                
                <div className="camera-controls">
                    <button
                        type="button"
                        className="camera-control-btn capture"
                        onClick={takePhoto}
                        disabled={!isCameraReady}
                        title="Take photo"
                    >
                        <CameraIcon className="w-8 h-8" />
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default CameraModal; 