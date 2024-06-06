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
import { SignUp, SocialLogins } from '@/components/auth';

export const metadata: Metadata = {
  title: 'Sign up',
};

export default function SignUpPage() {
  return (
    <div className="bg-grid z-10 flex flex-1 items-center justify-center bg-[size:70px_70px]">
      <Card className="w-[25rem] max-w-[calc(100vw-5vw)]">
        <CardHeader>
          <CardTitle>Sign up</CardTitle>
          <CardDescription>to continue to {siteConfig.name}</CardDescription>
        </CardHeader>
        <CardContent>
          <SocialLogins />
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background text-foreground px-2">Or</span>
            </div>
          </div>
          <SignUp />
        </CardContent>
        <CardFooter className="flex gap-1 text-sm">
          <p>Already have an account?</p>
          <Link className="text-foreground underline" href="/auth/sign-in">
            Sign in
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
