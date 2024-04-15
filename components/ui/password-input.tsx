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
            'border-input placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border bg-transparent py-1 pl-3 pr-9 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
        />
        <Button
          type="button"
          size="icon"
          className="absolute right-1 top-0 hover:bg-transparent"
          variant="ghost"
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
