
import React from 'react';

interface ChatFiltersProps {
  onFilterChange: (type: string, value: string) => void;
}

const ChatFilters: React.FC<ChatFiltersProps> = ({ onFilterChange }) => {
  return null; // We'll implement chat-specific filters later if needed
};

export default ChatFilters;
