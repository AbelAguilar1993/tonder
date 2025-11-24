"use client";

import { useAuth } from "./AuthContext";
import AuthModal from "./AuthModal";

export default function GlobalAuthModal() {
  const { isAuthModalOpen, closeAuthModal, login } = useAuth();

  return (
    <AuthModal
      isOpen={isAuthModalOpen}
      onClose={closeAuthModal}
      onAuthSuccess={login}
    />
  );
}
