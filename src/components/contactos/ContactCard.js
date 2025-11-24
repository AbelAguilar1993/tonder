"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import { contactsService } from "../../services/contactsService";
import ContactUnlockModal from "./ContactUnlockModal";

const ContactCard = ({ contact }) => {
  const { isAuthenticated, openAuthModal } = useAuth();
  const [userCredits, setUserCredits] = useState(0);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [unlockedContactData, setUnlockedContactData] = useState(null);

  // Get unlock status from contact data (set by backend) or local unlocked data
  const currentContact = unlockedContactData || contact;
  const isUnlocked = currentContact?.isUnlocked ?? false;
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  const getTextColorForBackground = (hexColor) => {
    if (!hexColor) return "#fff";
    const c = hexColor.substring(1); // fjern #
    const rgb = parseInt(c, 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;

    // Beregn relativ luminans (0 = mørk, 1 = lys)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    return luminance > 0.6 ? "#111" : "#fff"; // threshold 0.6 virker godt
  };

  // Get user credits when authenticated
  useEffect(() => {
    const getUserCredits = async () => {
      if (!isAuthenticated() || !contact?.id) return;

      try {
        setCheckingStatus(true);
        const response = await contactsService.checkUnlockStatus(contact.id);
        if (response.success) {
          setUserCredits(response.userCredits);
        }
      } catch (error) {
        console.error("Error getting user credits:", error);
      } finally {
        setCheckingStatus(false);
      }
    };

    getUserCredits();
  }, [contact?.id, isAuthenticated]);

  const handleUnlockClick = () => {
    if (!isAuthenticated()) {
      // Show auth modal
      openAuthModal();
      return;
    }

    // Show unlock confirmation modal
    setUnlockModalOpen(true);
  };

  const handleUnlockContact = async () => {
    try {
      setUnlocking(true);
      const response = await contactsService.unlockContact(contact.id);

      if (response.success) {
        setUserCredits(response.creditsRemaining);
        setUnlockModalOpen(false);

        // Update contact data with unlocked information
        if (response.contact) {
          setUnlockedContactData({
            ...response.contact,
            isUnlocked: true,
          });
        } else {
          // If no contact data returned, create unlocked version of current contact
          setUnlockedContactData({
            ...contact,
            isUnlocked: true,
          });
        }
      }
    } catch (error) {
      console.error("Error unlocking contact:", error);
      // Show error message
      if (error.response?.status === 402) {
        // Insufficient credits - modal will handle this
        setUserCredits(error.response.data?.userCredits || 0);
      }
    } finally {
      setUnlocking(false);
    }
  };

  const getContactAbbreviation = (name) => {
    if (!isUnlocked) {
      return name;
    }
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex flex-col border-1 border-[#e7e7e7] shadow-[0 8px 24px rgba(0, 0, 0, .06)] rounded-lg">
      <div
        className="flex items-center justify-center h-28 border-b rounded-t-lg p-2 md:p-4"
        style={{
          borderBottomColor: currentContact.company?.color || "#e7e7e7",
          background: `
            linear-gradient(180deg, ${
              currentContact.company?.color || "#e7e7e7"
            } 0 20%, transparent 20% 100%),
            radial-gradient(1000px 320px at 90% -80px, rgba(255,255,255,.14), rgba(255,255,255,0) 60%),
            linear-gradient(180deg, ${
              currentContact.company?.color || "#e7e7e7"
            } 0 20%, #fff 85%)
          `,
        }}
      >
        <img
          src={contact.company?.logo_url}
          alt="Company logo"
          className="h-22 w-auto rounded-lg"
        />
      </div>
      <div className="flex flex-col gap-2 p-2 md:p-4">
        <div className="flex items-center gap-2 text-lg text-gray-700 font-semibold">
          {!isUnlocked && (
            <div className="relative">
              <span
                className="flex items-center justify-center h-11 w-11 rounded-full border-2 text-sm font-bold shadow-sm"
                style={{
                  backgroundColor: currentContact.company?.color || "#9CA3AF",
                  borderColor: currentContact.company?.color || "#9CA3AF",
                  color: getTextColorForBackground(
                    currentContact.company?.color || "#9CA3AF",
                  ),
                  boxShadow: `0 0 8px ${
                    currentContact.company?.color
                      ? currentContact.company.color + "66"
                      : "#9CA3AF66"
                  }`,
                }}
              >
                {getContactAbbreviation(currentContact.name)}
              </span>
              <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-white rounded-full flex items-center justify-center border-1 border-gray-200">
                <svg
                  className="w-2.5 h-2.5 text-green-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          )}
          {!isUnlocked && <span>Reclutador: 🔐</span>}
          {isUnlocked && currentContact.name} ({currentContact.company?.name})
        </div>
        <div className="text-sm text-gray-600">
          {isUnlocked && currentContact.position
            ? `${currentContact.position} ⋅ `
            : ""}
          📍 {currentContact.city || currentContact.country}
        </div>

        {/* Contact Details */}
        <div
          className="flex gap-2 w-full rounded-lg py-2 px-4 border-1 flex-row justify-evenly items-center flex-wrap whitespace-nowrap overflow-x-hidden"
          style={{
            borderColor: currentContact.company?.color || "#e7e7e7",
          }}
        >
          {/* Name/Contact person icon */}
          <div className="flex items-center gap-1 overflow-x-hidden">
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-gray-600">
                👤 Reclutador:
              </span>
            </div>
            <div className="flex items-center gap-1 w-full overflow-x-hidden">
              {!isUnlocked ? (
                <span>🔐</span>
              ) : (
                <span className="text-xs text-gray-600 overflow-hidden text-ellipsis whitespace-nowrap">
                  {currentContact.name}
                </span>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-gray-200"></div>

          {/* Email icon */}
          <div className="flex items-center gap-1 overflow-x-hidden">
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-gray-600">
                📧 Email:
              </span>
            </div>
            <div className="flex items-center gap-1 w-full overflow-x-hidden">
              {!isUnlocked ? (
                <span>🔐</span>
              ) : (
                <span className="text-xs text-gray-600 w-full overflow-x-hidden text-ellipsis whitespace-nowrap">
                  {currentContact.email}
                </span>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-gray-200"></div>

          {/* Phone icon */}
          <div className="flex items-center gap-1 overflow-x-hidden">
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-gray-600">
                📱 Teléfono:
              </span>
            </div>
            <div className="flex items-center gap-1 w-full overflow-x-hidden">
              {!isUnlocked ? (
                <span>🔐</span>
              ) : (
                <span className="text-xs text-gray-600 w-full overflow-x-hidden text-ellipsis whitespace-nowrap">
                  {currentContact.phone || "Not Available"}
                </span>
              )}
            </div>
          </div>
        </div>
        {!isUnlocked ? (
          <div className="flex">
            <button
              onClick={handleUnlockClick}
              disabled={checkingStatus}
              className="w-full py-2 rounded-lg text-sm cursor-pointer border-1 hover:translate-y-[-1px] font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                borderColor: currentContact.company?.color || "#e7e7e7",
                boxShadow: `0 4px 12px color-mix(in srgb, ${
                  currentContact.company?.color || "#e7e7e7"
                } 22%, transparent)`,
                backgroundColor: "transparent",
                color: "#9CA3AF",
              }}
            >
              {checkingStatus ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Accede al reclutador ahora 🚀
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="flex mt-2">
            <button
              onClick={handleUnlockClick}
              disabled={checkingStatus}
              className="w-full py-2 rounded-lg text-sm cursor-pointer border-1 hover:translate-y-[-1px] font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                backgroundColor: currentContact.company?.color || "#e7e7e7",
                boxShadow: `0 4px 12px color-mix(in srgb, ${
                  currentContact.company?.color || "#e7e7e7"
                } 22%, transparent)`,
                color: "white",
              }}
            >
              Enviar mensaje ahora 🚀
            </button>
          </div>
        )}
      </div>

      {/* Contact Unlock Modal */}
      <ContactUnlockModal
        isOpen={unlockModalOpen}
        onClose={() => setUnlockModalOpen(false)}
        onConfirm={handleUnlockContact}
        contact={currentContact}
        userCredits={userCredits}
        isLoading={unlocking}
      />
    </div>
  );
};

export default ContactCard;
