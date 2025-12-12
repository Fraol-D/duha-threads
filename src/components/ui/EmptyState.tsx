import { ReactNode } from "react";
import { Card } from "./Card";

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <Card className="p-8 text-center">
      <h2 className="text-lg font-semibold mb-1">{title}</h2>
      {description && <p className="text-sm text-muted mb-4">{description}</p>}
      {action}
    </Card>
  );
}
