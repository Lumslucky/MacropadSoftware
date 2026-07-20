use std::{
    collections::VecDeque,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    thread,
    time::Duration,
};

use hidapi::{HidApi, HidDevice};
use serde::Serialize;

mod actions;
mod updater;
use actions::{execute_action, ActionRequest};
use updater::UpdateRuntime;

const MACROPAD_VENDOR_ID: u16 = 0x303A;
const MACROPAD_PRODUCT_ID: u16 = 0x1001;
const HID_READ_TIMEOUT_MS: i32 = 30;
const RECONNECT_DELAY: Duration = Duration::from_millis(750);
const MAX_QUEUED_EVENTS: usize = 32;
const MAX_QUEUED_DEVICE_COMMANDS: usize = 128;
const DEVICE_COMMANDS: [u8; 15] = [
    0xA0, 0xA1, 0xA2, 0xA3, 0xA4, 0xA6, 0xAF, 0xB0, 0xB1, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6, 0xB7,
];

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DeviceSnapshot {
    state: &'static str,
    name: &'static str,
    firmware_version: Option<String>,
    protocol: &'static str,
    lighting_control_available: bool,
    vendor_id: u16,
    product_id: u16,
}

impl DeviceSnapshot {
    fn disconnected() -> Self {
        Self {
            state: "disconnected",
            name: "MacroPad",
            firmware_version: None,
            protocol: "4-byte generic USB HID",
            lighting_control_available: false,
            vendor_id: MACROPAD_VENDOR_ID,
            product_id: MACROPAD_PRODUCT_ID,
        }
    }

    fn connected() -> Self {
        Self {
            state: "connected",
            lighting_control_available: true,
            ..Self::disconnected()
        }
    }
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DeviceEvent {
    control_id: u8,
    value: u8,
    raw: [u8; 4],
}

struct DeviceRuntime {
    snapshot: Mutex<DeviceSnapshot>,
    events: Mutex<VecDeque<DeviceEvent>>,
    commands: Mutex<VecDeque<[u8; 4]>>,
    stopped: AtomicBool,
}

impl DeviceRuntime {
    fn new() -> Self {
        Self {
            snapshot: Mutex::new(DeviceSnapshot::disconnected()),
            events: Mutex::new(VecDeque::new()),
            commands: Mutex::new(VecDeque::new()),
            stopped: AtomicBool::new(false),
        }
    }

    fn set_connection(&self, is_connected: bool) {
        *self.snapshot.lock().expect("device snapshot lock poisoned") = if is_connected {
            DeviceSnapshot::connected()
        } else {
            DeviceSnapshot::disconnected()
        };
    }

    fn queue_event(&self, event: DeviceEvent) {
        let mut events = self.events.lock().expect("device event lock poisoned");
        if events.len() == MAX_QUEUED_EVENTS {
            events.pop_front();
        }
        events.push_back(event);
    }

    fn set_firmware_version(&self, version: String) {
        let mut snapshot = self.snapshot.lock().expect("device snapshot lock poisoned");
        if snapshot.state == "connected" {
            snapshot.firmware_version = Some(version);
        }
    }

    fn firmware_version(&self) -> Option<String> {
        self.snapshot
            .lock()
            .expect("device snapshot lock poisoned")
            .firmware_version
            .clone()
    }

