import { Checkbox } from '@/components/ui/checkbox';
import { LegalLinks } from '@/components/auth/legal-links';

type TermsCheckboxProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

export default function TermsCheckbox({
  checked,
  onCheckedChange,
}: TermsCheckboxProps) {
  return (
    <div className="flex items-start gap-2">
      <Checkbox
        id="terms"
        checked={checked}
        onCheckedChange={value => onCheckedChange(value === true)}
        className="mt-0.5"
      />
      <div className="text-sm leading-tight text-muted-foreground">
        <label htmlFor="terms" className="cursor-pointer">
          I agree to the{' '}
        </label>
        <LegalLinks />.
      </div>
    </div>
  );
}
