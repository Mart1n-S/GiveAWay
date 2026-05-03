interface Props {
  message?: string;
}

export function FieldError({ message }: Props) {
  if (!message) return null;
  return <p className="mt-1 text-xs font-medium text-destructive">{message}</p>;
}
