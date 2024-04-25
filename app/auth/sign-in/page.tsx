import React from 'react';
import { Metadata } from 'next';
import { Link } from 'next-view-transitions';

import { siteConfig } from '@/lib/config';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SignIn, SocialLogins } from '@/components/auth';

export const metadata: Metadata = {
  title: 'Sign in',
};

export default function SignInPage() {
  return (
    <div className="z-10 flex flex-1 items-center justify-center">
      <Card className="w-[25rem] max-w-[calc(100vw-5vw)]">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>to continue to {siteConfig.name}</CardDescription>
        </CardHeader>
        <CardContent>
          <>
            <SocialLogins />
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background text-muted-foreground px-2">
                  Or
                </span>
              </div>
            </div>
            <SignIn />
          </>
        </CardContent>
        <CardFooter className="flex flex-col items-start gap-1 text-sm">
          <p>
            Forgot password?{' '}
            <Link
              className="text-muted-foreground underline"
              href={{ pathname: '/auth/forgot-password' }}
            >
              Reset here
            </Link>
          </p>
          <p>
            No account?{' '}
            <Link
              className="text-muted-foreground underline"
              href={{ pathname: '/auth/sign-up' }}
            >
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
