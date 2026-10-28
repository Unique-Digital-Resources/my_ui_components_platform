"use client";

import * as React from "react";
import { RotateCcw, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * CustomButtonProps — mirrors the actual CustomButtonOptions interface 1:1.
 * (draggable/active are internal thumb behaviors, not user-facing props.)
 */
export interface CustomButtonProps {
  text: string;
  icon: string;
  iconType: "icon" | "image";
  iconPosition: "left" | "right" | "top" | "bottom";
  variant: string;
  size: "sm" | "md" | "lg";
  disabled: boolean;
  fullWidth: boolean;
  width: number;
  height: number;
}

export interface CustomButtonInstance {
  name: string;
  defaults: CustomButtonProps;
  current: CustomButtonProps;
  onChange: (props: CustomButtonProps) => void;
  overriddenProps?: Record<string, string>;
}

function isDefault<K extends keyof CustomButtonProps>(
  current: CustomButtonProps,
  defaults: CustomButtonProps,
  key: K,
): boolean {
  return current[key] === defaults[key];
}

function DefaultBadge({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="ml-1.5 inline-flex items-center rounded border border-brand-lemon/30 bg-brand-lemon/10 px-1 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wide text-brand-lemon">
      Default
    </span>
  );
}

function PropRow({
  label, isDefault, overriddenBy, children,
}: {
  label: string;
  isDefault: boolean;
  overriddenBy?: string;
  children: React.ReactNode;
}) {
  const isOverridden = !!overriddenBy;
  return (
    <div className={cn(
      "relative flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5",
      isOverridden ? "border-border/50 bg-muted/10" : "border-border bg-muted/20",
    )}>
      <span className="flex items-center text-[11px] text-foreground">
        {label}
        <DefaultBadge show={isDefault} />
        {isOverridden && (
          <span className="ml-1.5 inline-flex items-center gap-0.5 rounded bg-muted-foreground/15 px-1 py-0.5 font-mono text-[8px] text-muted-foreground">
            <Lock className="h-2 w-2" />
            {overriddenBy}
          </span>
        )}
      </span>
      <div className={cn(isOverridden && "opacity-30 pointer-events-none")}>
        {children}
      </div>
    </div>
  );
}

const VARIANTS = ["primary", "secondary", "outline", "ghost", "thumb", "cell"];
const SIZES = ["sm", "md", "lg"] as const;
const ICON_TYPES = ["icon", "image"] as const;
const ICON_POSITIONS = ["left", "right", "top", "bottom"] as const;
const BUILTIN_ICONS = [
  "plus", "x", "check", "settings", "search", "home", "star", "heart",
  "arrow-right", "trash", "download", "upload", "mail", "user", "save",
  "edit", "bell", "refresh",
];

export function CustomButtonPropsEditor({
  instances,
}: {
  instances: CustomButtonInstance[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[10px] leading-snug text-muted-foreground">
        This component reuses <code className="font-mono text-brand-lemon/80">CustomButton</code>.
        Edit the properties of each instance below. Values marked
        <span className="ml-1 inline-flex items-center rounded border border-brand-lemon/30 bg-brand-lemon/10 px-1 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wide text-brand-lemon">Default</span>
        match the host component's defaults. Locked props are controlled by the parent component.
      </p>
      {instances.map((inst) => (
        <InstanceEditor key={inst.name} instance={inst} />
      ))}
    </div>
  );
}

function InstanceEditor({ instance }: { instance: CustomButtonInstance }) {
  const { name, defaults, current, onChange, overriddenProps = {} } = instance;
  const allDefault = JSON.stringify(defaults) === JSON.stringify(current);

  const update = <K extends keyof CustomButtonProps>(key: K, value: CustomButtonProps[K]) => {
    onChange({ ...current, [key]: value });
  };

  const reset = () => {
    onChange({ ...defaults });
  };

  const inputCls = "h-6 rounded border border-border bg-muted/30 px-1.5 text-[10px] font-mono text-foreground outline-none focus:border-brand-lemon/40";

  return (
    <div className="rounded-md border border-border overflow-hidden">
      {/* Instance header */}
      <div className="flex items-center justify-between bg-surface-2 px-3 py-2 border-b border-border">
        <span className="text-[11px] font-semibold text-foreground">{name}</span>
        <button
          type="button"
          onClick={reset}
          disabled={allDefault}
          className={cn(
            "inline-flex h-6 items-center gap-1 rounded border px-2 text-[10px] font-medium transition-colors",
            allDefault
              ? "border-border bg-muted/20 text-muted-foreground/40 cursor-default"
              : "border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:border-brand-lemon/40",
          )}
        >
          <RotateCcw className="h-2.5 w-2.5" />
          Reset Default
        </button>
      </div>

      {/* Properties — 1:1 with CustomButtonOptions */}
      <div className="flex flex-col gap-1.5 p-2.5">
        {/* variant */}
        <PropRow label="variant" isDefault={isDefault(current, defaults, "variant")} overriddenBy={overriddenProps.variant}>
          <select value={current.variant} onChange={(e) => update("variant", e.target.value)} className={inputCls}>
            {VARIANTS.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </PropRow>

        {/* text */}
        <PropRow label="text" isDefault={isDefault(current, defaults, "text")} overriddenBy={overriddenProps.text}>
          <input type="text" value={current.text} onChange={(e) => update("text", e.target.value)} placeholder="(empty)" className={cn(inputCls, "w-20")} />
        </PropRow>

        {/* icon */}
        <PropRow label="icon" isDefault={isDefault(current, defaults, "icon")} overriddenBy={overriddenProps.icon}>
          {current.iconType === "icon" ? (
            <select value={current.icon} onChange={(e) => update("icon", e.target.value)} className={cn(inputCls, "w-24")}>
              <option value="">(none)</option>
              {BUILTIN_ICONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
            </select>
          ) : (
            <input type="text" value={current.icon} onChange={(e) => update("icon", e.target.value)} placeholder="URL" className={cn(inputCls, "w-24")} />
          )}
        </PropRow>

        {/* iconType */}
        <PropRow label="iconType" isDefault={isDefault(current, defaults, "iconType")} overriddenBy={overriddenProps.iconType}>
          <select value={current.iconType} onChange={(e) => update("iconType", e.target.value as "icon" | "image")} className={inputCls}>
            {ICON_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </PropRow>

        {/* iconPosition */}
        <PropRow label="iconPosition" isDefault={isDefault(current, defaults, "iconPosition")} overriddenBy={overriddenProps.iconPosition}>
          <select value={current.iconPosition} onChange={(e) => update("iconPosition", e.target.value as "left" | "right" | "top" | "bottom")} className={inputCls}>
            {ICON_POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </PropRow>

        {/* size */}
        <PropRow label="size" isDefault={isDefault(current, defaults, "size")} overriddenBy={overriddenProps.size}>
          <select value={current.size} onChange={(e) => update("size", e.target.value as "sm" | "md" | "lg")} className={inputCls}>
            {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </PropRow>

        {/* disabled */}
        <PropRow label="disabled" isDefault={isDefault(current, defaults, "disabled")} overriddenBy={overriddenProps.disabled}>
          <Toggle value={current.disabled} onChange={(v) => update("disabled", v)} />
        </PropRow>

        {/* fullWidth */}
        <PropRow label="fullWidth" isDefault={isDefault(current, defaults, "fullWidth")} overriddenBy={overriddenProps.fullWidth}>
          <Toggle value={current.fullWidth} onChange={(v) => update("fullWidth", v)} />
        </PropRow>

        {/* width */}
        <PropRow label="width" isDefault={isDefault(current, defaults, "width")} overriddenBy={overriddenProps.width}>
          <div className="flex items-center gap-1">
            <input type="number" value={current.width} onChange={(e) => update("width", Number(e.target.value))} className={cn(inputCls, "w-16")} />
            <span className="text-[10px] text-muted-foreground">px</span>
          </div>
        </PropRow>

        {/* height */}
        <PropRow label="height" isDefault={isDefault(current, defaults, "height")} overriddenBy={overriddenProps.height}>
          <div className="flex items-center gap-1">
            <input type="number" value={current.height} onChange={(e) => update("height", Number(e.target.value))} className={cn(inputCls, "w-16")} />
            <span className="text-[10px] text-muted-foreground">px</span>
          </div>
        </PropRow>
      </div>
    </div>
  );
}

function Toggle({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      className={cn(
        "relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors",
        value ? "bg-brand-lemon" : "bg-muted-foreground/30",
        disabled && "opacity-30",
      )}
    >
      <span className={cn(
        "inline-block h-3 w-3 rounded-full bg-background shadow-sm transition-transform",
        value ? "translate-x-3" : "translate-x-0.5",
      )} />
    </button>
  );
}
