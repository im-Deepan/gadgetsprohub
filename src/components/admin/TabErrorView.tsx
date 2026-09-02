import React from 'react';
import { ErrorStateView } from '../ErrorStateView';

interface TabErrorProps {
  message: string;
  title: string;
  onRetry: () => void;
  isRetrying?: boolean;
}

export const TabErrorView: React.FC<TabErrorProps> = ({ message, title, onRetry, isRetrying }) => {
  return (
    <div className="my-6 max-w-2xl mx-auto w-full">
      <ErrorStateView
        variant="server"
        compact={true}
        title={title}
        description={message}
        onRetry={onRetry}
        isRetrying={isRetrying}
      />
    </div>
  );
};
