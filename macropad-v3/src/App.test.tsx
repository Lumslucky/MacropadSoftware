import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import App from "./App";

describe("MacroPad editor", () => {
  beforeEach(() => localStorage.clear());
  it("assigns a library action to the selected physical key", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: /next track/i }));
    expect(screen.getByDisplayValue("Next track")).toBeInTheDocument();
  });
  it("renders the discovered physical button mapping", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: "Physical position 1, Button 6" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Physical position 2, Button 3" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Physical position 3, Button 5" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Physical position 4, Button 2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Physical position 5, Button 4" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Physical position 6, Button 1" })).toBeInTheDocument();
  });
  it("configures short and long presses independently", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: /long press/i }));
    expect(screen.getByText(/no long-press action/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /next track/i }));
    expect(screen.getByDisplayValue("Next track")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /short press/i }));
    expect(screen.getByDisplayValue("Mute")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /long press/i }));
    expect(screen.getByDisplayValue("Next track")).toBeInTheDocument();
  });
  it("configures the six-zone lighting studio", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Lighting" }));
    await userEvent.click(screen.getByRole("button", { name: /static.*six fixed zone colors/i }));
    expect(screen.getByRole("main")).toHaveTextContent("Individual LED colors");
    expect(screen.getAllByLabelText(/light, Button [1-6]/i)).toHaveLength(12);
    expect(screen.getByLabelText("Top left light, Button 6", { selector: "input" })).toHaveValue("#ff9f43");
    expect(screen.getByLabelText("Bottom right light, Button 1", { selector: "input" })).toHaveValue("#00e5b0");
    expect(screen.getByRole("button", { name: /apply to macropad/i })).toBeDisabled();
  });
  it("configures a persistent virtual button from the action library", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Virtual deck" }));
    await userEvent.click(screen.getByRole("button", { name: "Run virtual button Mute mic" }));
    await userEvent.click(screen.getByRole("button", { name: /next track/i }));
    expect(screen.getByDisplayValue("Next track")).toBeInTheDocument();
  });
  it("configures custom OLED content", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "OLED display" }));
    await userEvent.click(screen.getByRole("button", { name: /custom.*your own two-line text/i }));
    const input = screen.getByLabelText(/custom text/i);
    await userEvent.clear(input);
    await userEvent.type(input, "STREAM READY");
    expect(screen.getByText("STREAM READY")).toBeInTheDocument();
  });
  it("keeps an incomplete launch action editable instead of crashing autosave", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: /launch application/i }));
    expect(screen.getByLabelText("Target")).toHaveValue("");
    expect(screen.getByText(/enter an application path/i)).toBeInTheDocument();
  });
  it("shows safe updater configuration state in the device center", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Device" }));
    expect(await screen.findByRole("heading", { name: "Device center" })).toBeInTheDocument();
    expect(await screen.findAllByText(/channel not configured/i)).toHaveLength(2);
    expect(screen.getByText(/ESP32-S3 · VID 303A \/ PID 1001/i)).toBeInTheDocument();
  });
});
