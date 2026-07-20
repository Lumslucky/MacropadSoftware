import { Activity, Clock3, Eye, FileText, Monitor, Power, Type } from "lucide-react";
import { useEffect, useState } from "react";
import type { OledSettings } from "../domain/profile";

const modes = [
  { id: "status", label: "Status", description: "USB and hardware state", icon: Monitor },
  { id: "clock", label: "Clock", description: "Host-synchronized time", icon: Clock3 },
  { id: "profile", label: "Profile", description: "Active profile name", icon: FileText },
  { id: "custom", label: "Custom", description: "Your own two-line text", icon: Type },
  { id: "activity", label: "Activity", description: "Last key or encoder input", icon: Activity },
] as const;

export function OledStudio({ settings, profileName, isConnected, onChange, onApply }: {
  settings: OledSettings;
  profileName: string;
  isConnected: boolean;
  onChange: (settings: OledSettings) => void;
  onApply: () => void;
}) {
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => { const timer = window.setInterval(() => setClock(new Date()), 1000); return () => window.clearInterval(timer); }, []);
  const previewText = settings.mode === "clock"
    ? clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
    : settings.mode === "profile" ? profileName.toUpperCase()
    : settings.mode === "custom" ? settings.customText.toUpperCase()
    : settings.mode === "activity" ? "BUTTON 1 · SHORT"
    : "USB HID ONLINE";

  return <main className="oled-studio">
    <div className="stage-header"><div><span className="eyebrow">128 × 32 monochrome</span><h1>OLED studio</h1></div><span className={`oled-connection ${isConnected ? "connected" : ""}`}>{isConnected ? "Device online" : "Connect to apply"}</span></div>
    <div className="oled-preview-wrap"><span className="preview-label">Live preview</span><div className={`oled-preview ${settings.inverted ? "inverted" : ""} ${settings.enabled ? "" : "disabled"}`} style={{ opacity: settings.enabled ? Math.max(.3, settings.brightness / 255) : .12 }}>
      <small>{settings.mode === "status" ? "MACROPAD STATUS" : settings.mode.toUpperCase()}</small><strong>{previewText || " "}</strong><em>{settings.mode === "status" ? "6 KEYS + ENCODER" : "MACROPAD STUDIO"}</em>
    </div></div>
    <section className="oled-section"><div><span className="eyebrow">Content</span><h2>Display mode</h2></div><div className="oled-modes">{modes.map(({id,label,description,icon:Icon}) => <button key={id} className={settings.mode === id ? "selected" : ""} onClick={() => onChange({ ...settings, mode: id })}><Icon size={18}/><span><strong>{label}</strong><small>{description}</small></span></button>)}</div></section>
    {settings.mode === "custom" && <section className="oled-section compact"><label className="field"><span>Custom text · 24 characters</span><input maxLength={24} value={settings.customText} onChange={(event) => onChange({ ...settings, customText: event.target.value })}/></label></section>}
    <section className="oled-section controls"><label><span><Eye size={16}/>Brightness</span><input type="range" min="1" max="255" value={settings.brightness} onChange={(event) => onChange({ ...settings, brightness: Number(event.target.value) })}/><output>{Math.round(settings.brightness / 255 * 100)}%</output></label><button className={settings.inverted ? "selected" : ""} onClick={() => onChange({ ...settings, inverted: !settings.inverted })}><Eye size={17}/>Invert</button><button className={settings.enabled ? "selected" : ""} onClick={() => onChange({ ...settings, enabled: !settings.enabled })}><Power size={17}/>{settings.enabled ? "On" : "Off"}</button></section>
    <button className="apply-oled" disabled={!isConnected} onClick={onApply}><Monitor size={17}/>Apply to MacroPad</button>
  </main>;
}
