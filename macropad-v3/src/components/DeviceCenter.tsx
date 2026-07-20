import { useEffect, useState } from "react";
import { AlertTriangle, Check, CheckCircle2, Cpu, Download, LoaderCircle, RefreshCw, ShieldCheck, Usb, Zap } from "lucide-react";
import type { DeviceSnapshot, FirmwarePort, FirmwareUpdateStatus, AppUpdateStatus, UpdateProgress } from "../services/desktopBridge";
import { checkAppUpdate, checkFirmwareUpdate, downloadFirmwareUpdate, flashFirmwareUpdate, installAppUpdate, listFirmwarePorts } from "../services/desktopBridge";

type FirmwarePhase = "release" | "downloading" | "verified" | "flashing" | "confirming" | "complete" | "failed";

export function DeviceCenter({ device }: { device: DeviceSnapshot | null }) {
  const [appUpdate, setAppUpdate] = useState<AppUpdateStatus | null>(null);
  const [firmwareUpdate, setFirmwareUpdate] = useState<FirmwareUpdateStatus | null>(null);
  const [checking, setChecking] = useState(true);
  const [appBusy, setAppBusy] = useState(false);
  const [firmwarePhase, setFirmwarePhase] = useState<FirmwarePhase>("release");
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Checking signed release channels");
  const [error, setError] = useState<string | null>(null);
  const [ports, setPorts] = useState<FirmwarePort[]>([]);
  const [selectedPort, setSelectedPort] = useState("");
  const [bootConfirmed, setBootConfirmed] = useState(false);

  const refreshUpdates = async () => {
    setChecking(true);
    setError(null);
    const [appResult, firmwareResult] = await Promise.allSettled([checkAppUpdate(), checkFirmwareUpdate()]);
    if (appResult.status === "fulfilled") setAppUpdate(appResult.value);
    if (firmwareResult.status === "fulfilled") setFirmwareUpdate(firmwareResult.value);
    const failures = [appResult, firmwareResult].filter((result) => result.status === "rejected") as PromiseRejectedResult[];
    if (failures.length) setError(failures.map((result) => String(result.reason)).join(" · "));
    setChecking(false);
    setStatusText("Release check complete");
  };

  useEffect(() => { void refreshUpdates(); }, []);

  useEffect(() => {
    if (firmwarePhase !== "confirming" || device?.state !== "connected") return;
    if (device.firmwareVersion && device.firmwareVersion === firmwareUpdate?.version) {
      setFirmwarePhase("complete");
      setProgress(100);
      setStatusText(`Firmware ${device.firmwareVersion} confirmed`);
    }
  }, [device?.state, device?.firmwareVersion, firmwarePhase, firmwareUpdate?.version]);

  const receiveProgress = (event: UpdateProgress) => {
    if (event.event === "progress") setProgress(event.data.progress);
    if (event.event === "verifying") setStatusText("Verifying publisher signature and image integrity");
    if (event.event === "finished") setProgress(100);
  };

  const installDesktopUpdate = async () => {
    setAppBusy(true);
    setError(null);
    setProgress(0);
    setStatusText("Downloading signed desktop update");
    try { await installAppUpdate(receiveProgress); }
    catch (reason) { setError(String(reason)); setAppBusy(false); }
  };

  const refreshPorts = async () => {
    try {
      const nextPorts = await listFirmwarePorts();
      setPorts(nextPorts);
      const preferred = nextPorts.find((port) => port.isMacropad) ?? nextPorts[0];
      if (preferred) setSelectedPort(preferred.name);
    } catch (reason) { setError(String(reason)); }
  };

  const downloadFirmware = async () => {
    setFirmwarePhase("downloading");
    setProgress(0);
    setError(null);
    setStatusText("Downloading firmware package");
    try {
      const update = await downloadFirmwareUpdate(receiveProgress);
      setFirmwareUpdate(update);
      setFirmwarePhase("verified");
      setStatusText("Firmware signature verified");
      await refreshPorts();
    } catch (reason) {
      setFirmwarePhase("failed");
      setError(String(reason));
      setStatusText("Firmware download stopped safely");
    }
  };

  const flashFirmware = async () => {
    setFirmwarePhase("flashing");
    setProgress(0);
    setError(null);
    setStatusText("Connecting to ESP32-S3 bootloader");
    try {
      await flashFirmwareUpdate(selectedPort, bootConfirmed, receiveProgress);
      setFirmwarePhase("confirming");
      setStatusText("Flash verified · waiting for MacroPad to reconnect");
    } catch (reason) {
      setFirmwarePhase("failed");
      setError(String(reason));
      setStatusText("Recovery mode · the verified package is ready to retry");
    }
  };

  const firmwareBusy = firmwarePhase === "downloading" || firmwarePhase === "flashing";
  return <main className="device-center">
    <header className="device-center-header">
      <div><span className="eyebrow">Hardware & signed releases</span><h1>Device center</h1><p>Keep MacroPad Studio and the ESP32-S3 firmware current from one recovery-safe workspace.</p></div>
      <button className="refresh-updates" disabled={checking || firmwareBusy || appBusy} onClick={refreshUpdates}><RefreshCw className={checking ? "spinning" : ""} size={16}/>{checking ? "Checking" : "Check again"}</button>
    </header>

    {error && <div className="update-error" role="alert"><AlertTriangle size={18}/><div><strong>Update stopped</strong><span>{error}</span></div></div>}

    <section className="hardware-summary">
      <div className="hardware-icon"><Cpu/></div><div><span className="eyebrow">Connected hardware</span><strong>{device?.name ?? "MacroPad"}</strong><small>ESP32-S3 · VID 303A / PID 1001</small></div>
      <div className="version-pair"><span>Connection<strong className={device?.state === "connected" ? "ok" : "warn"}>{device?.state ?? "checking"}</strong></span><span>Firmware<strong>{device?.firmwareVersion ? `v${device.firmwareVersion}` : "Unknown"}</strong></span></div>
    </section>

    <div className="update-grid">
      <section className="release-card">
        <div className="release-card-heading"><div className="release-icon"><Zap/></div><div><span className="eyebrow">Desktop application</span><h2>MacroPad Studio</h2></div><span className="release-version">v{appUpdate?.currentVersion ?? "0.1.0"}</span></div>
        {!appUpdate?.configured ? <UpdateNotConfigured label="Application update"/> : appUpdate.available ? <>
          <div className="release-available"><Download size={17}/><span><strong>Version {appUpdate.version} available</strong><small>{appUpdate.notes || "A signed desktop release is ready."}</small></span></div>
          <button className="primary-update" disabled={appBusy} onClick={installDesktopUpdate}>{appBusy ? <LoaderCircle className="spinning"/> : <ShieldCheck/>}{appBusy ? "Installing update" : "Download, verify & restart"}</button>
        </> : <div className="release-current"><CheckCircle2/><span><strong>You are up to date</strong><small>The signed stable channel has no newer desktop release.</small></span></div>}
      </section>

      <section className="release-card firmware-release">
        <div className="release-card-heading"><div className="release-icon"><Cpu/></div><div><span className="eyebrow">Device firmware</span><h2>ESP32-S3 firmware</h2></div><span className="release-version">{firmwareUpdate?.version ? `v${firmwareUpdate.version}` : "—"}</span></div>
        {!firmwareUpdate?.configured ? <UpdateNotConfigured label="Firmware update"/> : !firmwareUpdate.available ? <div className="release-current"><CheckCircle2/><span><strong>Firmware is up to date</strong><small>The device already runs the newest signed release.</small></span></div> : <>
          <div className="firmware-meta"><span>Target<strong>{firmwareUpdate.board}</strong></span><span>Package<strong>{formatBytes(firmwareUpdate.size)}</strong></span><span>Trust<strong><ShieldCheck size={13}/>Signed</strong></span></div>
          <p className="release-notes">{firmwareUpdate.notes || "A verified firmware release is available."}</p>
          {firmwarePhase === "release" && <button className="primary-update" onClick={downloadFirmware}><Download/>Download & verify firmware</button>}
          {firmwarePhase === "downloading" && <UpdateMeter progress={progress} label={statusText}/>} 
          {(firmwarePhase === "verified" || firmwarePhase === "failed") && <BootloaderPanel ports={ports} selectedPort={selectedPort} confirmed={bootConfirmed} onPort={setSelectedPort} onConfirmed={setBootConfirmed} onRefresh={refreshPorts} onFlash={flashFirmware}/>} 
          {firmwarePhase === "flashing" && <UpdateMeter progress={progress} label={statusText} destructive/>}
          {firmwarePhase === "confirming" && <div className="confirming-state"><LoaderCircle className="spinning"/><span><strong>Firmware written and verified</strong><small>Waiting for the normal HID device and version response.</small></span></div>}
          {firmwarePhase === "complete" && <div className="release-current"><CheckCircle2/><span><strong>Firmware {firmwareUpdate.version} confirmed</strong><small>The device rebooted and reported the expected version.</small></span></div>}
        </>}
      </section>
    </div>

    <div className="update-activity" aria-live="polite"><span className={`activity-mark ${error ? "failed" : ""}`}/><span>{statusText}</span>{progress > 0 && progress < 100 && <strong>{progress}%</strong>}</div>
  </main>;
}

