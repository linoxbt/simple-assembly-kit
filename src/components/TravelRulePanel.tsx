import { useState } from "react";
import { TRAVEL_RULE_THRESHOLD } from "@/utils/constants";
import { formatUsd } from "@/utils/format";

interface TravelRulePanelProps {
  amount: number;
  onSubmit: (data: TravelRuleData) => void;
}

export interface TravelRuleData {
  originatorName: string;
  originatorVasp: string;
  beneficiaryName: string;
  beneficiaryVasp: string;
}

const TravelRulePanel = ({ amount, onSubmit }: TravelRulePanelProps) => {
  const [form, setForm] = useState<TravelRuleData>({
    originatorName: "",
    originatorVasp: "",
    beneficiaryName: "",
    beneficiaryVasp: "",
  });

  if (amount < TRAVEL_RULE_THRESHOLD) return null;

  const allFilled = Object.values(form).every((v) => v.trim() !== "");

  return (
    <div className="border-2 border-primary/50 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2 text-primary text-xs font-semibold tracking-wider">
        <span>⚠</span>
        <span>TRAVEL RULE REQUIRED</span>
        <span className="text-muted-foreground">· {formatUsd(amount)}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {(["originatorName", "originatorVasp", "beneficiaryName", "beneficiaryVasp"] as const).map((field) => (
          <div key={field}>
            <label className="text-[10px] text-muted-foreground tracking-widest uppercase block mb-1">
              {field.replace(/([A-Z])/g, " $1").toUpperCase()} *
            </label>
            <input
              value={form[field]}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              className="w-full bg-surface border border-card-border rounded px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </div>
        ))}
      </div>

      <div className="text-[10px] text-muted-foreground">
        Stored permanently in TravelRuleRecord PDA · Immutable audit record
      </div>

      <button
        onClick={() => allFilled && onSubmit(form)}
        disabled={!allFilled}
        className="w-full py-2 text-xs border border-primary text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded tracking-wider font-medium"
      >
        CONFIRM TRAVEL RULE
      </button>
    </div>
  );
};

export default TravelRulePanel;
