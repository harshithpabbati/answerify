import { getThreads } from '@/actions/email';

import { Email } from './Email';

interface Props {
  orgId: string;
  name: string;
  slug: string;
}

export async function EmailsList({ orgId, name, slug }: Props) {
  const { data } = await getThreads(orgId);
  return (
    <div>
      <div className="border-b p-4">
        <h3 className="font-semibold">{name}</h3>
      </div>
      <div className="flex flex-col">
        {data?.map((e) => <Email key={e.id} slug={slug} {...e} />)}
      </div>
    </div>
  );
}
