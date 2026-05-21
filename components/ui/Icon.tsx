import * as Icons from "lucide-react";
import type { LucideProps } from "lucide-react";

type IconComponent = React.ComponentType<LucideProps>;

/**
 * Renders a Lucide icon by its PascalCase name (e.g. "LayoutDashboard").
 * Falls back to a neutral circle if the name is unknown.
 */
export function Icon({
  name,
  ...props
}: { name: string } & LucideProps) {
  const registry = Icons as unknown as Record<string, IconComponent>;
  const Resolved = registry[name] ?? registry.Circle;
  return <Resolved {...props} />;
}
