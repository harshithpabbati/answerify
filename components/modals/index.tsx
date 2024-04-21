'use client';

import { useAddDataSource, useViewDataSource } from '@/states/data-source';
import {
  useCreateOrganization,
  useUpdateOrganization,
} from '@/states/organization';

import { AddDataSource, ViewDataSources } from './data-source';
import { CreateOrganization, UpdateOrganization } from './organization';

export function Modals() {
  const [showCreateOrganization] = useCreateOrganization();
  const [showUpdateOrganization] = useUpdateOrganization();
  const [showAddDataSource] = useAddDataSource();
  const [showDataSources] = useViewDataSource();

  return (
    <>
      {showCreateOrganization && <CreateOrganization />}
      {Boolean(showUpdateOrganization) && <UpdateOrganization />}
      {Boolean(showAddDataSource) && <AddDataSource />}
      {Boolean(showDataSources) && <ViewDataSources />}
    </>
  );
}
