'use client';

import { useAddDataSource } from '@/states/data-source';
import {
  useCreateOrganization,
  useUpdateOrganization,
} from '@/states/organization';

import { AddDataSource } from './data-source';
import { CreateOrganization, UpdateOrganization } from './organization';

export function Modals() {
  const [showCreateOrganization] = useCreateOrganization();
  const [showUpdateOrganization] = useUpdateOrganization();
  const [showAddDataSource] = useAddDataSource();

  return (
    <>
      {showCreateOrganization && <CreateOrganization />}
      {Boolean(showUpdateOrganization) && <UpdateOrganization />}
      {Boolean(showAddDataSource) && <AddDataSource />}
    </>
  );
}
