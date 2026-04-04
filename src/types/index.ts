export type EmployeeStatus = "ACTIVE" | "PROBATION" | "NOTICE" | "SEPARATED";

export type UanStatus = "GENERATED" | "NOT_GENERATED";

export type EsiStatus = "GENERATED" | "NOT_GENERATED" | "EXEMPTED";

export type AccentColor = "blue" | "green" | "amber" | "red" | "purple" | "teal" | "pink" | "orange";

export type CanvasType = "dots" | "waves" | "chevrons" | "nebula" | "pulse" | "bars";

export interface MetricCardProps {
  color: AccentColor;
  icon: React.ReactNode;
  value: string;
  label: string;
  change?: {
    value: string;
    direction: "up" | "down";
  };
}

export interface ModuleCardTag {
  label: string;
  color: string;
}

export interface ModuleCardStat {
  value: string;
  label: string;
  color: string;
}

export interface ModuleCardProps {
  title: string;
  description: string;
  tags: ModuleCardTag[];
  stats: ModuleCardStat[];
  buttonLabel: string;
  buttonColor: string;
  href: string;
  canvasType: CanvasType;
}
