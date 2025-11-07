import React from 'react';

export const Loader: React.FC = () => (
  <div className="flex justify-center items-center py-16">
    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" role="status" aria-label="Loading..."></div>
  </div>
);
