"use client";

import { useState, useEffect } from "react";
import { authService } from "../services/authService";

const ResetPasswordForm = ({ token, onSuccess, onError }) => {
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError(""); // Clear error when user types
  };

  const validatePassword = () => {
    if (formData.password.length < 8) {
      return "La contraseña debe tener al menos 8 caracteres";
    }
    if (formData.password !== formData.confirmPassword) {
      return "Las contraseñas no coinciden";
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validatePassword();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");

    try {
      await authService.resetPassword({
        token,
        password: formData.password,
      });

      onSuccess && onSuccess();
    } catch (err) {
      const errorMessage =
        err.message ||
        "No se pudo restablecer la contraseña. Por favor, intenta de nuevo.";
      setError(errorMessage);
      onError && onError(errorMessage);
      console.error("Reset password error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = () => {
    const password = formData.password;
    if (password.length === 0) return { strength: 0, label: "", color: "" };

    let strength = 0;
    let label = "";
    let color = "";

    // Length check
    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 10;

    // Character variety checks
    if (/[a-z]/.test(password)) strength += 15;
    if (/[A-Z]/.test(password)) strength += 15;
    if (/[0-9]/.test(password)) strength += 15;
    if (/[^A-Za-z0-9]/.test(password)) strength += 20;

    // Set label and color based on strength
    if (strength < 30) {
      label = "Débil";
      color = "bg-red-500";
    } else if (strength < 60) {
      label = "Regular";
      color = "bg-yellow-500";
    } else if (strength < 80) {
      label = "Buena";
      color = "bg-blue-500";
    } else {
      label = "Excelente";
      color = "bg-green-500";
    }

    return { strength, label, color };
  };

  const passwordStrength = getPasswordStrength();

  return (
    <div className="max-w-md mx-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 overflow-hidden w-full">
      <div className="p-4 bg-gradient-to-br from-white to-purple-50/50">
        {/* Header */}
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">🔑</div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#5E3FA6] to-[#B276CA] bg-clip-text text-transparent">
            Nueva Contraseña
          </h1>
          <p className="text-gray-600 mt-2">
            Crea una contraseña segura para tu cuenta
          </p>
        </div>

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
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nueva Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                minLength={8}
                className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl text-gray-700 bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#5E3FA6] focus:border-transparent transition-all duration-200 hover:border-[#B276CA]"
                placeholder="••••••••"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                disabled={loading}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {formData.password && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600">Fortaleza:</span>
                  <span
                    className={`text-xs font-semibold ${
                      passwordStrength.strength < 30
                        ? "text-red-600"
                        : passwordStrength.strength < 60
                        ? "text-yellow-600"
                        : passwordStrength.strength < 80
                        ? "text-blue-600"
                        : "text-green-600"
                    }`}
                  >
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                    style={{ width: `${passwordStrength.strength}%` }}
                  ></div>
                </div>
              </div>
            )}

            <div className="mt-2 text-xs text-gray-500">
              <p className="flex items-center">
                <span className="mr-1">💡</span>
                Debe tener al menos 8 caracteres
              </p>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Confirmar Contraseña
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
                minLength={8}
                className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl text-gray-700 bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#5E3FA6] focus:border-transparent transition-all duration-200 hover:border-[#B276CA]"
                placeholder="••••••••"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                disabled={loading}
              >
                {showConfirmPassword ? "🙈" : "👁️"}
              </button>
            </div>

            {/* Password Match Indicator */}
            {formData.confirmPassword && (
              <div className="mt-2 text-xs">
                {formData.password === formData.confirmPassword ? (
                  <p className="text-green-600 flex items-center">
                    <span className="mr-1">✅</span>
                    Las contraseñas coinciden
                  </p>
                ) : (
                  <p className="text-red-600 flex items-center">
                    <span className="mr-1">❌</span>
                    Las contraseñas no coinciden
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={
              loading ||
              !formData.password ||
              !formData.confirmPassword ||
              formData.password !== formData.confirmPassword
            }
            className="w-full bg-gradient-to-r from-[#5E3FA6] to-[#B276CA] text-white py-3 px-6 rounded-xl font-semibold hover:from-[#4A2F85] hover:to-[#9B5AA3] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl cursor-pointer"
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
                Actualizando...
              </span>
            ) : (
              <span className="flex items-center justify-center">
                <span className="mr-2">🔒</span>
                Actualizar Contraseña
              </span>
            )}
          </button>
        </form>

        {/* Security Tips */}
        <div className="mt-4 p-2 bg-blue-50/50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <span className="text-blue-500 mr-1">🛡️</span>
            <div className="text-sm text-blue-700">
              <p className="font-semibold mb-1">
                Consejos para una contraseña segura:
              </p>
              <ul className="text-xs space-y-1">
                <li>• Usa al menos 8 caracteres (mejor si son 12 o más)</li>
                <li>• Combina letras mayúsculas y minúsculas</li>
                <li>• Incluye números y símbolos especiales</li>
                <li>• Evita usar información personal</li>
                <li>• No reutilices contraseñas de otras cuentas</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordForm;
