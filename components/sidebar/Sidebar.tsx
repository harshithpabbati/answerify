import { getUser } from '@/actions/auth';
import { getOrganizations } from '@/actions/organization';

import { EmailsList } from '@/components/organization/sidebar/EmailsList';

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
        <EmailsList orgId={orgId} name={name} slug={slug} />
      </div>
    </div>
  );
}
