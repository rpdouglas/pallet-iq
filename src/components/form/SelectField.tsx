import { forwardRef, useId, type ReactNode, type SelectHTMLAttributes } from 'react'

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
  children: ReactNode
}

// Same visual treatment as TextField (docs/design/components.md's "Form
// inputs" pattern) - label above, Brand Blue focus, Danger border + message
// on error - so a form mixing text and select fields reads as one system.
export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, error, id, className = '', children, ...rest },
  ref,
) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const errorId = error ? `${selectId}-error` : undefined

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={selectId} className="text-label text-slate-gray font-medium">
        {label}
      </label>
      <select
        ref={ref}
        id={selectId}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={`text-body text-ink-navy rounded-lg border bg-white px-3 py-2 outline-none disabled:bg-cloud-gray disabled:text-slate-gray disabled:border-transparent focus:border-brand-blue ${
          error ? 'border-danger' : 'border-slate-gray'
        } ${className}`}
        {...rest}
      >
        {children}
      </select>
      {error ? (
        <p id={errorId} className="text-label text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
})
