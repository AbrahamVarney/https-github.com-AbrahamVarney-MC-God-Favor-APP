
import React from 'react';
import { Button } from './Button';

interface PWAInstallPromptModalProps {
  isOpen: boolean;
  isIOS: boolean;
  isDesktop: boolean;
  onClose: () => void;
  onInstall: () => void;
}

export const PWAInstallPromptModal: React.FC<PWAInstallPromptModalProps> = ({ isOpen, isIOS, isDesktop, onClose, onInstall }) => {
  if (!isOpen) return null;

  const handleInstall = () => {
    onInstall();
    // For non-iOS, the browser prompt takes over. We can close our modal.
    if (!isIOS) {
      onClose();
    }
  };
  
  const title = isDesktop ? "Install on Desktop" : "Install App";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[100] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-sm text-gray-800 dark:text-gray-200">
        <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="text-2xl font-bold">&times;</button>
        </header>
        <main className="p-6 space-y-4">
          {isIOS ? (
            <>
              <p>To install this app on your iPhone or iPad:</p>
              <ol className="list-decimal list-inside space-y-3">
                  <li>
                      Tap the 'Share' button in your browser's toolbar.
                      <div className="flex justify-center items-center bg-gray-100 dark:bg-gray-700 rounded-md p-2 mt-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8m-4-6l-4-4m0 0L8 6m4-4v12" /></svg>
                          <span className="ml-2 font-semibold">Share</span>
                      </div>
                  </li>
                  <li>
                      Scroll down and tap 'Add to Home Screen'.
                      <div className="flex justify-center items-center bg-gray-100 dark:bg-gray-700 rounded-md p-2 mt-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                           <span className="ml-2 font-semibold">Add to Home Screen</span>
                      </div>
                  </li>
              </ol>
            </>
          ) : isDesktop ? (
            <>
              <p>Install this application on your computer for quick and easy access from your desktop or start menu.</p>
              <p>Click the <strong>Install</strong> button below and then confirm in the prompt shown by your browser.</p>
            </>
          ) : (
             <>
              <p>Install this application on your device for a better experience and offline access.</p>
              <p>Click the <strong>Install</strong> button below to add it to your home screen.</p>
            </>
          )}
        </main>
        <footer className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
            {isIOS ? (
                <Button onClick={onClose} variant="primary">Got it!</Button>
            ) : (
                <>
                    <Button onClick={onClose} variant="ghost">Not Now</Button>
                    <Button onClick={handleInstall} variant="primary">Install</Button>
                </>
            )}
        </footer>
      </div>
    </div>
  );
};
