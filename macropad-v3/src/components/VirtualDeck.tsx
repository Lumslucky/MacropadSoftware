import { Plus } from "lucide-react";
import type { VirtualButton } from "../domain/profile";
import { iconForAction } from "./actionIcon";

export function VirtualDeck({ buttons, selectedId, onSelect, onExecute, onAdd }: {
  buttons: VirtualButton[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onExecute: (button: VirtualButton) => void;
  onAdd: () => void;
}) {
  return <main className="virtual-stage">
    <div className="stage-header"><div><span className="eyebrow">Software controls</span><h1>Virtual deck</h1></div><span className="virtual-count">{buttons.length} / 32</span></div>
    <p className="virtual-intro">Click a tile to run it. Select an action from the library to reassign the active tile.</p>
    <div className="virtual-grid" aria-label="Virtual buttons">
      {buttons.map((button, index) => { const Icon = iconForAction(button.action); return <button
        key={button.id}
        className={`virtual-key ${selectedId === button.id ? "selected" : ""}`}
        aria-label={`Run virtual button ${button.label}`}
        style={{"--delay": `${index * 25}ms`} as React.CSSProperties}
        onFocus={() => onSelect(button.id)}
        onClick={() => { onSelect(button.id); onExecute(button); }}
      ><small>{String(index + 1).padStart(2, "0")}</small><Icon size={24}/><strong>{button.label}</strong><span>{button.action.type.replace(/\./g, " / ")}</span></button> })}
      {buttons.length < 32 && <button className="virtual-key add" onClick={onAdd}><Plus size={25}/><strong>Add button</strong><span>Create another control</span></button>}
    </div>
  </main>;
}
