"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../components/AuthContext";
import profileService from "../../services/profileService";
import { useToast } from "../../components/ui/Toast";
import { useRouter } from "next/navigation";

/* ========================= Header (same look as Créditos) ========================= */
function HeaderSectionProfile({ activeTab, onTabChange }) {
  return (
    <header className="relative overflow-hidden rounded-2xl border border-[#C7BCE0] bg-white/90 backdrop-blur-sm p-4 mb-4 shadow-lg">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#B276CA] to-[#5E3FA5]" />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-[#5E3FA5] to-[#B276CA] bg-clip-text text-transparent">
          Mi perfil
        </h1>

        <nav
          aria-label="Cambiar vista"
          className="relative inline-flex rounded-xl p-1 border border-[#C7BCE0] bg-[#F7F1FA]"
        >
          <button
            onClick={() => onTabChange("profile")}
            className={`px-3 py-2 text-sm font-bold rounded-lg transition-all ${
              activeTab === "profile"
                ? "bg-white text-[#5E3FA5] shadow-sm"
                : "text-[#4B3284] hover:bg-white/60"
            }`}
            aria-current={activeTab === "profile" ? "page" : undefined}
          >
            📝 Información del perfil
          </button>
          <button
            onClick={() => onTabChange("password")}
            className={`px-3 py-2 text-sm font-bold rounded-lg transition-all ${
              activeTab === "password"
                ? "bg-white text-[#5E3FA5] shadow-sm"
                : "text-[#4B3284] hover:bg-white/60"
            }`}
            aria-current={activeTab === "password" ? "page" : undefined}
          >
            🔒 Cambiar contraseña
          </button>
        </nav>
      </div>
    </header>
  );
}

