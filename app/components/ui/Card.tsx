import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
}

export function Card({ children, className = "", padding = "md", ...props }: CardProps) {
  const paddingMap = {
    none: "p-0",
    sm: "p-3",
    md: "p-5",
    lg: "p-8",
  };

  return (
    <div
      className={`glass-card ${paddingMap[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
