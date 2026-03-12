type TextBlock = {
  type: "text";
  text: string;
};

type ToolResult = {
  isError?: boolean;
  content?: unknown[];
};

function isTextBlock(value: unknown): value is TextBlock {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    "text" in value &&
    (value as { type?: unknown }).type === "text" &&
    typeof (value as { text?: unknown }).text === "string"
  );
}

function preview(text: string, maxLength = 160): string {
  const normalized = text.replace(/\s+/gu, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength)}...`;
}

export function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export function extractToolText(result: ToolResult, toolName: string): string {
  const text = result.content?.find(isTextBlock)?.text ?? "";

  if (result.isError) {
    throw new Error(`${toolName} failed: ${text || "No error text returned."}`);
  }

  assertCondition(text.length > 0, `${toolName} returned no text content.`);
  return text;
}

export function parseJsonText<T>(text: string, label: string): T {
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      `${label} returned non-JSON text. ${reason}. Preview: ${preview(text)}`,
    );
  }
}

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getRecentDateRange(daysInclusive: number, endOffsetDays = 1): {
  from: string;
  to: string;
} {
  assertCondition(
    Number.isInteger(daysInclusive) && daysInclusive >= 1,
    "daysInclusive must be a positive integer.",
  );

  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  end.setUTCDate(end.getUTCDate() - endOffsetDays);

  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (daysInclusive - 1));

  return {
    from: formatIsoDate(start),
    to: formatIsoDate(end),
  };
}
