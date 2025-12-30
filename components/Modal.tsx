import React from 'react';

interface ModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-white/80 backdrop-blur-sm transition-opacity" 
        onClick={onCancel}
      />

      {/* Modal Content */}
      <div className="relative bg-white border border-black p-8 w-full max-w-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-slide-up">
        <h3 className="font-display text-2xl mb-4 tracking-wide">{title}</h3>
        <p className="font-serif text-gray-600 mb-8 leading-relaxed">
          {message}
        </p>

        <div className="flex space-x-4">
          <button
            onClick={onCancel}
            className="flex-1 py-3 border border-gray-200 hover:border-black transition-colors font-medium text-sm uppercase tracking-wider"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 text-white transition-transform active:scale-95 font-medium text-sm uppercase tracking-wider ${
              isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-black hover:bg-gray-800'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};