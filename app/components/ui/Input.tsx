import React, { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = "", ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            className={`input-field ${icon ? "pl-9" : ""} ${
              error ? "border-[var(--accent-red)] focus:ring-[var(--accent-red)]" : ""
            } ${className}`}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-sm text-[var(--accent-red)]">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
