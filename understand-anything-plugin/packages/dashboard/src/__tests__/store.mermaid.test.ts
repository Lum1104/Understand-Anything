import { describe, it, expect, beforeEach } from "vitest";
import { useDashboardStore } from "../store.js";

describe("mermaid popup slice", () => {
  beforeEach(() => {
    useDashboardStore.setState({
      mermaidPopupNodeId: null,
      mermaidModalOpen: false,
    });
  });

  it("opens the popup with a node id", () => {
    useDashboardStore.getState().openMermaidPopup("d1");
    expect(useDashboardStore.getState().mermaidPopupNodeId).toBe("d1");
  });

  it("closes the popup and the modal", () => {
    useDashboardStore.setState({
      mermaidPopupNodeId: "d1",
      mermaidModalOpen: true,
    });
    useDashboardStore.getState().closeMermaidPopup();
    expect(useDashboardStore.getState().mermaidPopupNodeId).toBeNull();
    expect(useDashboardStore.getState().mermaidModalOpen).toBe(false);
  });

  it("opens and closes the modal independently", () => {
    useDashboardStore.setState({ mermaidPopupNodeId: "d1" });
    useDashboardStore.getState().openMermaidModal();
    expect(useDashboardStore.getState().mermaidModalOpen).toBe(true);
    useDashboardStore.getState().closeMermaidModal();
    expect(useDashboardStore.getState().mermaidModalOpen).toBe(false);
    expect(useDashboardStore.getState().mermaidPopupNodeId).toBe("d1");
  });
});

describe("mermaid popup closes on view switch", () => {
  it("clears popup when switching to structural view", () => {
    useDashboardStore.setState({
      mermaidPopupNodeId: "d1",
      mermaidModalOpen: true,
    });
    useDashboardStore.getState().setViewMode("structural");
    expect(useDashboardStore.getState().mermaidPopupNodeId).toBeNull();
    expect(useDashboardStore.getState().mermaidModalOpen).toBe(false);
  });

  it("clears popup when switching to knowledge view", () => {
    useDashboardStore.setState({
      mermaidPopupNodeId: "d1",
      mermaidModalOpen: false,
    });
    useDashboardStore.getState().setViewMode("knowledge");
    expect(useDashboardStore.getState().mermaidPopupNodeId).toBeNull();
  });
});
