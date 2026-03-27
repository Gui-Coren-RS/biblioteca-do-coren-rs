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
    ? 'bg-red-600 hover:bg-red-800 focus:ring-red-300' 
    : 'bg-blue-600 hover:bg-blue-800 focus:ring-blue-300';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black bg-opacity-50 p-4">
      <div className="relative w-full max-w-md rounded-lg bg-white shadow">
        <div className="p-6 text-center">
          <h3 className="mb-2 text-lg font-normal text-gray-900">{title}</h3>
          <p className="mb-5 text-sm text-gray-500">{message}</p>
          <div className="flex justify-center gap-4">
            <button onClick={onCancel} className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus:z-10 focus:outline-none focus:ring-4 focus:ring-gray-200">
              {cancelText}
            </button>
            <button onClick={onConfirm} className={`rounded-lg px-5 py-2.5 text-center text-sm font-medium text-white focus:outline-none focus:ring-4 ${colorClasses}`}>
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
      <div className="relative w-full max-w-md rounded-lg bg-white shadow">
        <div className="p-6 text-center">
          <h3 className="mb-2 text-lg font-normal text-gray-900">{title}</h3>
          <p className="mb-5 text-sm text-gray-500">{message}</p>
          <button onClick={onClose} className="rounded-lg bg-blue-600 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300">
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
