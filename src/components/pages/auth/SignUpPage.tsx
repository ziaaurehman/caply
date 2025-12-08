"use client";
import { useEffect } from "react";
import Link from "next/link";
import { PieChart } from "lucide-react";
import SignUpForm from "./SignUpForm";
import { useSession } from "next-auth/react";

export default function SignUpPage() {
  const { status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      window.location.href = "/dashboard";
    }
  }, [status]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link
          href="/"
          className="flex justify-center items-center mb-4 text-primary-600 hover:text-primary-700"
        >
          ← Back to Home
        </Link>
        <div className="flex justify-center">
          <PieChart className="h-12 w-12 text-primary-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Create your account
        </h2>
        <p className="mt-2 text-center text-base text-gray-600">
          Join Caply and start optimizing your team's productivity
        </p>
      </div>
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-10 px-6 shadow rounded-2xl sm:px-10">
          <SignUpForm />
        </div>
      </div>
    </div>
  );
}
