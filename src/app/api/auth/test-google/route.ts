import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    config: {
      googleClientId: process.env.GOOGLE_CLIENT_ID ? `${process.env.GOOGLE_CLIENT_ID.substring(0, 20)}...` : "✗ Missing",
      googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ? "✓ Present" : "✗ Missing",
      nextAuthUrl: process.env.NEXTAUTH_URL,
      nextAuthSecret: process.env.NEXTAUTH_SECRET ? "✓ Present" : "✗ Missing",
      redirectUri: `${process.env.NEXTAUTH_URL}/api/auth/callback/google`,
      nodeEnv: process.env.NODE_ENV,
      domain: process.env.NEXTAUTH_URL?.replace('https://', '').replace('http://', ''),
    },
    instructions: {
      step1: "Add to Google Cloud Console OAuth client:",
      authorizedOrigins: [process.env.NEXTAUTH_URL],
      authorizedRedirectUris: [`${process.env.NEXTAUTH_URL}/api/auth/callback/google`],
      step2: "Add to OAuth consent screen authorized domains:",
      authorizedDomains: [process.env.NEXTAUTH_URL?.replace('https://', '').replace('http://', '')],
      step3: "Ensure app is Published (not in Testing mode)"
    },
    message: "Google OAuth Configuration Check"
  });
}