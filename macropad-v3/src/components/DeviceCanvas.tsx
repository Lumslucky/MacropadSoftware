import { Zap } from "lucide-react";
import type { Profile, SelectedControl } from "../domain/profile";
import { getBinding } from "../domain/profile";
import type { DeviceEvent } from "../services/desktopBridge";
import { physicalButtonLayout } from "../domain/deviceLayout";
import { iconForAction } from "./actionIcon";

export function DeviceCanvas({ profile, selected, onSelect, isConnected, lastEvent }: {
  profile: Profile;
  selected: SelectedControl;
  onSelect: (value: SelectedControl) => void;
  isConnected: boolean;
  lastEvent: DeviceEvent | null;
}) {
  return <section className="device-stage" aria-label="MacroPad layout">
    <div className="stage-header"><div><span className="eyebrow">6 buttons · OLED · pressable encoder</span><h1>{profile.name}</h1></div><div className={`sync-state ${isConnected ? "connected" : ""}`}><span/>{isConnected ? "MacroPad connected" : "Profile saved locally"}</div></div>
    <div className="device-shell portrait">
      <div className="hardware-head">
        <div className="encoder-cluster">
          <button className={`encoder ${selected.control === "rotary-press" ? "selected" : ""}`} onClick={() => onSelect({ control: "rotary-press", trigger: "short" })} aria-label="Rotary encoder press"><i/><strong>Press</strong></button>
          <div className="encoder-directions">
            <button className={selected.control === "rotary-turn" && selected.trigger === "rotate-left" ? "selected" : ""} onClick={() => onSelect({ control: "rotary-turn", trigger: "rotate-left" })} aria-label="Encoder turn left">↶</button>
            <button className={selected.control === "rotary-turn" && selected.trigger === "rotate-right" ? "selected" : ""} onClick={() => onSelect({ control: "rotary-turn", trigger: "rotate-right" })} aria-label="Encoder turn right">↷</button>
          </div>
        </div>
        <span className="device-display"><small>OLED · 128 × 32</small><strong>{isConnected ? "USB LINK · ONLINE" : "COMMAND DECK · READY"}</strong><em>{lastEvent ? `RX ${lastEvent.controlId}:${lastEvent.value}` : "WAITING FOR INPUT"}</em></span>
      </div>
      <div className="key-grid portrait-grid">
        {physicalButtonLayout.map(({ position, control, buttonNumber }, index) => {
          const choice = { control, trigger: "short" as const };
          const isSelected = selected.control === control;
          const visibleBinding = getBinding(profile, isSelected ? selected : choice);
          const Icon = iconForAction(visibleBinding?.action);
          return <button key={position} aria-label={`Physical position ${position}, Button ${buttonNumber}`} style={{"--delay": `${index * 35}ms`} as React.CSSProperties} className={`macro-key ${isSelected ? "selected" : ""}`} onClick={() => onSelect(choice)}>
            <Icon size={25}/><strong>{visibleBinding?.label ?? "Unassigned"}</strong><span>{visibleBinding?.action.type.replace(/\./g, " / ") ?? "none"}</span>
            {isSelected && selected.trigger === "long" && <em className="key-trigger">LONG · {visibleBinding?.label ?? "UNASSIGNED"}</em>}
          </button>;
        })}
      </div>
      <div className="device-mark">MACROPAD · ESP32-S3</div>
    </div>
    <div className="tip"><Zap size={15}/> Select a control, then choose an action from the library.</div>
  </section>;
}
