import { useEffect, useMemo, useRef, useState } from "react";
import { Cpu, Grid3X3, Lightbulb, Monitor, Plus, Save, Settings } from "lucide-react";
import "./App.css";
import { ActionLibrary } from "./components/ActionLibrary";
import { BindingInspector } from "./components/BindingInspector";
import { DeviceCanvas } from "./components/DeviceCanvas";
import { VirtualButtonInspector } from "./components/VirtualButtonInspector";
import { VirtualDeck } from "./components/VirtualDeck";
import { OledStudio } from "./components/OledStudio";
import { LightingStudio } from "./components/LightingStudio";
import { DeviceCenter } from "./components/DeviceCenter";
import type { ActionDefinition } from "./domain/actions";
import { addVirtualButton, getBinding, removeVirtualButton, setBinding, setVirtualButton, type SelectedControl, type VirtualButton } from "./domain/profile";
import { drainDeviceEvents, executeAction, getDeviceSnapshot, syncLighting, syncOledDisplay, type DeviceEvent, type DeviceSnapshot } from "./services/desktopBridge";
import { loadProfile, saveProfile } from "./services/profileRepository";
import macroPadLogo from "./assets/macropad-logo.png";
import { controlFromDeviceButtonId } from "./domain/deviceLayout";

type View = "keys" | "virtual" | "display" | "lighting" | "device";

