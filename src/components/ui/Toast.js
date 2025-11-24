"use client";

import { useState, useEffect } from "react";

/**
 * Toast Notification Component
 * Displays success, error, warning, or info messages with auto-dismiss functionality
 */
const Toast = ({
  message,
  type = "info",
  duration = 5000,
  isVisible,
  onClose,
  position = "top-right",
}) => {
  const [isShowing, setIsShowing] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsShowing(true);

      if (duration > 0) {
        const timer = setTimeout(() => {
          setIsShowing(false);
          setTimeout(onClose, 300); // Wait for exit animation
        }, duration);

        return () => clearTimeout(timer);
      }
    } else {
      setIsShowing(false);
    }
  }, [isVisible, duration, onClose]);

  const getPositionStyles = () => {
    switch (position) {
      case "top-center":
        return "top-4 left-1/2 -translate-x-1/2";
      case "top-left":
        return "top-4 left-4";
      case "top-right":
      default:
        return "top-4 right-4";
    }
  };

  const getToastStyles = () => {
    const baseStyles =
      "fixed z-[9999] p-4 rounded-xl shadow-2xl backdrop-blur-md border max-w-sm transform transition-all duration-300 ease-out";

    const positionStyles = getPositionStyles();

    const colorStyles = (() => {
      switch (type) {
        case "success":
          return "bg-emerald-50/95 border-emerald-200 text-emerald-800";
        case "error":
          return "bg-red-50/95 border-red-200 text-red-800";
        case "warning":
          return "bg-amber-50/95 border-amber-200 text-amber-800";
        default:
          return "bg-blue-50/95 border-blue-200 text-blue-800";
      }
    })();

    return `${baseStyles} ${positionStyles} ${colorStyles}`;
  };

  const getIcon = () => {
    switch (type) {
      case "success":
        return "✅";
      case "error":
        return "❌";
      case "warning":
        return "⚠️";
      default:
        return "ℹ️";
    }
  };

  const getAnimationStyles = () => {
    if (position === "top-center") {
      return isShowing
        ? "translate-y-0 opacity-100 scale-100"
        : "-translate-y-full opacity-0 scale-95";
    }
    return isShowing
      ? "translate-x-0 opacity-100 scale-100"
      : "translate-x-full opacity-0 scale-95";
  };

  if (!isVisible && !isShowing) return null;

  return (
    <div className={`${getToastStyles()} ${getAnimationStyles()}`}>
      <div className="flex items-center gap-1">
        <div className="flex-shrink-0 text-lg">{getIcon()}</div>
        <div className="flex-1">
          <p className="text-sm font-medium leading-relaxed">{message}</p>
        </div>
        <button
          onClick={() => {
            setIsShowing(false);
            setTimeout(onClose, 300);
          }}
          className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close notification"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

/**
 * Toast Manager Hook
 * Provides an easy way to show toast notifications
 */
export const useToast = (defaultPosition = "top-right") => {
  const [toast, setToast] = useState(null);

  const showToast = (
    message,
    type = "info",
    duration = 5000,
    position = defaultPosition,
  ) => {
    setToast({ message, type, duration, position, id: Date.now() });
  };

  const hideToast = () => {
    setToast(null);
  };

  const showSuccess = (
    message,
    duration = 5000,
    position = defaultPosition,
  ) => {
    showToast(message, "success", duration, position);
  };

  const showError = (message, duration = 7000, position = defaultPosition) => {
    showToast(message, "error", duration, position);
  };

  const showWarning = (
    message,
    duration = 6000,
    position = defaultPosition,
  ) => {
    showToast(message, "warning", duration, position);
  };

  const showInfo = (message, duration = 5000, position = defaultPosition) => {
    showToast(message, "info", duration, position);
  };

  return {
    toast,
    showToast,
    hideToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    ToastComponent: toast ? (
      <Toast
        key={toast.id}
        message={toast.message}
        type={toast.type}
        duration={toast.duration}
        position={toast.position}
        isVisible={!!toast}
        onClose={hideToast}
      />
    ) : null,
  };
};

export default Toast;
