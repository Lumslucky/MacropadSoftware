import { AlertTriangle, Check, Clock3, MousePointerClick, SlidersHorizontal } from "lucide-react";
import { actionConfigurationError, type Binding, type SelectedControl } from "../domain/profile";

export function BindingInspector({ selected, binding, onSelect, onChange }: {
  selected: SelectedControl;
  binding?: Binding;
  onSelect: (selected: SelectedControl) => void;
  onChange: (binding: Binding) => void;
}) {
  const supportsPressTriggers = selected.control !== "rotary-turn";
  const selectTrigger = (trigger: "short" | "long") => onSelect({ control: selected.control, trigger });

  const triggerPanel = supportsPressTriggers && <section className="press-configuration" aria-labelledby="press-trigger-heading">
    <div className="press-heading">
      <div><span className="eyebrow">Press configuration</span><h3 id="press-trigger-heading">Choose a trigger</h3></div>
      <span className="hold-threshold"><Clock3 size={12}/>500 ms</span>
    </div>
    <div className="trigger-tabs" role="group" aria-label="Press trigger">
      <button className={selected.trigger === "short" ? "selected" : ""} onClick={() => selectTrigger("short")} aria-pressed={selected.trigger === "short"}>
        <MousePointerClick size={15}/><span><strong>Short press</strong><small>Release before 500 ms</small></span>
      </button>
      <button className={selected.trigger === "long" ? "selected" : ""} onClick={() => selectTrigger("long")} aria-pressed={selected.trigger === "long"}>
        <Clock3 size={15}/><span><strong>Long press</strong><small>Hold for at least 500 ms</small></span>
      </button>
    </div>
  </section>;

  if (!binding) return <aside className="inspector panel">
    <div className="panel-heading"><div><span className="eyebrow">Inspector</span><h2>Binding</h2></div><SlidersHorizontal size={18}/></div>
    <div className="control-badge"><span>{formatControl(selected)}</span><strong>{formatTrigger(selected)}</strong></div>
    {triggerPanel}
    <div className="empty binding-empty"><strong>No {selected.trigger === "long" ? "long-press" : "short-press"} action</strong><span>Choose an action from the library to assign it. Short and long presses are saved independently.</span></div>
  </aside>;

  const action = binding.action;
  const configurationError = actionConfigurationError(action);
  const patchAction = (value: Record<string, string>) => onChange({ ...binding, action: { ...action, ...value } as Binding["action"] });
  return <aside className="inspector panel">
    <div className="panel-heading"><div><span className="eyebrow">Inspector</span><h2>Binding</h2></div><SlidersHorizontal size={18}/></div>
    <div className="control-badge"><span>{formatControl(selected)}</span><strong>{formatTrigger(selected)}</strong></div>
    {triggerPanel}
    <label className="field"><span>Display label</span><input value={binding.label} onChange={(event) => onChange({ ...binding, label: event.target.value })}/></label>
    <label className="field"><span>Action</span><input value={action.type.replace(/\./g, " / ")} readOnly/></label>
    {action.type === "keyboard.shortcut" && <label className="field"><span>Keys</span><input value={action.keys} onChange={(event) => patchAction({ keys: event.target.value })}/></label>}
    {(action.type === "system.open" || action.type === "system.launch") && <label className="field"><span>Target</span><input value={action.target} onChange={(event) => patchAction({ target: event.target.value })}/></label>}
    {action.type === "text.type" && <label className="field"><span>Text</span><textarea value={action.text} onChange={(event) => patchAction({ text: event.target.value })}/></label>}
    <div className={`validation ${configurationError ? "invalid" : ""}`}>{configurationError ? <AlertTriangle size={15}/> : <Check size={15}/>} {configurationError ?? "Configuration valid"}</div>
  </aside>;
}

function formatControl(selected: SelectedControl) {
  return selected.control.replace("button-", "Key ").replace("rotary-", "Encoder ");
}

function formatTrigger(selected: SelectedControl) {
  return selected.trigger.replace("rotate-", "turn ").replace("short", "short press").replace("long", "long press");
}
