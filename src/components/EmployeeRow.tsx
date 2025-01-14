import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface EmployeeRowProps {
  name: string;
  image?: string;
}

export function EmployeeRow({ name, image }: EmployeeRowProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("");

  return (
    <div className="employee-row">
      <Avatar>
        <AvatarImage src={image} alt={name} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <span className="font-medium">{name}</span>
    </div>
  );
}