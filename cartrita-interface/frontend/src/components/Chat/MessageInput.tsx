/**
 * Cartrita Interface - Message Input Component
 * Multiline input with send button and keyboard shortcuts
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  PaperAirplaneIcon,
  MicrophoneIcon,
  DocumentPlusIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/UI/Button';

interface MessageInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  disabled = false,
  placeholder = 'Type your message... (Shift+Enter for new line)',
  className = ''
}) => {
  const [message, setMessage] = useState('');
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = Math.min(textarea.scrollHeight, 200); // Max height of ~8 lines
      textarea.style.height = `${scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && !disabled) {
      onSend(trimmedMessage);
      setMessage('');
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Shift') {
      setIsShiftPressed(true);
    }

    if (e.key === 'Enter') {
      if (!isShiftPressed && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Shift') {
      setIsShiftPressed(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  const canSend = message.trim().length > 0 && !disabled;

  return (
    <div className={`bg-white border-t border-gray-200 p-4 ${className}`}>
      <div className="max-w-4xl mx-auto">
        <div className="relative flex items-end gap-3">
          {/* Additional Actions */}
          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              title="Attach file"
              disabled={disabled}
            >
              <DocumentPlusIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              title="Voice input"
              disabled={disabled}
            >
              <MicrophoneIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Message Input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onKeyUp={handleKeyUp}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              className={`
                w-full px-4 py-3 pr-12 rounded-2xl border border-gray-300
                focus:ring-2 focus:ring-orange-500 focus:border-orange-500
                resize-none overflow-hidden transition-all duration-200
                disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
                placeholder:text-gray-400
                ${disabled ? 'opacity-50' : ''}
              `}
              style={{
                minHeight: '48px',
                maxHeight: '200px'
              }}
            />

            {/* Character Counter */}
            {message.length > 0 && (
              <div className="absolute bottom-2 right-14 text-xs text-gray-400">
                {message.length}
              </div>
            )}
          </div>

          {/* Send Button */}
          <Button
            onClick={handleSend}
            disabled={!canSend}
            variant={canSend ? 'primary' : 'secondary'}
            size="sm"
            className={`
              rounded-full p-3 transition-all duration-200 mb-1
              ${canSend
                ? 'bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:scale-105'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }
            `}
            title={canSend ? 'Send message (Enter)' : 'Type a message to send'}
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </Button>
        </div>

        {/* Keyboard Shortcuts Help */}
        <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
          <div className="flex items-center gap-4">
            <span>Press Enter to send</span>
            <span>Shift + Enter for new line</span>
          </div>
          {disabled && (
            <span className="text-orange-500">Connecting...</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageInput;