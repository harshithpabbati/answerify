'use client';

import { useAddDataSource, useViewDataSource } from '@/states/data-source';
import {
  useCreateOrganization,
  useInviteMembers,
  useMembers,
  useUpdateOrganization,
} from '@/states/organization';

import { AddDataSource, ViewDataSources } from './data-source';
import {
  CreateOrganization,
  InviteMembers,
  UpdateOrganization,
  ViewMembers,
} from './organization';

export function Modals() {
  const [showCreateOrganization] = useCreateOrganization();
  const [showUpdateOrganization] = useUpdateOrganization();
  const [showAddDataSource] = useAddDataSource();
  const [showDataSources] = useViewDataSource();
  const [inviteMembers] = useInviteMembers();
  const [viewMembers] = useMembers();

  return (
    <>
      {showCreateOrganization && <CreateOrganization />}
      {Boolean(showUpdateOrganization) && <UpdateOrganization />}
      {Boolean(showAddDataSource) && <AddDataSource />}
      {Boolean(showDataSources) && <ViewDataSources />}
      {Boolean(inviteMembers) && <InviteMembers />}
      {Boolean(viewMembers) && <ViewMembers />}
    </>
  );
}
