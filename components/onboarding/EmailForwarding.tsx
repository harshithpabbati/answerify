'use client';

import { useRouter } from 'next/navigation';
import { updateOnboardingStep } from '@/actions/auth';
import {
  ArrowRightIcon,
  CheckIcon,
  ClipboardCopyIcon,
} from '@radix-ui/react-icons';

import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { Button } from '@/components/ui/button';

interface Props {
  email: string;
  slug: string;
}

export function EmailForwarding({ email, slug }: Props) {
  const router = useRouter();
  const { copied, copyToClipboard } = useCopyToClipboard();

  const handleOnSetupForwarding = async () => {
    await updateOnboardingStep(slug, {
      hasOnboarded: false,
      step: 'data-sources',
    });
    router.push(`/onboarding/${slug}/data-sources`);
  };

  return (
    <div>
      <h2 className="font-display text-3xl font-black uppercase tracking-tight text-white">Setup email forwarding</h2>
      <p className="font-mono mt-1 text-sm text-gray-400">
        Follow the instructions below to setup email forwarding from your
        support account
      </p>
      <div className="mt-4">
        <p className="font-mono text-sm text-gray-400">
          Please consult your email providers documentation for further guidance
          on forwarding emails. If you require assistance with configuring
          automatic forwarding, please reach out to your email provider
          directly.
        </p>
        <ul className="font-mono my-6 ml-6 list-disc text-sm text-gray-400 [&>li]:mt-2">
          <li>
            <a className="text-[#FF4500] underline" href="https://support.google.com/mail/answer/10957">Gmail</a>
          </li>
          <li>
            <a className="text-[#FF4500] underline" href="https://support.google.com/a/answer/10486484">Google Workspace</a>
          </li>
          <li>
            <a className="text-[#FF4500] underline" href="https://docs.microsoft.com/en-us/microsoft-365/admin/email/configure-email-forwarding?view=o365-worldwide">Microsoft 365</a>
          </li>
          <li>
            <a className="text-[#FF4500] underline" href="https://docs.microsoft.com/en-us/exchange/recipients/user-mailboxes/email-forwarding?view=exchserver-2019">Microsoft Exchange Server</a>
          </li>
        </ul>
        <div className="mt-4 flex items-center justify-between gap-2 border border-[#FF4500]/30 bg-[#0a0a0a] p-4">
          <p className="font-mono text-sm text-white">{email}</p>
          <Button
            variant="neutral"
            size="icon"
            onClick={() => copyToClipboard(email)}
          >
            {copied ? <CheckIcon /> : <ClipboardCopyIcon />}
          </Button>
        </div>
        <Button
          onClick={handleOnSetupForwarding}
          className="float-right mt-8"
          size="lg"
        >
          Next
          <ArrowRightIcon className="ml-2" />
        </Button>
      </div>
    </div>
  );
}