function App() {
  const [profile, setProfile] = useState(loadProfile);
  const [selected, setSelected] = useState<SelectedControl>({ control: "button-6", trigger: "short" });
  const [selectedVirtualId, setSelectedVirtualId] = useState<string | null>(() => profile.virtualButtons[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>("keys");
  const [device, setDevice] = useState<DeviceSnapshot | null>(null);
  const [lastDeviceEvent, setLastDeviceEvent] = useState<DeviceEvent | null>(null);
  const [actionStatus, setActionStatus] = useState("Ready for input");
  const profileRef = useRef(profile);
  const wasDeviceConnected = useRef(false);
  const binding = useMemo(() => getBinding(profile, selected), [profile, selected]);
  const selectedVirtualButton = useMemo(() => profile.virtualButtons.find((button) => button.id === selectedVirtualId), [profile.virtualButtons, selectedVirtualId]);
  useEffect(() => { profileRef.current = profile; }, [profile]);

  useEffect(() => {
    let isActive = true;
    let isReading = false;
    const refreshDevice = () => getDeviceSnapshot().then((snapshot) => isActive && setDevice(snapshot)).catch(() => isActive && setDevice(null));
    const readEvents = async () => {
      if (isReading) return;
      isReading = true;
      try {
        const events = await drainDeviceEvents();
        if (!isActive || events.length === 0) return;
        for (const event of events) {
          const eventSelection = selectionFromDeviceEvent(event);
          if (!eventSelection) continue;
          setLastDeviceEvent(event);
          setSelected(eventSelection);
          const assignedBinding = getBinding(profileRef.current, eventSelection);
          if (!assignedBinding || assignedBinding.action.type === "none") {
            setActionStatus("Control is unassigned");
            continue;
          }
          try {
            await executeAction(assignedBinding.action);
            if (isActive) setActionStatus(`Executed · ${assignedBinding.label}`);
          } catch (error) {
            if (isActive) setActionStatus(`Action failed · ${String(error)}`);
          }
        }
      } finally {
        isReading = false;
      }
    };
    refreshDevice();
    const snapshotTimer = window.setInterval(refreshDevice, 750);
    const eventTimer = window.setInterval(readEvents, 100);
    return () => { isActive = false; window.clearInterval(snapshotTimer); window.clearInterval(eventTimer); };
  }, []);
  useEffect(() => { saveProfile(profile); }, [profile]);
  useEffect(() => {
    const isConnected = device?.state === "connected";
    if (isConnected && !wasDeviceConnected.current) {
      Promise.all([syncOledDisplay(profile.oled, profile.name), syncLighting(profile.lighting)])
        .then(() => setActionStatus("Display and lighting synchronized"))
        .catch(() => undefined);
    }
    wasDeviceConnected.current = isConnected;
  }, [device?.state, profile.name, profile.oled, profile.lighting]);

  useEffect(() => {
    if (device?.state !== "connected" || profile.oled.mode !== "clock") return;
    const timer = window.setInterval(() => syncOledDisplay(profileRef.current.oled, profileRef.current.name).catch(() => undefined), 30_000);
    return () => window.clearInterval(timer);
  }, [device?.state, profile.oled.mode]);

  const choosePhysicalAction = (definition: ActionDefinition) => setProfile((current) => setBinding(current, {
    control: selected.control, trigger: selected.trigger, label: definition.name, action: definition.defaults,
  }));

  const chooseVirtualAction = (definition: ActionDefinition) => {
    if (!selectedVirtualButton) return;
    setProfile((current) => setVirtualButton(current, { ...selectedVirtualButton, label: definition.name, action: definition.defaults }));
  };

  const runVirtualButton = async (button: VirtualButton) => {
    if (button.action.type === "none") { setActionStatus("Virtual button is unassigned"); return; }
    try { await executeAction(button.action); setActionStatus(`Executed · ${button.label}`); }
    catch (error) { setActionStatus(`Action failed · ${String(error)}`); }
  };

  const addVirtualControl = () => {
    const id = `virtual-${Date.now()}`;
    setProfile((current) => addVirtualButton(current, { id, label: "New button", action: { type: "none" } }));
    setSelectedVirtualId(id);
  };

  const deleteVirtualControl = (id: string) => {
    setProfile((current) => {
      const updated = removeVirtualButton(current, id);
      setSelectedVirtualId(updated.virtualButtons[0]?.id ?? null);
      return updated;
    });
  };

  const applyOledSettings = async () => {
    try { await syncOledDisplay(profile.oled, profile.name); setActionStatus("OLED settings applied"); }
    catch (error) { setActionStatus(`OLED failed · ${String(error)}`); }
  };

  const applyLightingSettings = async () => {
    try { await syncLighting(profile.lighting); setActionStatus("Lighting settings applied"); }
    catch (error) { setActionStatus(`Lighting failed · ${String(error)}`); }
  };

  return <div className="app-shell">
    <nav className="rail" aria-label="Main navigation">
      <div className="brand"><img src={macroPadLogo} alt="MacroPad Studio"/></div>
      <button className={view === "keys" ? "active" : ""} onClick={() => setView("keys")} aria-label="Physical controls"><Grid3X3/></button>
      <button className={view === "virtual" ? "active" : ""} onClick={() => setView("virtual")} aria-label="Virtual deck"><Plus/></button>
      <button className={view === "display" ? "active" : ""} onClick={() => setView("display")} aria-label="OLED display"><Monitor/></button>
      <button className={view === "lighting" ? "active" : ""} onClick={() => setView("lighting")} aria-label="Lighting"><Lightbulb/></button>
      <button className={view === "device" ? "active" : ""} onClick={() => setView("device")} aria-label="Device"><Cpu/></button>
      <span className="rail-spacer"/><button aria-label="Settings"><Settings/></button>
    </nav>

    {view === "keys" && <><ActionLibrary query={query} onQuery={setQuery} onChoose={choosePhysicalAction}/><DeviceCanvas profile={profile} selected={selected} onSelect={setSelected} isConnected={device?.state === "connected"} lastEvent={lastDeviceEvent}/><BindingInspector selected={selected} binding={binding} onSelect={setSelected} onChange={(value) => setProfile((current) => setBinding(current, value))}/></>}
    {view === "virtual" && <><ActionLibrary query={query} onQuery={setQuery} onChoose={chooseVirtualAction}/><VirtualDeck buttons={profile.virtualButtons} selectedId={selectedVirtualId} onSelect={setSelectedVirtualId} onExecute={runVirtualButton} onAdd={addVirtualControl}/><VirtualButtonInspector button={selectedVirtualButton} onChange={(button) => setProfile((current) => setVirtualButton(current, button))} onDelete={deleteVirtualControl} onTest={runVirtualButton}/></>}
    {view === "display" && <OledStudio settings={profile.oled} profileName={profile.name} isConnected={device?.state === "connected"} onChange={(oled) => setProfile((current) => ({ ...current, oled }))} onApply={applyOledSettings}/>} 
    {view === "lighting" && <LightingStudio settings={profile.lighting} isConnected={device?.state === "connected"} onChange={(lighting) => setProfile((current) => ({ ...current, lighting }))} onApply={applyLightingSettings}/>} 
    {view === "device" && <DeviceCenter device={device}/>} 
    <footer className="statusbar"><span className={`status-dot ${device?.state === "connected" ? "online" : ""}`}/><span>{device?.state === "connected" ? `MacroPad connected · ${actionStatus}` : "Editor mode · device disconnected"}</span><button onClick={() => saveProfile(profile)}><Save size={14}/>Saved</button></footer>
  </div>;
}

export default App;

function selectionFromDeviceEvent(event: DeviceEvent): SelectedControl | null {
  if (event.controlId < 6) {
    const control = controlFromDeviceButtonId(event.controlId);
    return control ? { control, trigger: event.value === 1 ? "long" : "short" } : null;
  }
  if (event.controlId === 6) return { control: "rotary-press", trigger: event.value === 1 ? "long" : "short" };
  if (event.controlId === 7) return { control: "rotary-turn", trigger: event.value === 0 ? "rotate-left" : "rotate-right" };
  return null;
}
