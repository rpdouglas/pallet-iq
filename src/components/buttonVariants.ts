export type ButtonVariant = 'primary' | 'secondary' | 'ghost'

// Per the base design doc's Buttons section (§4): Primary is a Brand
// Blue -> Cyan gradient with white text; Secondary is Cloud Gray fill with
// Ink Navy text; Ghost is transparent with Brand Blue text. 8px radius,
// matching components.md's form-input radius for visual consistency.
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-gradient-to-r from-brand-blue to-cyan-accent text-white',
  secondary: 'bg-cloud-gray text-ink-navy',
  ghost: 'bg-transparent text-brand-blue hover:bg-cloud-gray',
}

/** Shared with any non-<button> element (e.g. a react-router Link) styled to match. */
export function buttonClasses(variant: ButtonVariant = 'primary', className = ''): string {
  return `text-body inline-block cursor-pointer rounded-lg px-4 py-2 text-center font-medium transition-opacity focus-visible:ring-brand-blue focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${className}`
}
