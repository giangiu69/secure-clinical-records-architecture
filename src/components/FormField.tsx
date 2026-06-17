import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  placeholder?: string;
  disabled?: boolean;
  min?: string;
  max?: string;
  className?: string;
  options?: Array<{ value: string; label: string }>;
}

export function FormField({
  id,
  label,
  required = false,
  error,
  type = "text",
  value,
  onChange,
  maxLength,
  placeholder,
  disabled,
  min,
  max,
  className,
  options,
}: FormFieldProps) {
  const hasError = !!error;
  
  return (
    <div className={className}>
      <Label 
        htmlFor={id} 
        className={cn(hasError && "text-destructive")}
      >
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {options ? (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger 
            id={id} 
            className={cn(
              "bg-background",
              hasError && "border-destructive focus:ring-destructive"
            )}
          >
            <SelectValue placeholder="Seleziona..." />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border z-50">
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          placeholder={placeholder}
          disabled={disabled}
          min={min}
          max={max}
          className={cn(
            hasError && "border-destructive focus-visible:ring-destructive"
          )}
        />
      )}
      {hasError && (
        <p className="text-xs text-destructive mt-1">{error}</p>
      )}
    </div>
  );
}
