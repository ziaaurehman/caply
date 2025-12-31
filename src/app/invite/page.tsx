"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { CheckCircle, XCircle, Clock, Users, Shield, Mail } from "lucide-react";
import Button from "@/components/ui/Button";

interface InvitationData {
  id: string;
  email: string;
  organization: {
    id: string;
    name: string;
    logo_url?: string;
  };
  role: {
    id: string;
    name: string;
    display_name: string;
    description: string;
  };
  expires_at: string;
}

const InvitePageContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const token = searchParams.get("token");

  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (status === "unauthenticated" && token) {
      // Redirect to login with callback URL to return to this invitation
      router.push(`/login?callbackUrl=${encodeURIComponent(`/invite?token=${token}`)}`);
    }
  }, [status, token, router]);

  useEffect(() => {
    if (!token) {
      setError("Invalid invitation link");
      setLoading(false);
      return;
    }

    // Only validate if user is authenticated or loading
    if (status === "authenticated" || status === "loading") {
      validateInvitation();
    }
  }, [token, status]);

  const validateInvitation = async () => {
    try {
      setLoading(true);
      console.log("Validating invitation token:", token);

      // Try to fetch directly from Supabase first (for debugging)
      try {
        const response = await fetch(
          "/api/debug?check=invitation&token=" + token
        );
        if (response.ok) {
          const debugData = await response.json();
          setDebugInfo(debugData);
          console.log("Debug info:", debugData);
        }
      } catch (e) {
        console.error("Error fetching debug info:", e);
      }

      // Now try the actual validation endpoint
      const response = await fetch(`/api/invitations/validate?token=${token}`);
      const data = await response.json();

      console.log("Validation response:", {
        status: response.status,
        ok: response.ok,
        data,
      });

      if (response.ok) {
        setInvitation(data.invitation);
      } else {
        setError(data.error || "Invalid invitation");
      }
    } catch (error) {
      console.error("Error validating invitation:", error);
      setError("Failed to validate invitation");
    } finally {
      setLoading(false);
    }
  };

  const acceptInvitation = async () => {
    if (!session?.user?.id || !token) {
      // User needs to sign in first
      signIn();
      return;
    }

    try {
      setAccepting(true);

      const response = await fetch("/api/invitations/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          userId: session.user.id,
        }),
      });

      const data = await response.json();
      console.log("Accept response:", {
        status: response.status,
        ok: response.ok,
        data,
      });

      if (response.ok) {
        setAccepted(true);

        // Dispatch custom event to notify other components
        const event = new CustomEvent("invitation-accepted", {
          detail: { organizationId: data.organizationId },
        });
        window.dispatchEvent(event);

        // Redirect to dashboard after 2 seconds with full page reload
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 2000);
      } else {
        setError(data.error || "Failed to accept invitation");
      }
    } catch (error) {
      console.error("Error accepting invitation:", error);
      setError("Failed to accept invitation");
    } finally {
      setAccepting(false);
    }
  };

  const isExpired = invitation && new Date(invitation.expires_at) < new Date();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="text-center text-gray-600 mt-4">
            Validating invitation...
          </p>
        </div>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4 text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Invalid Invitation
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => router.push("/")} variant="outline">
            Go to Homepage
          </Button>

          {/* Debug info for admins */}
          {debugInfo && (
            <div className="mt-8 p-4 bg-gray-100 rounded-lg text-left text-xs overflow-auto max-h-60">
              <details>
                <summary className="cursor-pointer font-medium">
                  Debug Information
                </summary>
                <pre className="mt-2 whitespace-pre-wrap">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to the team!
          </h1>
          <p className="text-gray-600 mb-6">
            You've successfully joined {invitation.organization.name}.
            Redirecting to your dashboard...
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4 text-center">
          <Clock className="h-16 w-16 text-orange-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Invitation Expired
          </h1>
          <p className="text-gray-600 mb-6">
            This invitation to join {invitation.organization.name} has expired.
            Please contact your team administrator for a new invitation.
          </p>
          <Button onClick={() => router.push("/")} variant="outline">
            Go to Homepage
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg max-w-lg w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-8 py-6 text-white text-center">
          {invitation.organization.logo_url ? (
            <img
              src={invitation.organization.logo_url}
              alt={invitation.organization.name}
              className="h-12 w-12 mx-auto mb-3 rounded-full bg-white p-1"
            />
          ) : (
            <Users className="h-12 w-12 mx-auto mb-3" />
          )}
          <h1 className="text-2xl font-bold">You're Invited!</h1>
          <p className="text-primary-100 mt-1">
            Join {invitation.organization.name}
          </p>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center space-x-2 mb-3">
              <Mail className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-600">{invitation.email}</span>
            </div>

            <div className="flex items-center justify-center space-x-2 mb-6">
              <Shield className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-600">
                You'll be joining as a{" "}
                <strong>{invitation.role.display_name}</strong>
              </span>
            </div>

            {invitation.role.description && (
              <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
                <h3 className="font-medium text-blue-900 mb-2">
                  Role Details:
                </h3>
                <p className="text-blue-700 text-sm">
                  {invitation.role.description}
                </p>
              </div>
            )}
          </div>

          {/* Authentication Check */}
          {status === "loading" ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
              <p className="text-gray-600">Checking authentication...</p>
            </div>
          ) : session?.user ? (
            // User is signed in
            <div className="space-y-4">
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-green-800 text-sm text-center">
                  Signed in as <strong>{session.user.email}</strong>
                </p>
              </div>

              {session.user.email?.toLowerCase() ===
                invitation.email.toLowerCase() ? (
                <Button
                  onClick={acceptInvitation}
                  disabled={accepting}
                  className="w-full"
                  size="lg"
                >
                  {accepting ? "Accepting..." : "Accept Invitation"}
                </Button>
              ) : (
                <div className="text-center">
                  <p className="text-orange-600 text-sm mb-4">
                    This invitation is for {invitation.email}, but you're signed
                    in as {session.user.email}.
                  </p>
                  <Button
                    onClick={() => signIn()}
                    variant="outline"
                    className="w-full"
                  >
                    Sign in with {invitation.email}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            // User is not signed in
            <div className="space-y-4">
              <p className="text-gray-600 text-center text-sm mb-4">
                You need to sign in or create an account to accept this
                invitation.
              </p>

              <Button onClick={() => signIn()} className="w-full" size="lg">
                Sign In / Create Account
              </Button>
            </div>
          )}

          {/* Expiration Notice */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              This invitation expires on{" "}
              <strong>
                {new Date(invitation.expires_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Loading fallback component
const InvitePageLoading = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
      <p className="text-center text-gray-600 mt-4">Loading invitation...</p>
    </div>
  </div>
);

// Main page component with Suspense boundary
const InvitePage = () => {
  return (
    <Suspense fallback={<InvitePageLoading />}>
      <InvitePageContent />
    </Suspense>
  );
};

export default InvitePage;
