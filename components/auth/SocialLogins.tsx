'use client';

import { createBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

export function SocialLogins() {
  const supabase = createBrowserClient();
  const handleSocialLogin = async (social: 'twitter' | 'github') => {
    await supabase.auth.signInWithOAuth({
      provider: social,
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <Button
        onClick={() => handleSocialLogin('twitter')}
        className="w-full"
        variant="outline"
        size="lg"
      >
        Continue with Google
      </Button>
      <Button
        onClick={() => handleSocialLogin('github')}
        className="w-full"
        variant="outline"
        size="lg"
      >
        Continue with GitHub
      </Button>
    </div>
  );
}