    fn queue_command(&self, command: [u8; 4]) -> Result<(), String> {
        if !DEVICE_COMMANDS.contains(&command[0]) {
            return Err("unsupported device command".into());
        }
        let mut commands = self.commands.lock().expect("device command lock poisoned");
        if commands.len() >= MAX_QUEUED_DEVICE_COMMANDS {
            return Err("device command queue is full".into());
        }
        commands.push_back(command);
        Ok(())
    }
}

fn open_macropad() -> Option<HidDevice> {
    HidApi::new()
        .ok()?
        .open(MACROPAD_VENDOR_ID, MACROPAD_PRODUCT_ID)
        .ok()
}

fn parse_report(report: &[u8]) -> Option<DeviceEvent> {
    let raw: [u8; 4] = report.get(..4)?.try_into().ok()?;
    if raw[0] > 7 {
        return None;
    }
    Some(DeviceEvent {
        control_id: raw[0],
        value: raw[1],
        raw,
    })
}

fn monitor_device(runtime: Arc<DeviceRuntime>) {
    while !runtime.stopped.load(Ordering::Relaxed) {
        let Some(device) = open_macropad() else {
            runtime.set_connection(false);
            thread::sleep(RECONNECT_DELAY);
            continue;
        };

        runtime.set_connection(true);
        let _ = runtime.queue_command([0xAF, 0, 0, 0]);
        let mut report = [0_u8; 64];
        while !runtime.stopped.load(Ordering::Relaxed) {
            let command = runtime
                .commands
                .lock()
                .expect("device command lock poisoned")
                .pop_front();
            if let Some(command) = command {
                let output_report = [0, command[0], command[1], command[2], command[3]];
                if device.write(&output_report).is_err() {
                    break;
                }
            }
            match device.read_timeout(&mut report, HID_READ_TIMEOUT_MS) {
                Ok(0) => continue,
                Ok(length) => {
                    if let Some(version) = parse_firmware_version(&report[..length]) {
                        runtime.set_firmware_version(version);
                        continue;
                    }
                    if let Some(event) = parse_report(&report[..length]) {
                        runtime.queue_event(event);
                    }
                }
                Err(_) => break,
            }
        }
        runtime.set_connection(false);
    }
}

fn parse_firmware_version(report: &[u8]) -> Option<String> {
    let bytes = report.get(..4)?;
    (bytes[0] == 0xF0).then(|| format!("{}.{}.{}", bytes[1], bytes[2], bytes[3]))
}

#[tauri::command]
fn get_device_snapshot(runtime: tauri::State<'_, Arc<DeviceRuntime>>) -> DeviceSnapshot {
    runtime
        .snapshot
        .lock()
        .expect("device snapshot lock poisoned")
        .clone()
}

#[tauri::command]
fn drain_device_events(runtime: tauri::State<'_, Arc<DeviceRuntime>>) -> Vec<DeviceEvent> {
    runtime
        .events
        .lock()
        .expect("device event lock poisoned")
        .drain(..)
        .collect()
}

#[tauri::command]
fn run_action(action: ActionRequest) -> Result<(), String> {
    execute_action(action)
}

#[tauri::command]
fn send_device_command(
    command: [u8; 4],
    runtime: tauri::State<'_, Arc<DeviceRuntime>>,
) -> Result<(), String> {
    if runtime
        .snapshot
        .lock()
        .expect("device snapshot lock poisoned")
        .state
        != "connected"
    {
        return Err("MacroPad is disconnected".into());
    }
    runtime.queue_command(command)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let runtime = Arc::new(DeviceRuntime::new());
    let monitor_runtime = Arc::clone(&runtime);
    thread::spawn(move || monitor_device(monitor_runtime));

    let app = tauri::Builder::default()
        .manage(Arc::clone(&runtime))
        .manage(UpdateRuntime::default())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            get_device_snapshot,
            drain_device_events,
            run_action,
            send_device_command,
            updater::check_app_update,
            updater::install_app_update,
            updater::check_firmware_update,
            updater::download_firmware_update,
            updater::list_firmware_ports,
            updater::flash_firmware_update
        ])
        .build(tauri::generate_context!())
        .expect("error while building Tauri application");

    app.run(move |_app, event| {
        if matches!(event, tauri::RunEvent::Exit) {
            runtime.stopped.store(true, Ordering::Relaxed);
        }
    });
}

#[cfg(test)]
mod tests {
    use super::{open_macropad, parse_firmware_version, parse_report, DeviceRuntime};

    #[test]
    fn parses_the_current_four_byte_firmware_report() {
        let event = parse_report(&[7, 1, 0, 0]).expect("valid report");
        assert_eq!(event.control_id, 7);
        assert_eq!(event.value, 1);
    }

    #[test]
    fn rejects_unknown_control_ids_and_short_reports() {
        assert!(parse_report(&[8, 0, 0, 0]).is_none());
        assert!(parse_report(&[1, 0]).is_none());
    }

    #[test]
    fn parses_firmware_version_reports_separately_from_button_events() {
        assert_eq!(
            parse_firmware_version(&[0xF0, 1, 2, 3]),
            Some("1.2.3".into())
        );
        assert!(parse_report(&[0xF0, 1, 2, 3]).is_none());
    }

    #[test]
    fn rejects_unknown_output_commands() {
        let runtime = DeviceRuntime::new();
        assert!(runtime.queue_command([0xA0, 0, 0, 0]).is_ok());
        assert!(runtime.queue_command([0xB7, 255, 0, 128]).is_ok());
        assert!(runtime.queue_command([0xFF, 0, 0, 0]).is_err());
    }

    #[test]
    #[ignore = "requires a physical MacroPad"]
    fn opens_the_connected_macropad() {
        assert!(open_macropad().is_some());
    }
}
