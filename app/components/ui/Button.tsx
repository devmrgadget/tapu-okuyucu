import React from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "success";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: React.ReactNode;
}

export function Button({ variant = "primary", children, className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`btn-${variant} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
