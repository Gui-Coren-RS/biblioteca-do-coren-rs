import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'blue' | 'red';
}

export function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Confirmar', cancelText = 'Cancelar', confirmColor = 'blue' }: ConfirmModalProps) {
  if (!isOpen) return null;
  
  const colorClasses = confirmColor === 'red' 
    ? 'bg-red-600 hover:bg-red-800 focus:ring-red-300 dark:bg-red-500 dark:hover:bg-red-600 dark:focus:ring-red-800' 
    : 'bg-blue-600 hover:bg-blue-800 focus:ring-blue-300 dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-blue-800';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black bg-opacity-50 p-4">
      <div className="relative w-full max-w-md rounded-lg bg-white dark:bg-gray-800 shadow transition-colors duration-200">
        <div className="p-6 text-center">
          <h3 className="mb-2 text-lg font-normal text-gray-900 dark:text-white">{title}</h3>
          <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">{message}</p>
          <div className="flex justify-center gap-4">
            <button onClick={onCancel} className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-5 py-2.5 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-white focus:z-10 focus:outline-none focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-700 transition-colors duration-200">
              {cancelText}
            </button>
            <button onClick={onConfirm} className={`rounded-lg px-5 py-2.5 text-center text-sm font-medium text-white focus:outline-none focus:ring-4 transition-colors duration-200 ${colorClasses}`}>
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AlertModal({ isOpen, title, message, onClose }: { isOpen: boolean, title: string, message: string, onClose: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black bg-opacity-50 p-4">
      <div className="relative w-full max-w-md rounded-lg bg-white dark:bg-gray-800 shadow transition-colors duration-200">
        <div className="p-6 text-center">
          <h3 className="mb-2 text-lg font-normal text-gray-900 dark:text-white">{title}</h3>
          <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">{message}</p>
          <button onClick={onClose} className="rounded-lg bg-blue-600 dark:bg-blue-500 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-800 dark:hover:bg-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800 transition-colors duration-200">
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
