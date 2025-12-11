"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, CheckCircle, RefreshCw, AlertCircle } from "lucide-react";
import Button from "@/components/ui/Button";

interface VerifyEmailPageProps {
  searchParams: Promise<{
    email?: string;
    verified?: string;
  }>;
}

export default function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const router = useRouter();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const params = use(searchParams);
  const emailParam = params?.email || "";

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }

    // Check if already verified
    if (params?.verified === "true") {
      setSuccess("Email verified successfully! You can now log in.");
    }
  }, [emailParam, params]);

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const pastedCode = value.slice(0, 6).split("");
      const newCode = [...code];
      pastedCode.forEach((char, i) => {
        if (index + i < 6 && /^\d$/.test(char)) {
          newCode[index + i] = char;
        }
      });
      setCode(newCode);
      // Focus on the last filled input or the submit button
      const lastFilledIndex = Math.min(index + pastedCode.length - 1, 5);
      if (lastFilledIndex < 5) {
        const nextInput = document.getElementById(`code-${lastFilledIndex + 1}`);
        nextInput?.focus();
      }
      return;
    }

    if (!/^\d$/.test(value) && value !== "") {
      return;
    }

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const verificationCode = code.join("");

    if (verificationCode.length !== 6) {
      setError("Please enter the complete 6-digit code");
      setIsLoading(false);
      return;
    }

    if (!email) {
      setError("Email address not found. Please try registering again.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/verify-email-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          code: verificationCode,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.error || "Invalid verification code. Please try again.");
        setIsLoading(false);
        return;
      }

      setSuccess("Email verified successfully! Redirecting to login...");
      
      // Redirect to login page after 2 seconds
      setTimeout(() => {
        router.push("/login?verified=true");
      }, 2000);
    } catch (err) {
      console.error("Verification error:", err);
      setError("Failed to verify email. Please try again.");
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      setError("Email address not found. Please try registering again.");
      return;
    }

    setIsResending(true);
    setError(null);
    setResent(false);

    try {
      const response = await fetch("/api/auth/send-verification-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.error || "Failed to resend verification code. Please try again.");
      } else {
        setResent(true);
        setSuccess("Verification code sent successfully! Check your email.");
        setTimeout(() => setResent(false), 5000);
        // Clear the code inputs
        setCode(["", "", "", "", "", ""]);
        document.getElementById("code-0")?.focus();
      }
    } catch (err) {
      console.error("Resend error:", err);
      setError("Failed to resend verification code. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary-100 rounded-full flex items-center justify-center">
            <Mail className="h-8 w-8 text-primary-600" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Verify your email
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            We've sent a 6-digit verification code to{" "}
            {email && <strong className="text-gray-900">{email}</strong>}
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-600">{success}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Enter verification code
              </label>
              <div className="flex justify-center gap-2">
                {code.map((digit, index) => (
                  <input
                    key={index}
                    id={`code-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-12 h-14 text-center text-2xl font-semibold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    autoFocus={index === 0}
                  />
                ))}
              </div>
            </div>

            <div>
              <Button
                type="submit"
                size="lg"
                isLoading={isLoading}
                className="w-full"
              >
                {isLoading ? "Verifying..." : "Verify Email"}
              </Button>
            </div>
          </form>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <CheckCircle className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Didn't receive the code?
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Check your spam folder</li>
                    <li>Make sure you entered the correct email address</li>
                    <li>The code expires in 15 minutes</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col space-y-3">
            <button
              onClick={handleResendCode}
              disabled={isResending || resent}
              className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResending ? (
                <>
                  <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {resent ? "Code sent!" : "Resend verification code"}
                </>
              )}
            </button>

            <Link
              href="/login"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Back to Login
            </Link>

            <Link
              href="/signup"
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Try different email
            </Link>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Having trouble? Contact our support team for assistance.
          </p>
        </div>
      </div>
    </div>
  );
}
