import { useEffect, useState } from 'react';
import { getSources } from '@/actions/source';
import { Tables } from '@/database.types';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  orgId: string;
}

export function ViewDataSourcesForm({ orgId }: Props) {
  const [data, setData] = useState<Tables<'datasource'>[]>([]);

  useEffect(() => {
    if (!orgId) return;

    const fetchSources = async () => {
      const { data, error } = await getSources(orgId);
      if (error) return;
      setData(data);
    };

    fetchSources();
  }, [orgId]);

  return (
    <div>
      <Label>URLs</Label>
      <div className="mt-2 flex flex-col gap-2">
        {data.map((source) => (
          <Input key={source.id} value={source.url} readOnly />
        ))}
      </div>
    </div>
  );
}
