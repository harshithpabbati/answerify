'use client';

import dynamic from 'next/dynamic';
import { useAddDataSource, useViewDataSource } from '@/states/data-source';
import { useManageApiConnections } from '@/states/api-connection';
import {
  useCreateOrganization,
  useInviteMembers,
  useMembers,
  useTestSandbox,
  useUpdateOrganization,
} from '@/states/organization';

// Dynamically import modals to reduce initial bundle size
const AddDataSource = dynamic(() =>
  import('./data-source').then((mod) => mod.AddDataSource)
);
const ViewDataSources = dynamic(() =>
  import('./data-source').then((mod) => mod.ViewDataSources)
);
const CreateOrganization = dynamic(() =>
  import('./organization').then((mod) => mod.CreateOrganization)
);
const UpdateOrganization = dynamic(() =>
  import('./organization').then((mod) => mod.UpdateOrganization)
);
const InviteMembers = dynamic(() =>
  import('./organization').then((mod) => mod.InviteMembers)
);
const ViewMembers = dynamic(() =>
  import('./organization').then((mod) => mod.ViewMembers)
);
const TestSandbox = dynamic(() =>
  import('./organization').then((mod) => mod.TestSandbox)
);
const ManageApiConnections = dynamic(() =>
  import('./api-connection').then((mod) => mod.ManageApiConnections)
);

export function Modals() {
  const [showCreateOrganization] = useCreateOrganization();
  const [showUpdateOrganization] = useUpdateOrganization();
  const [showAddDataSource] = useAddDataSource();
  const [showDataSources] = useViewDataSource();
  const [inviteMembers] = useInviteMembers();
  const [viewMembers] = useMembers();
  const [showTestSandbox] = useTestSandbox();
  const [showApiConnections] = useManageApiConnections();

  return (
    <>
      {showCreateOrganization && <CreateOrganization />}
      {Boolean(showUpdateOrganization) && <UpdateOrganization />}
      {Boolean(showAddDataSource) && <AddDataSource />}
      {Boolean(showDataSources) && <ViewDataSources />}
      {Boolean(inviteMembers) && <InviteMembers />}
      {Boolean(viewMembers) && <ViewMembers />}
      {Boolean(showTestSandbox) && <TestSandbox />}
      {Boolean(showApiConnections) && <ManageApiConnections />}
    </>
  );
}
