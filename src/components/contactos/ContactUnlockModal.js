"use client";

import { useState } from "react";

const ContactUnlockModal = ({
  isOpen,
  onClose,
  onConfirm,
  contact,
  userCredits,
  isLoading,
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
  };

  const hasInsufficientCredits = userCredits < 1;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center w-full">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-black/60 via-purple-900/30 to-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white/95 backdrop-blur-md rounded-lg shadow-xl p-6 mx-4 w-full border border-white/20">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Unlock Contact Information
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            disabled={isLoading}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Contact Info */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg text-black font-semibold text-lg flex items-center justify-center border-1 border-gray-300">
              {contact?.name}
            </div>
            <div>
              <h4 className="font-medium text-gray-900">
                Unlock {contact?.name} • {contact?.company?.name}
              </h4>
              <p className="text-sm text-gray-600">
                {contact?.city} · Anonymized contact. Details revealed after
                unlock.
              </p>
            </div>
          </div>
        </div>

        {/* Credits Info */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Your Credits:</span>
            <span
              className={`font-semibold ${
                hasInsufficientCredits ? "text-red-600" : "text-green-600"
              }`}
            >
              {userCredits}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Cost to Unlock:</span>
            <span className="font-semibold text-blue-600">1 Credit</span>
          </div>
          {!hasInsufficientCredits && (
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
              <span className="text-sm text-gray-600">After Unlock:</span>
              <span className="font-semibold text-gray-900">
                {userCredits - 1} Credits
              </span>
            </div>
          )}
        </div>

        {/* Error Message */}
        {hasInsufficientCredits && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg
                  className="w-5 h-5 text-red-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-red-800 mb-1">
                  Insufficient Credits
                </h4>
                <p className="text-sm text-red-700">
                  You need at least 1 credit to unlock contact information.
                  Please purchase more credits to continue.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Success Info */}
        {!hasInsufficientCredits && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg
                  className="w-5 h-5 text-blue-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-blue-800 mb-1">
                  One-Time Purchase
                </h4>
                <p className="text-sm text-blue-700">
                  Once unlocked, you will have permanent access to this
                  contact&apos;s information.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            disabled={isLoading}
          >
            Cancel
          </button>
          {hasInsufficientCredits ? (
            <button
              onClick={() => {
                // TODO: Redirect to credits purchase page
                onClose();
              }}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
            >
              Buy Credits
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Unlocking...
                </div>
              ) : (
                `Unlock for 1 Credit`
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactUnlockModal;