export default function ProfilePageClient() {
  const { user, login, isAuthenticated, loading } = useAuth();
  const { showSuccess, showError, ToastComponent } = useToast();
  const router = useRouter();

  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    city: "",
    linkedin: "",
    signature: "",
    whatsapp: "",
    emailNotifications: true,
    emailInvoices: true,
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileErrors, setProfileErrors] = useState({});
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState({});
  const [activeTab, setActiveTab] = useState("profile");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated()) {
      router.push("/");
      return;
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    setProfileErrors({});
    setPasswordErrors({});
  }, [activeTab]);

  useEffect(() => {
    const loadProfileData = async () => {
      if (user) {
        setProfileData({
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          email: user.email || "",
          city: user.city || "",
          linkedin: user.linkedin || "",
          signature: user.signature || "",
          whatsapp: user.whatsapp || "",
          emailNotifications:
            user.emailNotifications !== undefined
              ? user.emailNotifications
              : true,
          emailInvoices:
            user.emailInvoices !== undefined ? user.emailInvoices : true,
        });

        if (!user.createdAt) {
          try {
            const profileResponse = await profileService.getProfile();
            if (profileResponse.user) {
              login(profileResponse.user);
            }
          } catch (error) {
            console.error("Error al cargar el perfil:", error);
          }
        }

        setIsLoading(false);
      }
    };

    loadProfileData();
  }, [user, login]);

  const handleProfileChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProfileData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (profileErrors[name]) {
      setProfileErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (passwordErrors[name]) {
      setPasswordErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateProfile = () => {
    const errors = {};
    if (!profileData.firstName.trim())
      errors.firstName = "El nombre es obligatorio";
    if (!profileData.lastName.trim())
      errors.lastName = "El apellido es obligatorio";
    if (!profileData.email.trim())
      errors.email = "El correo electrónico es obligatorio";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email))
      errors.email = "Introduce un correo electrónico válido";
    if (!profileData.city.trim()) errors.city = "La ciudad es obligatoria";
    if (profileData.linkedin.trim()) {
      const linkedinRegex =
        /^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9\-]+\/?$/;
      if (!linkedinRegex.test(profileData.linkedin.trim())) {
        errors.linkedin =
          "Introduce una URL de LinkedIn válida (ej. https://linkedin.com/in/tu-perfil)";
      }
    }
    if (profileData.whatsapp.trim()) {
      const whatsappRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (
        !whatsappRegex.test(
          profileData.whatsapp.trim().replace(/[\s\-\(\)]/g, ""),
        )
      ) {
        errors.whatsapp =
          "Introduce un número válido de WhatsApp (ej. +573001234567)";
      }
    }
    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePassword = () => {
    const errors = {};
    if (!passwordData.currentPassword)
      errors.currentPassword = "La contraseña actual es obligatoria";
    if (!passwordData.newPassword)
      errors.newPassword = "La nueva contraseña es obligatoria";
    else if (passwordData.newPassword.length < 8)
      errors.newPassword = "Debe tener al menos 8 caracteres";
    if (!passwordData.confirmPassword)
      errors.confirmPassword = "Confirma tu nueva contraseña";
    else if (passwordData.newPassword !== passwordData.confirmPassword)
      errors.confirmPassword = "Las contraseñas no coinciden";
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!validateProfile()) return;
    setProfileLoading(true);
    try {
      const response = await profileService.updateProfile({
        ...profileData,
        firstName: profileData.firstName.trim(),
        lastName: profileData.lastName.trim(),
        city: profileData.city.trim(),
        linkedin: profileData.linkedin.trim(),
        signature: profileData.signature.trim(),
        whatsapp: profileData.whatsapp.trim(),
      });
      login(response.user);
      showSuccess("¡Perfil actualizado correctamente!");
    } catch (error) {
      console.error("Error al actualizar el perfil:", error);
      showError("No se pudo actualizar el perfil. Inténtalo de nuevo.");
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!validatePassword()) return;
    setPasswordLoading(true);
    try {
      await profileService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      showSuccess("¡Contraseña cambiada con éxito!");
    } catch {
      showError("No se pudo cambiar la contraseña.");
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 flex items-center justify-center text-gray-500">
        Cargando perfil...
      </div>
    );
  }

  if (!isAuthenticated()) return null;

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-2 md:px-4 text-gray-600 text-sm">
        <div className="container max-w-screen-md mx-auto py-2 md:py-4">
          {/* Outer white container same as Créditos */}
          <div className="bg-white shadow-lg overflow-hidden p-2 md:p-4">
            <HeaderSectionProfile
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />

            <div className="px-0 pb-0 md:px-0 md:pb-0">
              {activeTab === "profile" && (
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  {/* Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-medium text-gray-700 mb-1">
                        Nombre
                      </label>
                      <input
                        name="firstName"
                        value={profileData.firstName}
                        onChange={handleProfileChange}
                        placeholder="Escribe tu nombre"
                        className="w-full p-3 border rounded-xl border-gray-300 focus:ring-2 focus:ring-purple-200 focus:border-[#5E3FA6]"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-gray-700 mb-1">
                        Apellido
                      </label>
                      <input
                        name="lastName"
                        value={profileData.lastName}
                        onChange={handleProfileChange}
                        placeholder="Escribe tu apellido"
                        className="w-full p-3 border rounded-xl border-gray-300 focus:ring-2 focus:ring-purple-200 focus:border-[#5E3FA6]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-gray-700 mb-1">
                      Correo electrónico (no editable)
                    </label>
                    <input
                      disabled
                      value={profileData.email}
                      className="w-full p-3 border rounded-xl border-gray-300 bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-gray-700 mb-1">
                      Ciudad
                    </label>
                    <input
                      name="city"
                      value={profileData.city}
                      onChange={handleProfileChange}
                      placeholder="Ej. Medellín"
                      className="w-full p-3 border rounded-xl border-gray-300 focus:ring-2 focus:ring-purple-200 focus:border-[#5E3FA6]"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-gray-700 mb-1">
                      Perfil de LinkedIn
                    </label>
                    <input
                      name="linkedin"
                      value={profileData.linkedin}
                      onChange={handleProfileChange}
                      placeholder="https://linkedin.com/in/tu-perfil"
                      className="w-full p-3 border rounded-xl border-gray-300 focus:ring-2 focus:ring-purple-200 focus:border-[#5E3FA6]"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-gray-700 mb-1">
                      Firma profesional
                    </label>
                    <textarea
                      name="signature"
                      value={profileData.signature}
                      onChange={handleProfileChange}
                      rows={4}
                      placeholder={`Ejemplo:\nJuan González\n\nTeléfono / WhatsApp: +57 123 456 789`}
                      className="w-full p-3 border rounded-xl border-gray-300 focus:ring-2 focus:ring-purple-200 focus:border-[#5E3FA6]"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-gray-700 mb-1">
                      📱 Número de WhatsApp
                    </label>
                    <input
                      name="whatsapp"
                      value={profileData.whatsapp}
                      onChange={handleProfileChange}
                      placeholder="+57 300 123 4567"
                      className="w-full p-3 border rounded-xl border-gray-300 focus:ring-2 focus:ring-purple-200 focus:border-[#5E3FA6]"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Opcional — Incluye el código de país.
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={profileLoading}
                      className="px-4 py-2 bg-gradient-to-r from-[#5E3FA6] to-[#B276CA] text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                    >
                      {profileLoading ? "Actualizando..." : "Guardar cambios"}
                    </button>
                  </div>
                </form>
              )}

              {activeTab === "password" && (
                <form onSubmit={handlePasswordSubmit} className="space-y-6">
                  <div>
                    <label className="block font-medium text-gray-700 mb-1">
                      Contraseña actual
                    </label>
                    <input
                      type="password"
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      placeholder="Introduce tu contraseña actual"
                      className="w-full p-3 border rounded-xl border-gray-300 focus:ring-2 focus:ring-purple-200 focus:border-[#5E3FA6]"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-gray-700 mb-1">
                      Nueva contraseña
                    </label>
                    <input
                      type="password"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      placeholder="Introduce tu nueva contraseña"
                      className="w-full p-3 border rounded-xl border-gray-300 focus:ring-2 focus:ring-purple-200 focus:border-[#5E3FA6]"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-gray-700 mb-1">
                      Confirmar nueva contraseña
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      placeholder="Repite la nueva contraseña"
                      className="w-full p-3 border rounded-xl border-gray-300 focus:ring-2 focus:ring-purple-200 focus:border-[#5E3FA6]"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={passwordLoading}
                      className="px-4 py-2 bg-gradient-to-r from-[#5E3FA6] to-[#B276CA] text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                    >
                      {passwordLoading ? "Guardando..." : "Cambiar contraseña"}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Account info card */}
            <div className="mt-4 bg-[#F7F1FA]/60 rounded-xl border border-[#C7BCE0] p-4">
              <h3 className="text-lg font-semibold text-[#261942] mb-4">
                Información de la cuenta
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Rol de la cuenta:</span>
                  <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium capitalize">
                    {user?.role || "usuario"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Miembro desde:</span>
                  <span className="ml-2 text-gray-800">
                    {user?.createdAt
                      ? new Date(user.createdAt).toLocaleDateString("es-CO")
                      : "N/D"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {ToastComponent}
    </>
  );
}
