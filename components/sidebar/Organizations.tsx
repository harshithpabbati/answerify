import { getOrganizations } from '@/actions/organization';

import { Organization } from './Organization';

export async function Organizations() {
  const organizations = await getOrganizations();
  return (
    <div className="mt-4 flex flex-col items-center justify-center gap-2">
      {organizations.map((o) => (
        <Organization key={o.id} {...o} />
      ))}
    </div>
  );
}
