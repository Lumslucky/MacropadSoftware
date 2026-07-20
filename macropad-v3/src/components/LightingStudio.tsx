import { Activity, Blend, Gauge, Lightbulb, Palette, Power, Rainbow, Save, Sparkles, Waves } from "lucide-react";
import type { CSSProperties } from "react";
import type { LightingSettings } from "../domain/profile";
import { lightingZonesFromPhysicalOrder, physicalButtonLayout } from "../domain/deviceLayout";

const modes = [
  { id: "static", label: "Static", description: "Six fixed zone colors", icon: Palette },
  { id: "breathing", label: "Breathing", description: "Soft brightness pulse", icon: Waves },
  { id: "spectrum", label: "Spectrum", description: "All LEDs cycle together", icon: Rainbow },
  { id: "wave", label: "Wave", description: "Flowing spatial rainbow", icon: Sparkles },
  { id: "reactive", label: "Reactive", description: "Keys flare when pressed", icon: Activity },
] as const;

const presets: { name: string; colors: string[] }[] = [
  { name: "Aurora", colors: ["#00E5B0", "#08A4FF", "#665CFF", "#C44DFF", "#FF4B9B", "#FF9F43"] },
  { name: "Arctic", colors: ["#E9FFFF", "#AEF4FF", "#63D7FF", "#2DA9FF", "#5475FF", "#905CFF"] },
  { name: "Ember", colors: ["#FFEA8A", "#FFBE45", "#FF8A24", "#FF542B", "#E52B50", "#9A255F"] },
  { name: "Cyber", colors: ["#00FFC8", "#00C8FF", "#7657FF", "#D84DFF", "#FF3D9A", "#00FFC8"] },
  { name: "Mono", colors: ["#E8FFFF", "#D2F8F4", "#BCEBE5", "#A6DED6", "#90D1C7", "#7AC4B8"] },
];

export function LightingStudio({ settings, isConnected, onChange, onApply }: {
  settings: LightingSettings;
  isConnected: boolean;
  onChange: (settings: LightingSettings) => void;
  onApply: () => void;
}) {
  const updateZone = (index: number, color: string) => onChange({
    ...settings,
    zones: settings.zones.map((current, zone) => zone === index ? color.toUpperCase() : current),
  });
  const applyPreset = (colors: string[]) => onChange({ ...settings, zones: lightingZonesFromPhysicalOrder(colors) });
  const previewStyle = {
    "--lighting-brightness": settings.enabled ? Math.max(.12, settings.brightness / 254) : .04,
    "--lighting-speed": `${2.8 - (settings.speed / 255 * 2.3)}s`,
  } as CSSProperties;

  return <main className="lighting-studio">
    <div className="stage-header"><div><span className="eyebrow">Six-zone RGB engine</span><h1>Lighting studio</h1></div><span className={`oled-connection ${isConnected ? "connected" : ""}`}>{isConnected ? "Device online" : "Connect to apply"}</span></div>

    <section className={`lighting-preview mode-${settings.mode} ${settings.enabled ? "" : "disabled"}`} style={previewStyle} aria-label="Lighting preview">
      <div className="preview-copy"><span className="eyebrow">Live preview</span><strong>{settings.mode}</strong><small>{Math.round(settings.brightness / 254 * 100)}% · speed {Math.round(settings.speed / 255 * 100)}%</small></div>
      <div className="preview-pads">{physicalButtonLayout.map((button, index) => <span key={button.position} aria-label={`${button.location} light, Button ${button.buttonNumber}`} style={{ "--zone-color": settings.zones[button.lightingZone], "--zone-delay": `${index * -.11}s` } as CSSProperties}/>)}</div>
    </section>

    <section className="lighting-section"><div><span className="eyebrow">Effect</span><h2>Lighting mode</h2></div><div className="lighting-modes">{modes.map(({ id, label, description, icon: Icon }) => <button key={id} className={settings.mode === id ? "selected" : ""} onClick={() => onChange({ ...settings, mode: id })}><Icon size={18}/><span><strong>{label}</strong><small>{description}</small></span></button>)}</div></section>

    <section className="lighting-section lighting-colors"><div className="lighting-section-heading"><div><span className="eyebrow">Palette</span><h2>Individual LED colors</h2></div><Blend size={18}/></div>
      <div className="preset-row">{presets.map((preset) => <button key={preset.name} onClick={() => applyPreset(preset.colors)}><span>{preset.colors.slice(0, 4).map((color) => <i key={color} style={{ background: color }}/>)}</span>{preset.name}</button>)}</div>
      <div className="zone-colors">{physicalButtonLayout.map((button) => {
        const color = settings.zones[button.lightingZone];
        return <label key={button.position}><span>{button.location}</span><span className="color-control"><input aria-label={`${button.location} light, Button ${button.buttonNumber}`} type="color" value={color} onChange={(event) => updateZone(button.lightingZone, event.target.value)}/><output>{color.toUpperCase()}</output></span></label>;
      })}</div>
    </section>

    <section className="lighting-section lighting-controls">
      <label><span><Lightbulb size={16}/>Brightness</span><input aria-label="Lighting brightness" type="range" min="1" max="254" value={settings.brightness} onChange={(event) => onChange({ ...settings, brightness: Number(event.target.value) })}/><output>{Math.round(settings.brightness / 254 * 100)}%</output></label>
      <label><span><Gauge size={16}/>Animation speed</span><input aria-label="Animation speed" type="range" min="1" max="255" value={settings.speed} disabled={settings.mode === "static"} onChange={(event) => onChange({ ...settings, speed: Number(event.target.value) })}/><output>{Math.round(settings.speed / 255 * 100)}%</output></label>
      <button className={settings.enabled ? "selected" : ""} onClick={() => onChange({ ...settings, enabled: !settings.enabled })}><Power size={17}/>{settings.enabled ? "Lights on" : "Lights off"}</button>
    </section>
    <button className="apply-lighting" disabled={!isConnected} onClick={onApply}><Save size={17}/>Apply to MacroPad</button>
  </main>;
}
