import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MermaidFlowchartPopup } from "../MermaidFlowchartPopup.js";
import { useDashboardStore } from "../../store.js";

vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(async () => ({ svg: "<svg></svg>" })),
  },
}));

vi.mock("@xyflow/react", () => ({
  useReactFlow: () => ({
    getNodes: () => [],
    flowToScreenPosition: (p: { x: number; y: number }) => p,
  }),
}));

function seedGraph(mermaidValue?: string) {
  useDashboardStore.setState({
    domainGraph: {
      nodes: [
        {
          id: "d1",
          type: "domain",
          name: "Checkout and Ordering",
          summary: "",
          tags: [],
          complexity: "simple",
          domainMeta: mermaidValue ? { mermaid: mermaidValue } : {},
        },
      ],
      edges: [],
    },
    mermaidPopupNodeId: "d1",
    mermaidModalOpen: false,
  });
}

describe("MermaidFlowchartPopup", () => {
  beforeEach(() => {
    seedGraph("flowchart TD\n  A --> B");
  });

  it("shows empty state and disables enlarge when no mermaid field", () => {
    seedGraph(undefined);
    render(<MermaidFlowchartPopup />);
    expect(screen.getByText(/No detailed diagram/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /enlarge/i })).toBeDisabled();
  });

  it("shows node name in header", () => {
    render(<MermaidFlowchartPopup />);
    expect(screen.getByText("Checkout and Ordering")).toBeInTheDocument();
  });

  it("closes on X button", async () => {
    render(<MermaidFlowchartPopup />);
    await userEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(useDashboardStore.getState().mermaidPopupNodeId).toBeNull();
  });

  it("opens modal on enlarge button", async () => {
    render(<MermaidFlowchartPopup />);
    await userEvent.click(screen.getByRole("button", { name: /enlarge/i }));
    expect(useDashboardStore.getState().mermaidModalOpen).toBe(true);
  });

  it("Esc does NOT close the popup", async () => {
    render(<MermaidFlowchartPopup />);
    await userEvent.keyboard("{Escape}");
    expect(useDashboardStore.getState().mermaidPopupNodeId).toBe("d1");
  });
});
