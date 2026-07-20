import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import type { ActionDefinition } from "../domain/actions";
import { ActionLibrary } from "./ActionLibrary";

function LibraryHarness({ onChoose = () => undefined }: { onChoose?: (action: ActionDefinition) => void }) {
  const [query, setQuery] = useState("");
  return <ActionLibrary query={query} onQuery={setQuery} onChoose={onChoose}/>;
}

describe("ActionLibrary", () => {
  it("groups actions into the four categories", () => {
    render(<LibraryHarness/>);
    expect(screen.getByRole("region", { name: "Audio" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Media" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Shortcuts" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "System" })).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Media" })).getAllByRole("button")).toHaveLength(3);
  });

  it("keeps category grouping when search filters the table", async () => {
    render(<LibraryHarness/>);
    await userEvent.type(screen.getByRole("textbox", { name: "Search actions" }), "volume");
    expect(screen.getByRole("region", { name: "Audio" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Media" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });
});