function UpdateNotConfigured({ label }: { label: string }) {
  return <div className="not-configured"><AlertTriangle/><span><strong>{label} channel not configured</strong><small>Add the signed release endpoint and public key when producing a distribution build.</small></span></div>;
}

function UpdateMeter({ progress, label, destructive = false }: { progress: number; label: string; destructive?: boolean }) {
  return <div className={`update-meter ${destructive ? "destructive" : ""}`}><div><span>{label}</span><strong>{progress}%</strong></div><progress max="100" value={progress}>{progress}%</progress>{destructive && <small>Do not unplug the device or close MacroPad Studio.</small>}</div>;
}

function BootloaderPanel({ ports, selectedPort, confirmed, onPort, onConfirmed, onRefresh, onFlash }: {
  ports: FirmwarePort[]; selectedPort: string; confirmed: boolean;
  onPort: (port: string) => void; onConfirmed: (confirmed: boolean) => void; onRefresh: () => void; onFlash: () => void;
}) {
  return <div className="bootloader-panel">
    <div className="boot-instructions"><span>1</span><p><strong>Hold BOOT0</strong><small>Keep the accessible BOOT0 button pressed.</small></p><span>2</span><p><strong>Press RESET or reconnect USB</strong><small>Release BOOT0 when the serial port appears.</small></p></div>
    <label className="port-select"><span>Bootloader port</span><div><select value={selectedPort} onChange={(event) => onPort(event.target.value)}><option value="">Select ESP32-S3 port</option>{ports.map((port) => <option key={port.name} value={port.name}>{port.label}{port.isMacropad ? " · MacroPad" : ""}</option>)}</select><button onClick={onRefresh} aria-label="Refresh bootloader ports"><RefreshCw size={15}/></button></div></label>
    <label className="flash-confirm"><input type="checkbox" checked={confirmed} onChange={(event) => onConfirmed(event.target.checked)}/><span><Check size={15}/>I entered bootloader mode and understand the firmware will be replaced.</span></label>
    <button className="flash-firmware" disabled={!selectedPort || !confirmed} onClick={onFlash}><Usb/>Flash verified firmware</button>
  </div>;
}

function formatBytes(value: number | null | undefined) {
  if (!value) return "—";
  return value >= 1024 * 1024 ? `${(value / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(value / 1024)} KB`;
}
