const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  ACTIVE: { color: "var(--green)", bg: "var(--green-bg)", label: "Active" },
  PROBATION: { color: "var(--amber)", bg: "var(--amber-bg)", label: "Probation" },
  NOTICE: { color: "var(--blue)", bg: "var(--blue-bg)", label: "Notice" },
  SEPARATED: { color: "var(--red)", bg: "var(--red-bg)", label: "Separated" },
};

interface StatusBadgeProps {
  status: "ACTIVE" | "PROBATION" | "NOTICE" | "SEPARATED";
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 20,
        background: config.bg,
        fontSize: 11,
        fontWeight: 600,
        color: config.color,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: config.color,
        }}
      />
      {config.label}
    </span>
  );
}
