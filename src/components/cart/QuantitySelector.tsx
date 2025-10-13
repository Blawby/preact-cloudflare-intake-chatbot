import { FormLabel } from '../ui/form/FormLabel';
import { Input } from '../ui/input/Input';
import { Button } from '../ui/Button';

interface Props {
  quantity: number;
  onChange: (q: number) => void;
  min?: number;
  helperText?: string;
}

export const QuantitySelector = ({ quantity, onChange, min = 1, helperText }: Props) => (
  <div>
    <FormLabel>Users</FormLabel>
    <div className="flex items-center gap-3">
      <Button 
        size="sm" 
        variant="secondary"
        onClick={() => onChange(Math.max(min, quantity - 1))}
        disabled={quantity <= min}
      >
        -
      </Button>
      <Input 
        type="number" 
        value={quantity} 
        onChange={(v) => onChange(Math.max(min, parseInt(v) || min))} 
        className="w-24 text-center" 
      />
      <Button 
        size="sm" 
        variant="secondary"
        onClick={() => onChange(quantity + 1)}
      >
        +
      </Button>
    </div>
    {helperText && <p className="text-xs text-gray-400 mt-2">{helperText}</p>}
  </div>
);
