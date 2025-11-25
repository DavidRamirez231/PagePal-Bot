
import React, { useRef, useEffect } from 'react';

interface CameraOverlayProps {
    onCapture: (dataUrl: string) => void;
    onClose: () => void;
}

const CameraOverlay: React.FC<CameraOverlayProps> = ({ onCapture, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    
    useEffect(() => {
        let stream: MediaStream | null = null;
        const start = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } 
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play();
                }
            } catch (err) {
                console.error("Camera error", err);
                onClose();
            }
        };
        start();
        return () => {
            if (stream) stream.getTracks().forEach(t => t.stop());
        };
    }, []);

    const takePhoto = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0);
                onCapture(canvas.toDataURL('image/jpeg', 0.8));
            }
        }
    }

    return (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col animate-in">
            {/* Camera Viewfinder */}
            <div className="relative flex-1 bg-black rounded-b-3xl overflow-hidden">
                <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" autoPlay playsInline muted />
                
                {/* Top Bar */}
                <div className="absolute top-safe p-4 w-full flex justify-between items-center z-20">
                    <button onClick={onClose} className="w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            </div>

            {/* Bottom Controls */}
            <div className="h-32 bg-black flex items-center justify-center gap-12 pb-safe">
                <button onClick={takePhoto} className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center group active:scale-95 transition-transform">
                    <div className="w-16 h-16 bg-white rounded-full group-active:scale-90 transition-transform" />
                </button>
            </div>
        </div>
    );
};

export default CameraOverlay;
