import { Metadata } from 'next';
import { getOrganizationBySlug } from '@/actions/organization';
import { EnvelopeOpenIcon } from '@radix-ui/react-icons';

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const { data, error } = await getOrganizationBySlug(params.slug);
  return {
    title: error ? 'Not found' : data?.name,
  };
}

export default function OrgPage() {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-2">
      <div className="bg-background rounded-full border p-4">
        <EnvelopeOpenIcon className="size-5" />
      </div>
      <h3 className="text-xl font-semibold">Choose a Conversation to View</h3>
      <p className="text-muted-foreground text-center">
        Begin by selecting a conversation from the list on the left to view its
        contents
      </p>
    </div>
  );
}
