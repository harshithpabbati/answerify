import React from 'react';
import Link from 'next/link';
import { getUser } from '@/actions/auth';

import { buttonVariants } from '@/components/ui/button';

import { User } from '../sidebar';

interface Props {
  isDashboard?: boolean;
}

export async function Header({ isDashboard = true }: Props) {
  const {
    data: { user },
  } = await getUser();

  return (
    <header className="bg-background sticky top-0 flex h-16 items-center justify-between gap-4 border-b px-4 md:px-6">
      <Link href="/">
        <h1 className="text-lg font-semibold">Answerify</h1>
      </Link>
      {user?.id ? (
        <>
          {isDashboard ? (
            <User user={user} />
          ) : (
            <Link href="/dashboard" className={buttonVariants()}>
              Go to dashboard
            </Link>
          )}
        </>
      ) : (
        <div className="flex gap-2">
          <Link href="/auth/sign-in" className={buttonVariants()}>
            Sign in
          </Link>
          <Link
            href="/auth/sign-up"
            className={buttonVariants({ variant: 'outline' })}
          >
            Sign up
          </Link>
        </div>
      )}
    </header>
  );
}
