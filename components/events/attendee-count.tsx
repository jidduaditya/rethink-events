type AttendeeCountProps = {
  count: number;
};

export function AttendeeCount({ count }: AttendeeCountProps) {
  return (
    <span className="font-mono text-label-mono uppercase font-semibold">
      {count} GOING
    </span>
  );
}
