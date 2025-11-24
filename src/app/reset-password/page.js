"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ResetPasswordForm from "../../components/ResetPasswordForm";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const tokenParam = searchParams.get("token");
    if (!tokenParam) {
      setError(
        "Token de restablecimiento no encontrado. Por favor, solicita un nuevo enlace de restablecimiento.",
      );
      return;
    }
    setToken(tokenParam);
  }, [searchParams]);

  const handleSuccess = () => {
    setSuccess(true);
    setError("");
  };

  const handleError = (errorMessage) => {
    setError(errorMessage);
    setSuccess(false);
  };

  const handleBackToLogin = () => {
    router.push("/");
  };

  if (!token && !error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div
            className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-[#5E3FA6] rounded-full mb-4"
            role="status"
            aria-label="loading"
          >
            <span className="sr-only">Cargando...</span>
          </div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (error && !token) {
    return (
      <div className="h-full bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md mx-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 overflow-hidden w-full">
          <div className="p-8 text-center">
            <div className="text-6xl mb-6">❌</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">
              Enlace Inválido
            </h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={handleBackToLogin}
              className="w-full bg-gradient-to-r from-[#5E3FA6] to-[#B276CA] text-white py-3 px-6 rounded-xl font-semibold hover:from-[#4A2F85] hover:to-[#9B5AA3] transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl cursor-pointer"
            >
              🚀 Ir al Inicio de Sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="h-full bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md mx-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 overflow-hidden w-full">
          <div className="p-8 text-center">
            <div className="text-6xl mb-6">✅</div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#5E3FA6] to-[#B276CA] bg-clip-text text-transparent mb-4">
              ¡Contraseña Actualizada!
            </h1>
            <p className="text-gray-600 mb-6">
              Tu contraseña ha sido restablecida exitosamente. Ya puedes iniciar
              sesión con tu nueva contraseña.
            </p>

            <div className="bg-green-50/80 backdrop-blur-sm border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
              <div className="flex items-center justify-center">
                <span className="text-green-500 mr-2">🛡️</span>
                Tu cuenta está ahora segura
              </div>
            </div>

            <button
              onClick={handleBackToLogin}
              className="w-full bg-gradient-to-r from-[#5E3FA6] to-[#B276CA] text-white py-4 px-6 rounded-xl font-semibold hover:from-[#4A2F85] hover:to-[#9B5AA3] transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl cursor-pointer"
            >
              <span className="flex items-center justify-center">
                <span className="mr-2">🚀</span>
                Iniciar Sesión
              </span>
            </button>

            <p className="text-xs text-gray-500 mt-4">
              💡 Recuerda mantener tu nueva contraseña en privado
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center p-4">
      <ResetPasswordForm
        token={token}
        onSuccess={handleSuccess}
        onError={handleError}
      />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center p-4">
          <div className="text-center">
            <div
              className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-[#5E3FA6] rounded-full mb-4"
              role="status"
              aria-label="loading"
            >
              <span className="sr-only">Cargando...</span>
            </div>
            <p className="text-gray-600">Cargando...</p>
          </div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
