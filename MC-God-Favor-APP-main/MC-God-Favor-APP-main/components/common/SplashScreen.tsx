import React from 'react';
import { DEFAULT_APP_ICON } from '../../constants';

export const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-light dark:bg-dark flex flex-col justify-center items-center z-[9999]">
      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              transform: scale(1);
              opacity: 1;
            }
            50% {
              transform: scale(1.05);
              opacity: 0.8;
            }
          }
          .animate-pulse-logo {
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
        `}
      </style>
      <div className="animate-pulse-logo">
        <img src={DEFAULT_APP_ICON} alt="Loading" className="h-24 w-24" />
      </div>
      <p className="mt-6 text-lg font-semibold text-secondary dark:text-gray-400">
        Getting your invoices ready...
      </p>
    </div>
  );
};
