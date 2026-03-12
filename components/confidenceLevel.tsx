import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";

export function ConfidenceLevel({
  value,
  disabled,
  onChange,
  questionId,
}: {
  value: number | null;
  disabled?: boolean;
  onChange: (v: number) => void;
  questionId: number | string;
}) {
  return (
    <div className="mt-4">
      <p>Nível de confiança de que acertou a resposta (1 = pouco confiante, 5 = muito confiante)</p>
      <br />
      <RadioGroup
        disabled={!!disabled}
        className="flex flex-row space-x-1"
        value={value !== null ? String(value) : undefined}
        onValueChange={(v: string) => onChange(parseInt(v))}
      >
        {[1, 2, 3, 4, 5].map((value) => (
          <span className="flex items-left space-x-1" key={value}>
            <RadioGroupItem value={String(value)} id={`question-${questionId}-r${value}`} />
            <Label htmlFor={`question-${questionId}-r${value}`} className="ml-1">
              {value}
            </Label>
          </span>
        ))}
      </RadioGroup>
    </div>
  );
}