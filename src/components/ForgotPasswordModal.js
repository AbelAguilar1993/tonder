"use client";

import { useState, useEffect } from "react";
import { authService } from "../services/authService";

const ForgotPasswordModal = ({ isOpen, onClose, onBackToLogin }) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await authService.requestPasswordReset(email);
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Failed to send reset email. Please try again.");
      console.error("Forgot password error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setError("");
    setSuccess(false);
    setLoading(false);
    onClose();
  };

  const handleBackToLogin = () => {
    setEmail("");
    setError("");
    setSuccess(false);
    setLoading(false);
    onBackToLogin();
  };

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;

      // Prevent scroll on body
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";

      return () => {
        // Restore scroll when modal closes
        document.body.style.overflow = "";
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";

        // Restore scroll position
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape" && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-gradient-to-br from-black/60 via-purple-900/30 to-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-300 overflow-hidden"
      onClick={handleClose}
    >
      <div
        className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-white/20 animate-in zoom-in-95 duration-300 overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 bg-gradient-to-br from-white to-purple-50/50 rounded-2xl">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-[#5E3FA6] to-[#B276CA] bg-clip-text text-transparent">
                {success ? "¡Email Enviado!" : "¿Olvidaste tu contraseña?"}
              </h2>
              <p className="text-gray-600 mt-1">
                {success
                  ? "Revisa tu bandeja de entrada"
                  : "Te enviaremos un enlace para restablecerla"}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-[#5E3FA6] transition-colors text-3xl font-light hover:scale-110 transition-transform cursor-pointer"
            >
              ×
            </button>
          </div>

          {/* Success Message */}
          {success && (
            <div className="text-center animate-in slide-in-from-top duration-300">
              <div className="bg-green-50/80 backdrop-blur-sm border border-green-200 text-green-700 px-6 py-4 rounded-xl mb-6">
                <div className="flex items-center justify-center mb-4">
                  <span className="text-4xl">📧</span>
                </div>
                <p className="font-semibold mb-2">¡Listo! Revisa tu email</p>
                <p className="text-sm">
                  Si existe una cuenta con ese email, te hemos enviado un enlace
                  para restablecer tu contraseña.
                </p>
              </div>

              <div className="space-y-4">
                <button
                  onClick={handleBackToLogin}
                  className="w-full bg-gradient-to-r from-[#5E3FA6] to-[#B276CA] text-white py-4 px-6 rounded-xl font-semibold hover:from-[#4A2F85] hover:to-[#9B5AA3] transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl cursor-pointer"
                >
                  <span className="flex items-center justify-center">
                    <span className="mr-2">🚀</span>
                    Volver al Inicio de Sesión
                  </span>
                </button>

                <p className="text-xs text-gray-500 mt-4">
                  💡 El enlace expirará en 1 hora por seguridad
                </p>
              </div>
            </div>
          )}

          {/* Forgot Password Form */}
          {!success && (
            <>
              {/* Error Message */}
              {error && (
                <div className="bg-red-50/80 backdrop-blur-sm border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 animate-in slide-in-from-top duration-300">
                  <div className="flex items-center">
                    <span className="text-red-500 mr-2">⚠️</span>
                    {error}
                  </div>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Dirección de Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(""); // Clear error when user types
                    }}
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-700 bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#5E3FA6] focus:border-transparent transition-all duration-200 hover:border-[#B276CA]"
                    placeholder="tu@email.com"
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500 mt-2 flex items-center">
                    <span className="mr-1">💡</span>
                    Ingresa el email asociado a tu cuenta
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full bg-gradient-to-r from-[#5E3FA6] to-[#B276CA] text-white py-4 px-6 rounded-xl font-semibold hover:from-[#4A2F85] hover:to-[#9B5AA3] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl cursor-pointer"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Enviando...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      <span className="mr-2">🔑</span>
                      Enviar Enlace de Restablecimiento
                    </span>
                  )}
                </button>
              </form>

              {/* Back to Login */}
              <div className="mt-8 text-center">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500">o</span>
                  </div>
                </div>
                <p className="text-gray-600 mt-6">
                  ¿Recordaste tu contraseña?{" "}
                  <button
                    onClick={handleBackToLogin}
                    className="cursor-pointer text-[#5E3FA6] hover:text-[#4A2F85] font-semibold transition-colors"
                  >
                    🚀 Volver al inicio de sesión
                  </button>
                </p>
              </div>

              {/* Security Info */}
              <div className="mt-6 p-4 bg-blue-50/50 border border-blue-200 rounded-lg">
                <div className="flex items-start">
                  <span className="text-blue-500 mr-2 mt-1">🛡️</span>
                  <div className="text-sm text-blue-700">
                    <p className="font-semibold mb-1">
                      Información de seguridad:
                    </p>
                    <ul className="text-xs space-y-1">
                      <li>• El enlace expirará en 1 hora</li>
                      <li>• Solo se puede usar una vez</li>
                      <li>• Si no solicitaste esto, ignora este mensaje</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
