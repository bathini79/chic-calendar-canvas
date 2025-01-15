interface GridHeaderProps {
  timeSlots: string[];
}

export function GridHeader({ timeSlots }: GridHeaderProps) {
  return (
    <div 
      className="grid h-16 border-b bg-muted" 
      style={{
        gridTemplateColumns: `repeat(${timeSlots.length}, minmax(100px, 1fr))`
      }}
    >
      {timeSlots.map((time) => (
        <div key={time} className="flex items-center justify-center border-r text-sm">
          {time}
        </div>
      ))}
    </div>
  );
}