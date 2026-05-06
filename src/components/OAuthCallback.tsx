import React, { useEffect, useState, useRef } from "react";
import * as api from "../lib/api";
import { storeTokens } from "../lib/oauthUtils";
import { Loader } from "lucide-react";

/**
 * OAuth Callback Handler Component
 * This component is called from App.tsx when OAuth callback parameters are detected
 */
export const OAuthCallback: React.FC<{
  service: "jira";
  state: string;
  onSuccess: (tokenType: "azure" | "jira") => void;
  onError: (error: string) => void;
}> = ({ service, state, onSuccess, onError }) => {
  const [loading, setLoading] = useState(true);
  const hasCalledRef = useRef(false);

  useEffect(() => {
    if (hasCalledRef.current) return; // Prevent duplicate calls
    hasCalledRef.current = true;

    const handleCallback = async () => {
      try {
        // Retrieve the token that was already exchanged on the backend
        const token = await api.retrieveJiraToken(state);
        storeTokens(undefined, token);

        setLoading(false);
        onSuccess(service)
      } catch (err: any) {
        onError(err.message || "Failed to authenticate");
        setLoading(false);
      }
    };

    handleCallback();
  }, [state, service]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F7F3]">
        <Loader className="w-12 h-12 animate-spin text-[#A4B494] mb-4" />
        <p className="text-[#5A6355] font-semibold">
          Finalizing {service.toUpperCase()} authentication...
        </p>
      </div>
    );
  }

  return null;
};
