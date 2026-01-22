"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const demoUser = localStorage.getItem("demoUser");
    const userProfile = localStorage.getItem("userProfile");

    if (!demoUser) {
      // Not logged in - redirect to login
      router.replace("/login");
    } else if (!userProfile || !JSON.parse(userProfile).profileComplete) {
      // Logged in but profile not complete - redirect to settings
      router.replace("/settings");
    } else {
      // Logged in and profile complete - redirect to interview
      router.replace("/interview");
    }
  }, [router]);

  // Show loading while checking auth
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
