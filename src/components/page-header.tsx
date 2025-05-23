
import type { ReactNode } from 'react';
import React from 'react'; // Import React for React.memo

interface PageHeaderProps {
  title: string;
  description?: string | ReactNode;
  actions?: ReactNode;
}

function PageHeaderComponent({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-xs text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

const PageHeader = React.memo(PageHeaderComponent);
export default PageHeader;
