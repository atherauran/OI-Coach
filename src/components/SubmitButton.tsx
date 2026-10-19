"use client";
import { useFormStatus } from "react-dom";
import { Spinner } from "./ui";

// Submit button for server-action forms: disabled with a spinner while the action runs.
export default function SubmitButton({
  className,
  light,
  small,
  disabled,
  children,
}: {
  className: string;
  light?: boolean;
  small?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} className={className}>
      {pending && <Spinner light={light} small={small} />}
      {children}
    </button>
  );
}
