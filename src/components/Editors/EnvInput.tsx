import { useRef } from "react";

type EnvInputProps = {
  value: string;
  onChange: (value: string) => void;
  environmentValues?: Record<string, string>;
  placeholder?: string;
  title?: string;
  className?: string;
  overlayClassName?: string;
  wrapperClassName?: string;
  id?: string;
  name?: string;
  type?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  as?: "input" | "textarea";
};

const buildHighlightedContent = (value: string, environmentValues?: Record<string, string>) => {
  if (!value) {
    return null;
  }
  const parts = value.split(/({{\s*[a-zA-Z0-9_.-]+\s*}})/g);
  return parts.map((part, index) => {
    const match = part.match(/^{{\s*([a-zA-Z0-9_.-]+)\s*}}$/);
    if (match && environmentValues && Object.prototype.hasOwnProperty.call(environmentValues, match[1])) {
      return (
        <span key={`${part}-${index}`} className="env-var">
          {part}
        </span>
      );
    }
    return <span key={`${part}-${index}`}>{part}</span>;
  });
};

export const EnvInput = ({
  value,
  onChange,
  environmentValues,
  placeholder,
  title,
  className,
  overlayClassName,
  wrapperClassName,
  id,
  name,
  type = "text",
  disabled,
  style,
  as = "input",
}: EnvInputProps) => {
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const syncScroll = (target: HTMLTextAreaElement | HTMLInputElement) => {
    if (overlayRef.current) {
      overlayRef.current.scrollTop = target.scrollTop;
      overlayRef.current.scrollLeft = target.scrollLeft;
    }
  };

  const overlayContent =
    value.length > 0 ? (
      buildHighlightedContent(value, environmentValues)
    ) : (
      <span className="env-placeholder">{placeholder}</span>
    );

  return (
    <div className={`env-input-wrap ${wrapperClassName ?? ""}`.trim()}>
      <div ref={overlayRef} className={`env-input-overlay ${overlayClassName ?? ""}`}>
        {overlayContent}
      </div>
      {as === "textarea" ? (
        <textarea
          id={id}
          name={name}
          className={`${className ?? ""} env-input-control`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          title={title}
          disabled={disabled}
          style={style}
          onScroll={(event) => syncScroll(event.currentTarget)}
        />
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          className={`${className ?? ""} env-input-control`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          title={title}
          disabled={disabled}
          style={style}
          onScroll={(event) => syncScroll(event.currentTarget)}
        />
      )}
    </div>
  );
};
