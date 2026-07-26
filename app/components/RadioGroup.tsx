import React from 'react';

interface RadioOption {
  value: string;
  label: string;
}

interface RadioGroupProps {
  options: RadioOption[];
  selectedValue: string;
  onChange: (value: string) => void;
  name: string;
  title?: string;
}

export function RadioGroup({ options, selectedValue, onChange, name, title }: RadioGroupProps) {
  return (
    <div className="mb-6 space-y-3">
      {title && <h3 className="text-sm font-bold text-charcoal">{title}</h3>}
      {options.map(option => (
        <label key={option.value} className="flex items-center gap-2 text-sm text-charcoal cursor-pointer">
          <input 
            type="radio" 
            name={name} 
            checked={selectedValue === option.value} 
            onChange={() => onChange(option.value)} 
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}
