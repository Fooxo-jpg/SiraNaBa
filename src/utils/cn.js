import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Combines conditional class names (clsx) and then resolves conflicting
// Tailwind utilities so the class written LAST always wins, regardless of
// where each utility happens to land in the compiled stylesheet. Use this
// anywhere a component accepts a `className` prop meant to override defaults
// (backgrounds, padding, etc.) — string concatenation alone is not safe for
// that, since two same-specificity utilities are resolved by CSS source
// order, not by JSX order.
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
