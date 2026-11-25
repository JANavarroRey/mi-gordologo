import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/** 16px mínimo: evita el zoom automático de iOS al enfocar inputs. */
export const fieldInputClass =
  'w-full text-base leading-normal p-2.5 rounded-xl border border-neutral-200 min-w-0';

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  minLength?: number;
  autoComplete?: string;
  name?: string;
  id?: string;
  className?: string;
};

export const PasswordField: React.FC<Props> = ({
  value,
  onChange,
  placeholder,
  required,
  disabled,
  minLength,
  autoComplete = 'off',
  name,
  id,
  className = '',
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className={`relative ${className}`}>
      <input
        id={id}
        name={name}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        minLength={minLength}
        autoComplete={autoComplete}
        spellCheck={false}
        className={`${fieldInputClass} pr-11 disabled:bg-neutral-50 font-mono`}
      />
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-neutral-500 hover:text-neutral-800 disabled:opacity-40"
        aria-label={visible ? 'Ocultar contraseña' : 'Ver contraseña'}
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
};
