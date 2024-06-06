'use client';

import React, { useState } from 'react';
import { EyeClosedIcon, EyeOpenIcon } from '@radix-ui/react-icons';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface PasswordInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const [show, setShow] = useState(false);

    return (
      <div className="relative">
        <input
          {...props}
          ref={ref}
          type={show ? 'text' : 'password'}
          className={cn(
            'rounded-base font-base selection:bg-main flex h-10 w-full border-2 border-black bg-white px-3 py-2 text-sm ring-offset-white selection:text-black file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
        />
        <Button
          variant="link"
          type="button"
          size="icon"
          className="absolute right-1 top-0 hover:bg-transparent"
          onClick={() => setShow((s) => !s)}
        >
          {show ? (
            <EyeClosedIcon className="size-4" />
          ) : (
            <EyeOpenIcon className="size-4" />
          )}
        </Button>
      </div>
    );
  }
);
PasswordInput.displayName = 'PasswordInput';

export { PasswordInput };
