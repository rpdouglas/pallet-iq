import type { ButtonHTMLAttributes } from 'react'
import { buttonClasses, type ButtonVariant } from './buttonVariants'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

export function Button({ variant = 'primary', className = '', disabled, ...rest }: ButtonProps) {
  return <button disabled={disabled} className={buttonClasses(variant, className)} {...rest} />
}
