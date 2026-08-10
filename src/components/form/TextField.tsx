import { forwardRef, useId, type InputHTMLAttributes } from 'react'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

// Visual layer for docs/design/components.md's "Form inputs" pattern: label
// above the input (not placeholder-as-label), Brand Blue focus border, Danger
// border + message below on error, Cloud Gray/Slate Gray disabled state.
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, id, className = '', ...rest },
  ref,
) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = error ? `${inputId}-error` : undefined

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-label text-slate-gray font-medium">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={`text-body text-ink-navy rounded-lg border px-3 py-2 outline-none disabled:bg-cloud-gray disabled:text-slate-gray disabled:border-transparent focus:border-brand-blue ${
          error ? 'border-danger' : 'border-slate-gray'
        } ${className}`}
        {...rest}
      />
      {error ? (
        <p id={errorId} className="text-label text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
})
