import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

describe("test infrastructure smoke", () => {
  it("renders and queries the DOM", () => {
    render(<div>hello world</div>);
    expect(screen.getByText("hello world")).toBeInTheDocument();
  });
});
