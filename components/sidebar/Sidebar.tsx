import { Suspense } from 'react';
import { getUser } from '@/actions/auth';
import { getOrganizations } from '@/actions/organization';

import { EmailsList } from '@/components/organization/sidebar/EmailsList';
import { EmailSkeleton } from '@/components/organization/sidebar/EmailSkeleton';

import { CreateOrganization } from './CreateOrganization';
import { Organizations } from './Organizations';
import { User } from './User';

interface Props {
  orgId: string;
  name: string;
  slug: string;
}

export async function Sidebar({ orgId, name, slug }: Props) {
  const {
    data: { user },
  } = await getUser();
  if (!user?.id) return null;

  const organizations = await getOrganizations();

  return (
    <div className="flex h-dvh w-full md:w-auto">
      <div className="bg-background relative flex h-dvh w-16 flex-col items-center justify-between border-r">
        <Organizations organizations={organizations} />
        <div className="flex flex-col items-center justify-center gap-2 p-2">
          <CreateOrganization />
          <User user={user} />
        </div>
      </div>
      <div className="bg-background border-r-none size-full md:w-[40dvw] md:border-r lg:w-[25dvw]">
        <Suspense fallback={<div className="max-h-dvh"><div className="flex h-[60px] items-center justify-between border-b p-4"><h3 className="font-semibold">{name}</h3></div><div className="flex h-[calc(100dvh-60px)] flex-col overflow-auto">{Array.from({ length: 10 }).map((_, i) => <EmailSkeleton key={i} />)}</div></div>}>
          <EmailsList orgId={orgId} name={name} slug={slug} />
        </Suspense>
      </div>
    </div>
  );
}
