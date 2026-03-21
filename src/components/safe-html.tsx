import DOMPurify from "dompurify"
import { cn } from "@/lib/utils"

/** Renders HTML content safely. Falls back to plain text for non-HTML content. */
export function SafeHtml({
  content,
  className,
  as: Tag = "div",
}: {
  content: string
  className?: string
  as?: "div" | "p" | "span"
}) {
  if (!content) return null

  const isHtml = content.trim().startsWith("<")
  if (isHtml) {
    const sanitized = DOMPurify.sanitize(content, {
      ALLOWED_TAGS: ["p", "br", "strong", "em", "s", "code", "a", "ul", "ol", "li", "span"],
      ALLOWED_ATTR: ["href", "target", "rel", "style", "class", "data-type", "data-id", "data-label"],
    })
    return (
      <Tag
        className={cn(className, "post-content")}
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
    )
  }

  return <Tag className={cn(className, !isHtml && "whitespace-pre-wrap")}>{content}</Tag>
}
