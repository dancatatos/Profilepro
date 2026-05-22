import { Fragment, type CSSProperties, type ReactNode } from "react";
import type { RichTextNode } from "@/types";

/**
 * Renders a Tiptap rich-text document as React elements. It only emits the
 * handful of node/mark types the editor can produce — so there's no
 * arbitrary HTML and nothing to sanitise.
 */
function renderMarks(
  content: ReactNode,
  marks: RichTextNode["marks"],
): ReactNode {
  let el = content;
  for (const mark of marks ?? []) {
    if (mark.type === "bold") el = <strong>{el}</strong>;
    else if (mark.type === "italic") el = <em>{el}</em>;
    else if (mark.type === "highlight")
      el = (
        <span style={{ color: "var(--tp-accent)", fontWeight: 600 }}>{el}</span>
      );
  }
  return el;
}

function renderNode(node: RichTextNode, key: string): ReactNode {
  if (node.type === "text") {
    return (
      <Fragment key={key}>
        {renderMarks(node.text ?? "", node.marks)}
      </Fragment>
    );
  }

  const children = (node.content ?? []).map((child, i) =>
    renderNode(child, `${key}.${i}`),
  );

  const align = node.attrs?.textAlign;
  const alignStyle: CSSProperties | undefined =
    typeof align === "string" && align !== "left"
      ? { textAlign: align as CSSProperties["textAlign"] }
      : undefined;

  switch (node.type) {
    case "paragraph":
      return (
        <p key={key} style={alignStyle} className="mb-2 last:mb-0">
          {children.length > 0 ? children : <br />}
        </p>
      );
    case "heading":
      return (
        <p
          key={key}
          style={{ ...alignStyle, color: "var(--tp-text)" }}
          className={
            node.attrs?.level === 2
              ? "mb-1.5 mt-1 text-lg font-bold first:mt-0"
              : "mb-1 mt-1 text-base font-semibold first:mt-0"
          }
        >
          {children}
        </p>
      );
    case "bulletList":
      return (
        <ul key={key} className="mb-2 list-disc space-y-0.5 pl-5 last:mb-0">
          {children}
        </ul>
      );
    case "orderedList":
      return (
        <ol key={key} className="mb-2 list-decimal space-y-0.5 pl-5 last:mb-0">
          {children}
        </ol>
      );
    case "listItem":
      return <li key={key}>{children}</li>;
    case "hardBreak":
      return <br key={key} />;
    default:
      return <Fragment key={key}>{children}</Fragment>;
  }
}

export function RichTextRenderer({ doc }: { doc: RichTextNode }) {
  return <>{(doc.content ?? []).map((n, i) => renderNode(n, `n${i}`))}</>;
}
