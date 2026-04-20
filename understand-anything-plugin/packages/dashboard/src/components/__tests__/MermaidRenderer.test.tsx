import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MermaidRenderer } from "../MermaidRenderer.js";

vi.mock("mermaid", () => {
  return {
    default: {
      initialize: vi.fn(),
      render: vi.fn(async (id: string, source: string) => {
        if (source.includes("INVALID_SYNTAX")) throw new Error("Parse error near INVALID_SYNTAX");
        return { svg: `<svg data-id="${id}" data-source="${source}"></svg>` };
      }),
    },
  };
});

describe("MermaidRenderer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders SVG for a valid source", async () => {
    render(<MermaidRenderer source={"flowchart TD\n  A --> B"} />);
    await waitFor(() =>
      expect(document.querySelector("svg[data-id]")).toBeInTheDocument(),
    );
  });

  it("falls back to <pre> on parse error with copy button", async () => {
    render(<MermaidRenderer source={"flowchart TD\n  INVALID_SYNTAX"} />);
    await waitFor(() =>
      expect(screen.getByText(/Diagram render failed/i)).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: /copy source/i })).toBeEnabled();
    expect(screen.getByText(/INVALID_SYNTAX/)).toBeInTheDocument();
  });

  it("copies source to clipboard on click", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });
    render(<MermaidRenderer source={"flowchart TD\n  INVALID_SYNTAX"} />);
    await waitFor(() => screen.getByRole("button", { name: /copy source/i }));
    await userEvent.click(screen.getByRole("button", { name: /copy source/i }));
    expect(writeText).toHaveBeenCalledWith("flowchart TD\n  INVALID_SYNTAX");
  });
});
