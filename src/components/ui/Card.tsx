import React from "react";
import { cn } from "../../utils/cn";

type Props = React.HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
};

export function Card({ interactive, className, ...rest }: Props) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-gray-200 bg-white shadow-sm",
        interactive && "hover:border-gray-300 hover:shadow-md transition-all duration-200 active:scale-[0.99]",
        "animate-fade-in-up",
        className
      )}
      {...rest}
    />
  );
}

export function CardHeader({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 pb-2", className)} {...rest} />;
}

export function CardContent({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-4 pb-4", className)} {...rest} />;
}

export function CardFooter({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-4 pb-4 pt-2", className)} {...rest} />;
}
