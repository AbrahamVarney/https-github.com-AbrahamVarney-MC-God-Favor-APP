
import React from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Button } from './Button';

interface InstallPWAButtonProps {
    onOpenInstallPrompt: () => void;
}

export const InstallPWAButton: React.FC<InstallPWAButtonProps> = ({ onOpenInstallPrompt }) => {
    const { canInstall } = usePWAInstall();

    if (!canInstall) {
        return null;
    }

    return (
        <Button onClick={onOpenInstallPrompt} variant="secondary" className="flex items-center gap-2">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Install App
        </Button>
    );
};
