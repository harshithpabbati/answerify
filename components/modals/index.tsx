'use client';

import {
  useCreateOrganization,
  useUpdateOrganization,
} from '@/states/organization';

import { CreateOrganization, UpdateOrganization } from './organization';

export function Modals() {
  const [showCreateOrganization] = useCreateOrganization();
  const [showUpdateOrganization] = useUpdateOrganization();
  return (
    <>
      {showCreateOrganization && <CreateOrganization />}
      {Boolean(showUpdateOrganization) && <UpdateOrganization />}
    </>
  );
}
