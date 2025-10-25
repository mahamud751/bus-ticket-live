"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { MapPin, Mail, Lock, User, Phone, Eye, EyeOff } from "lucide-react";
import { toast } from "react-hot-toast";

export default function SignUpPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate passwords match
      if (formData.password !== formData.confirmPassword) {
        toast.error("Passwords do not match");
        setIsLoading(false);
        return;
      }

      // Validate password strength
      if (formData.password.length < 6) {
        toast.error("Password must be at least 6 characters");
        setIsLoading(false);
        return;
      }

      // Call signup API
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Something went wrong");
        setIsLoading(false);
        return;
      }

      toast.success("Account created successfully!");

      // Auto sign in after successful signup
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error(
          "Account created but failed to sign in. Please try signing in manually."
        );
        router.push("/auth/signin");
      } else {
        toast.success("Signed in successfully!");
        router.push("/");
      }
    } catch (error) {
      console.error("Signup error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      await signIn("google", { callbackUrl: "/" });
    } catch (error) {
      console.error("Google signup error:", error);
      toast.error("Failed to sign up with Google");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 flex items-center justify-center py-4 sm:py-8 md:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-4 sm:space-y-6 md:space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 sm:h-16 sm:w-16 bg-white rounded-full flex items-center justify-center">
            <MapPin className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
          </div>
          <h2 className="mt-3 sm:mt-4 md:mt-6 text-xl sm:text-2xl md:text-3xl font-bold text-white">
            Create your account
          </h2>
          <p className="mt-2 text-sm sm:text-base text-blue-100">
            Join thousands of travelers booking bus tickets
          </p>
        </div>

        <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl mx-2 sm:mx-0">
          <CardHeader className="text-center pb-3 sm:pb-4">
            <CardTitle className="text-lg sm:text-xl text-foreground">
              Sign up for BusTicket
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              {/* Name Input */}
              <div>
                <Label htmlFor="name" className="text-foreground font-medium">
                  Full Name
                </Label>
                <div className="mt-1 relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="pl-10 h-11 sm:h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-base touch-manipulation"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              {/* Email Input */}
              <div>
                <Label htmlFor="email" className="text-foreground font-medium">
                  Email Address
                </Label>
                <div className="mt-1 relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="pl-10 h-11 sm:h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-base touch-manipulation"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              {/* Phone Input */}
              <div>
                <Label htmlFor="phone" className="text-foreground font-medium">
                  Phone Number
                </Label>
                <div className="mt-1 relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="pl-10 h-11 sm:h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-base touch-manipulation"
                    placeholder="Enter your phone number"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <Label
                  htmlFor="password"
                  className="text-foreground font-medium"
                >
                  Password
                </Label>
                <div className="mt-1 relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="pl-10 pr-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Create a password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground touch-manipulation p-1"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password Input */}
              <div>
                <Label
                  htmlFor="confirmPassword"
                  className="text-foreground font-medium"
                >
                  Confirm Password
                </Label>
                <div className="mt-1 relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="pl-10 pr-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground touch-manipulation p-1"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 sm:h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium text-base touch-manipulation"
              >
                {isLoading ? "Creating account..." : "Create Account"}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Google Sign Up */}
            <Button
              variant="outline"
              onClick={handleGoogleSignUp}
              className="w-full h-11 sm:h-12 text-base touch-manipulation"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign up with Google
            </Button>

            <div className="text-center">
              <button
                onClick={() => router.push("/")}
                className="text-blue-600 hover:text-blue-800 text-sm touch-manipulation p-2"
              >
                ← Back to Home
              </button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-4 sm:mt-6">
          <p className="text-blue-100 text-sm">
            Already have an account?{" "}
            <button
              onClick={() => router.push("/auth/signin")}
              className="text-white hover:underline font-medium touch-manipulation p-1"
            >
              Sign in here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
