"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface FilterSelectProps {
  name: string;
  defaultValue: string;
  options: { value: string; label: string }[];
}

export function FilterSelect({ name, defaultValue, options }: FilterSelectProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    const val = e.target.value;
    if (val === "all") {
      params.delete(name);
    } else {
      params.set(name, val);
    }
    router.push(`?${params.toString()}`);
  }

  return (
    <select
      name={name}
      defaultValue={defaultValue}
      onChange={handleChange}
      style={{
        background: "var(--glass)",
        border: "1px solid var(--glass-border)",
        borderRadius: "var(--radius-xs)",
        padding: "7px 12px",
        fontSize: 12,
        fontWeight: 500,
        color: "var(--text-2)",
        cursor: "pointer",
        outline: "none",
      }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
