import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MermaidFlowchartModal } from "../MermaidFlowchartModal.js";
import { useDashboardStore } from "../../store.js";

vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(async () => ({ svg: "<svg data-id='modal'></svg>" })),
  },
}));

function seed() {
  useDashboardStore.setState({
    domainGraph: {
      version: "1.0.0",
      project: {
        name: "test",
        languages: [],
        frameworks: [],
        description: "",
        analyzedAt: "",
        gitCommitHash: "",
      },
      nodes: [
        {
          id: "d1",
          type: "domain",
          name: "Checkout and Ordering",
          summary: "",
          tags: [],
          complexity: "simple",
          domainMeta: { mermaid: "flowchart TD\n  A --> B" },
        },
      ],
      edges: [],
      layers: [],
      tour: [],
    },
    mermaidPopupNodeId: "d1",
    mermaidModalOpen: true,
  });
}

describe("MermaidFlowchartModal", () => {
  beforeEach(() => seed());

  it("closes on Esc", async () => {
    render(<MermaidFlowchartModal />);
    await userEvent.keyboard("{Escape}");
    expect(useDashboardStore.getState().mermaidModalOpen).toBe(false);
  });

  it("closes on X button", async () => {
    render(<MermaidFlowchartModal />);
    await userEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(useDashboardStore.getState().mermaidModalOpen).toBe(false);
  });

  it("does NOT close on backdrop click", async () => {
    render(<MermaidFlowchartModal />);
    await userEvent.click(screen.getByTestId("mermaid-modal-backdrop"));
    expect(useDashboardStore.getState().mermaidModalOpen).toBe(true);
  });

  it("copies source via Copy button", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });
    render(<MermaidFlowchartModal />);
    await userEvent.click(screen.getByRole("button", { name: /copy source/i }));
    expect(writeText).toHaveBeenCalledWith("flowchart TD\n  A --> B");
  });

  it("generates an Open-in-Mermaid-Live href with pako-encoded source", () => {
    render(<MermaidFlowchartModal />);
    const link = screen.getByRole("link", { name: /open in mermaid live/i });
    const href = link.getAttribute("href") ?? "";
    expect(href.startsWith("https://mermaid.live/edit#pako:")).toBe(true);
    expect(href.length).toBeGreaterThan(40);
  });

  it("renders nothing when modal is closed", () => {
    useDashboardStore.setState({ mermaidModalOpen: false });
    const { container } = render(<MermaidFlowchartModal />);
    expect(container.firstChild).toBeNull();
  });

  it("sets aria-modal and focuses close button when opened", () => {
    render(<MermaidFlowchartModal />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    // Focus may already be on close button after useEffect runs
    expect(screen.getByRole("button", { name: /close/i })).toBe(document.activeElement);
  });
});
