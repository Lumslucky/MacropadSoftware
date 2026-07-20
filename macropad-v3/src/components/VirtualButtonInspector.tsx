import { AlertTriangle, Check, Play, SlidersHorizontal, Trash2 } from "lucide-react";
import { actionConfigurationError, type VirtualButton } from "../domain/profile";

export function VirtualButtonInspector({ button, onChange, onDelete, onTest }: {
  button?: VirtualButton;
  onChange: (button: VirtualButton) => void;
  onDelete: (id: string) => void;
  onTest: (button: VirtualButton) => void;
}) {
  if (!button) return <aside className="inspector panel"><div className="empty">Add or select a virtual button to configure it.</div></aside>;
  const action = button.action;
  const configurationError = actionConfigurationError(action);
  const patchAction = (value: Record<string, string>) => onChange({ ...button, action: { ...action, ...value } as VirtualButton["action"] });
  return <aside className="inspector panel">
    <div className="panel-heading"><div><span className="eyebrow">Inspector</span><h2>Virtual button</h2></div><SlidersHorizontal size={18}/></div>
    <div className="control-badge"><span>Software control</span><strong>Clickable</strong></div>
    <label className="field"><span>Display label</span><input value={button.label} onChange={(event) => onChange({ ...button, label: event.target.value })}/></label>
    <label className="field"><span>Action</span><input value={action.type.replace(/\./g, " / ")} readOnly/></label>
    {action.type === "keyboard.shortcut" && <label className="field"><span>Keys</span><input value={action.keys} onChange={(event) => patchAction({ keys: event.target.value })}/></label>}
    {(action.type === "system.open" || action.type === "system.launch") && <label className="field"><span>Target</span><input value={action.target} onChange={(event) => patchAction({ target: event.target.value })}/></label>}
    {action.type === "text.type" && <label className="field"><span>Text</span><textarea value={action.text} onChange={(event) => patchAction({ text: event.target.value })}/></label>}
    <div className={`validation ${configurationError ? "invalid" : ""}`}>{configurationError ? <AlertTriangle size={15}/> : <Check size={15}/>} {configurationError ?? "Configuration valid"}</div>
    <div className="inspector-actions"><button className="test-action" disabled={Boolean(configurationError)} onClick={() => onTest(button)}><Play size={15}/>Run now</button><button className="delete-action" onClick={() => onDelete(button.id)}><Trash2 size={15}/>Delete</button></div>
  </aside>;
}
