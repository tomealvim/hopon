import React from "react";
import { cn } from "../../utils/cn";

type Props = React.HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
};

export function Card({ interactive, className, ...rest }: Props) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-sm",
        interactive && "hover:bg-white/10 hover:shadow-md transition-all",
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
