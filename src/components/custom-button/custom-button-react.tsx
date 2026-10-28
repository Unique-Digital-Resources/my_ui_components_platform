"use client";

import * as React from "react";
import {
  CustomButton,
  type CustomButtonOptions,
  type CustomButtonVariant,
  type CustomButtonSize,
  type CustomButtonIconType,
  type CustomButtonIconPosition,
} from "@/lib/components/custom-button";

export type {
  CustomButtonVariant,
  CustomButtonSize,
  CustomButtonIconType,
  CustomButtonIconPosition,
};

export interface CustomButtonReactProps {
  /** Button label text. */
  text?: string;
  /** SVG icon name (from the built-in set) or image src when iconType="image". */
  icon?: string;
  /** "icon" renders inline SVG; "image" renders an `<img>`. */
  iconType?: CustomButtonIconType;
  /** Position of the icon relative to the text. */
  iconPosition?: CustomButtonIconPosition;
  /** Visual style. */
  variant?: CustomButtonVariant;
  /** Button size. */
  size?: CustomButtonSize;
  /** Disabled state. */
  disabled?: boolean;
  /** Stretch to fill the parent's width. */
  fullWidth?: boolean;
  /** Fired when the button is clicked (and not disabled). */
  onClick?: () => void;
  /** Wrapper class — applied to the container div, not the button. */
  className?: string;
  /** Ref to the imperative CustomButton instance. */
  instanceRef?: React.MutableRefObject<CustomButton | null>;
}

/**
 * React wrapper around the vanilla CustomButton. Owns the instance for the
 * lifetime of the mount; forwards prop changes to the imperative API.
 */
export function CustomButtonReact({
  text,
  icon,
  iconType,
  iconPosition,
  variant,
  size,
  disabled,
  fullWidth,
  onClick,
  className,
  instanceRef,
}: CustomButtonReactProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const ref = React.useRef<CustomButton | null>(null);

  const onClickRef = React.useRef(onClick);
  React.useEffect(() => {
    onClickRef.current = onClick;
  }, [onClick]);

  // Create once.
  React.useEffect(() => {
    if (!containerRef.current) return;
    const opts: CustomButtonOptions = {};
    if (text !== undefined) opts.text = text;
    if (icon !== undefined) opts.icon = icon;
    if (iconType !== undefined) opts.iconType = iconType;
    if (iconPosition !== undefined) opts.iconPosition = iconPosition;
    if (variant !== undefined) opts.variant = variant;
    if (size !== undefined) opts.size = size;
    if (disabled !== undefined) opts.disabled = disabled;
    if (fullWidth !== undefined) opts.fullWidth = fullWidth;

    const btn = new CustomButton(containerRef.current, opts);
    ref.current = btn;
    if (instanceRef) instanceRef.current = btn;

    const handler = () => onClickRef.current?.();
    btn.on("click", handler);

    return () => {
      btn.off("click", handler);
      btn.destroy();
      ref.current = null;
      if (instanceRef) instanceRef.current = null;
    };
    // Intentionally empty deps — created once on mount.
  }, []);

  // Forward prop changes via the imperative API.
  React.useEffect(() => {
    ref.current?.setText(text ?? "");
  }, [text]);
  React.useEffect(() => {
    if (icon !== undefined) ref.current?.setIcon(icon, iconType);
  }, [icon, iconType]);
  React.useEffect(() => {
    ref.current?.setIconPosition(iconPosition ?? "left");
  }, [iconPosition]);
  React.useEffect(() => {
    ref.current?.setVariant(variant ?? "primary");
  }, [variant]);
  React.useEffect(() => {
    ref.current?.setSize(size ?? "md");
  }, [size]);
  React.useEffect(() => {
    ref.current?.setDisabled(disabled ?? false);
  }, [disabled]);
  React.useEffect(() => {
    ref.current?.setFullWidth(fullWidth ?? false);
  }, [fullWidth]);

  return <div ref={containerRef} className={className} />;
}
