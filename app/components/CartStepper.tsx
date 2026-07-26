import React from 'react';

interface CartStepperProps {
  quantity: number;
  onUpdate: (newQty: number) => void;
  min?: number;
}

export function CartStepper({ quantity, onUpdate, min = 1 }: CartStepperProps) {
  return (
    <div className="flex items-center gap-2">
      <button 
        type="button"
        onClick={() => onUpdate(quantity - 1)}
        className="px-2 py-0.5 border border-border rounded text-xs"
      >-</button>
      <input 
        type="number" 
        value={quantity} 
        onChange={(e) => onUpdate(parseFloat(e.target.value) || min)}
        className="w-12 text-center text-xs border border-border rounded py-1"
        min={min}
      />
      <button 
        type="button"
        onClick={() => onUpdate(quantity + 1)}
        className="px-2 py-0.5 border border-border rounded text-xs"
      >+</button>
    </div>
  );
}
