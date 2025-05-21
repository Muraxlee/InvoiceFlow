import type { SVGProps } from 'react';
import { LayoutGrid } from 'lucide-react'; // Using LayoutGrid as a 3x3 grid icon

export function AppLogo(props: SVGProps<SVGSVGElement>) {
  // Using Lucide's LayoutGrid directly and passing props to it.
  // If a custom SVG is needed, replace LayoutGrid with the SVG path.
  return (
    <LayoutGrid
      className="h-6 w-6 text-header-foreground" // Adjusted size and color
      strokeWidth={2}
      {...props} // Spread any additional SVG props
    />
  );
}
