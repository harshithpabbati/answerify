'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { updateUser } from '@/actions/auth';
import { ClipboardCopyIcon } from '@radix-ui/react-icons';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface Props {
  email: string;
  slug: string;
}

export function EmailForwarding({ email, slug }: Props) {
  const router = useRouter();
  const handleOnSetupForwarding = async () => {
    await updateUser({
      data: {
        onboarding: {
          hasOnboarded: true,
          slug,
          onboardingStep: 3,
        },
      },
    });
    // router.push(`/onboarding/${slug}/dns`);
    router.push(`/org/${slug}`);
  };

  return (
    <div>
      <h2 className="text-3xl font-semibold">Setup email forwarding</h2>
      <p className="text-muted-foreground mt-1">
        Follow the instructions below to setup email forwarding from your
        support account
      </p>
      <div className="mt-4">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
            <CardDescription>
              Follow the instructions below to forward emails to answerify
            </CardDescription>
          </CardHeader>
          <CardContent>
            Please consult your email providers documentation for further
            guidance on forwarding emails.If you require assistance with
            configuring automatic forwarding, please reach out to your email
            provider directly.
            <ul className="my-6 ml-6 list-disc [&>li]:mt-2">
              <li>
                <a
                  className="underline"
                  href="https://support.google.com/mail/answer/10957"
                >
                  Gmail
                </a>
              </li>
              <li>
                <a
                  className="underline"
                  href="https://support.google.com/a/answer/10486484"
                >
                  Google Workspace
                </a>
              </li>
              <li>
                <a
                  className="underline"
                  href="https://docs.microsoft.com/en-us/microsoft-365/admin/email/configure-email-forwarding?view=o365-worldwide"
                >
                  Microsoft 365
                </a>
              </li>
              <li>
                <a
                  className="underline"
                  href="https://docs.microsoft.com/en-us/exchange/recipients/user-mailboxes/email-forwarding?view=exchserver-2019"
                >
                  Microsoft Exchange Server
                </a>
              </li>
            </ul>
          </CardContent>
        </Card>
        <div className="bg-muted mt-4 flex items-center justify-between gap-2 rounded-md p-4">
          <p>{email}</p>
          <Button size="icon" variant="outline">
            <ClipboardCopyIcon />
          </Button>
        </div>
        <Button
          onClick={handleOnSetupForwarding}
          className="mt-8 w-full"
          size="lg"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
