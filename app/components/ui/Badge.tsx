import React from "react";

type BadgeVariant = "blue" | "red" | "green" | "amber" | "purple";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

export function Badge({ variant = "blue", children, className = "", ...props }: BadgeProps) {
  return (
    <span
      className={`badge badge-${variant} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
