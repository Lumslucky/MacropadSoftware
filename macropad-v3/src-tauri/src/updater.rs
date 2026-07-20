use std::{
    borrow::Cow,
    io::{Cursor, Read},
    sync::{Arc, Mutex},
    time::Duration,
};

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use espflash::{
    connection::{Connection, ResetAfterOperation, ResetBeforeOperation},
    flasher::Flasher,
    image_format::Segment,
    target::{Chip, ProgressCallbacks},
};
use futures_util::StreamExt;
use minisign_verify::{PublicKey, Signature};
use reqwest::Client;
use semver::Version;
use serde::{Deserialize, Serialize};
use serialport::{FlowControl, SerialPortType, UsbPortInfo};
use sha2::{Digest, Sha256};
use tauri::{ipc::Channel, AppHandle, State};
use tauri_plugin_updater::{Update, UpdaterExt};
use url::Url;
use zip::ZipArchive;

use super::DeviceRuntime;

const MACROPAD_VENDOR_ID: u16 = 0x303A;
const MACROPAD_PRODUCT_ID: u16 = 0x1001;
const MAX_FIRMWARE_PACKAGE_BYTES: usize = 16 * 1024 * 1024;
const MAX_FIRMWARE_IMAGE_BYTES: u64 = 8 * 1024 * 1024;
const ESP32S3_IMAGE_CHIP_ID: u8 = 9;

pub struct UpdateRuntime {
    pending_app: Mutex<Option<Update>>,
    pending_firmware: Mutex<Option<PendingFirmware>>,
}

impl Default for UpdateRuntime {
    fn default() -> Self {
        Self {
            pending_app: Mutex::new(None),
            pending_firmware: Mutex::new(None),
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppUpdateStatus {
    configured: bool,
    current_version: String,
    available: bool,
    version: Option<String>,
    notes: Option<String>,
}

#[derive(Clone, Serialize)]
#[serde(tag = "event", content = "data", rename_all = "camelCase")]
pub enum UpdateProgress {
    Started { content_length: Option<u64> },
    Progress { progress: u8 },
    Verifying,
    Finished,
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct FirmwareManifest {
    version: String,
    notes: String,
    published_at: Option<String>,
    chip: String,
    board: String,
    url: String,
    signature: String,
    sha256: String,
    size: u64,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FirmwareUpdateStatus {
    configured: bool,
    available: bool,
    version: Option<String>,
    notes: Option<String>,
    published_at: Option<String>,
    board: Option<String>,
    size: Option<u64>,
    downloaded: bool,
}

#[derive(Clone)]
struct FirmwareBundle {
    bootloader: Vec<u8>,
    partitions: Vec<u8>,
    boot_app0: Vec<u8>,
    application: Vec<u8>,
}

impl FirmwareBundle {
    fn total_size(&self) -> usize {
        self.bootloader.len()
            + self.partitions.len()
            + self.boot_app0.len()
            + self.application.len()
    }
}

#[derive(Clone)]
struct PendingFirmware {
    manifest: FirmwareManifest,
    bundle: Option<FirmwareBundle>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FirmwarePort {
    name: String,
    label: String,
    is_macropad: bool,
}

fn app_update_configuration() -> Option<(&'static str, &'static str)> {
    let endpoint = option_env!("MACROPAD_APP_UPDATE_ENDPOINT")?.trim();
    let public_key = option_env!("MACROPAD_UPDATE_PUBLIC_KEY")?.trim();
    (!endpoint.is_empty() && !public_key.is_empty()).then_some((endpoint, public_key))
}

fn firmware_update_configuration() -> Option<(&'static str, &'static str)> {
    let endpoint = option_env!("MACROPAD_FIRMWARE_MANIFEST_URL")?.trim();
    let public_key = option_env!("MACROPAD_UPDATE_PUBLIC_KEY")?.trim();
    (!endpoint.is_empty() && !public_key.is_empty()).then_some((endpoint, public_key))
}

fn secure_url(value: &str, purpose: &str) -> Result<Url, String> {
    let url = Url::parse(value).map_err(|error| format!("invalid {purpose} URL: {error}"))?;
    if url.scheme() != "https" {
        return Err(format!("{purpose} URL must use HTTPS"));
    }
    Ok(url)
}

#[tauri::command]
pub async fn check_app_update(
    app: AppHandle,
    runtime: State<'_, UpdateRuntime>,
) -> Result<AppUpdateStatus, String> {
    let current_version = app.package_info().version.to_string();
    let Some((endpoint, public_key)) = app_update_configuration() else {
        return Ok(AppUpdateStatus {
            configured: false,
            current_version,
            available: false,
            version: None,
            notes: None,
        });
    };

    let update = app
        .updater_builder()
        .pubkey(public_key)
        .endpoints(vec![secure_url(endpoint, "application update")?])
        .map_err(|error| error.to_string())?
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|error| error.to_string())?
        .check()
        .await
        .map_err(|error| error.to_string())?;

    let status = AppUpdateStatus {
        configured: true,
        current_version,
        available: update.is_some(),
        version: update.as_ref().map(|item| item.version.clone()),
        notes: update.as_ref().and_then(|item| item.body.clone()),
    };
    *runtime
        .pending_app
        .lock()
        .map_err(|_| "application update lock failed")? = update;
    Ok(status)
}

#[tauri::command]
pub async fn install_app_update(
    app: AppHandle,
    runtime: State<'_, UpdateRuntime>,
    on_event: Channel<UpdateProgress>,
) -> Result<(), String> {
    let update = runtime
        .pending_app
        .lock()
        .map_err(|_| "application update lock failed")?
        .take()
        .ok_or_else(|| "there is no checked application update".to_string())?;
    let mut downloaded = 0_u64;
    let mut total = None;
    update
        .download_and_install(
            |chunk_length, content_length| {
                if total.is_none() {
                    total = content_length;
                    let _ = on_event.send(UpdateProgress::Started { content_length });
                }
                downloaded += chunk_length as u64;
                let progress = total
                    .filter(|length| *length > 0)
                    .map(|length| ((downloaded.saturating_mul(100) / length).min(100)) as u8)
                    .unwrap_or(0);
                let _ = on_event.send(UpdateProgress::Progress { progress });
            },
            || {
                let _ = on_event.send(UpdateProgress::Finished);
            },
        )
        .await
        .map_err(|error| error.to_string())?;
    app.restart();
}

#[tauri::command]
pub async fn check_firmware_update(
    runtime: State<'_, UpdateRuntime>,
    device_runtime: State<'_, Arc<DeviceRuntime>>,
) -> Result<FirmwareUpdateStatus, String> {
    let Some((manifest_url, _)) = firmware_update_configuration() else {
        return Ok(FirmwareUpdateStatus {
            configured: false,
            available: false,
            version: None,
            notes: None,
            published_at: None,
            board: None,
            size: None,
            downloaded: false,
        });
    };
    let url = secure_url(manifest_url, "firmware manifest")?;
    let manifest = Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|error| error.to_string())?
        .get(url)
        .send()
        .await
        .map_err(|error| error.to_string())?
        .error_for_status()
        .map_err(|error| error.to_string())?
        .json::<FirmwareManifest>()
        .await
        .map_err(|error| format!("invalid firmware manifest: {error}"))?;
    validate_manifest(&manifest)?;
    let installed_version = device_runtime.firmware_version();
    let available = firmware_update_available(installed_version.as_deref(), &manifest.version)?;
    let status = firmware_status(&manifest, available, false);
    *runtime
        .pending_firmware
        .lock()
        .map_err(|_| "firmware update lock failed")? = available.then_some(PendingFirmware {
        manifest,
        bundle: None,
    });
    Ok(status)
}

fn firmware_status(
    manifest: &FirmwareManifest,
    available: bool,
    downloaded: bool,
) -> FirmwareUpdateStatus {
    FirmwareUpdateStatus {
        configured: true,
        available,
        version: Some(manifest.version.clone()),
        notes: Some(manifest.notes.clone()),
        published_at: manifest.published_at.clone(),
        board: Some(manifest.board.clone()),
        size: Some(manifest.size),
        downloaded,
    }
}

fn firmware_update_available(installed: Option<&str>, release: &str) -> Result<bool, String> {
    let release =
        Version::parse(release).map_err(|error| format!("firmware version is invalid: {error}"))?;
    let Some(installed) = installed else {
        return Ok(true);
    };
    let installed = Version::parse(installed)
        .map_err(|error| format!("device reported invalid firmware version: {error}"))?;
    Ok(release > installed)
}

fn validate_manifest(manifest: &FirmwareManifest) -> Result<(), String> {
    Version::parse(manifest.version.trim())
        .map_err(|error| format!("firmware version is invalid: {error}"))?;
    if !manifest.chip.eq_ignore_ascii_case("esp32s3") {
        return Err(format!(
            "firmware targets {}, expected esp32s3",
            manifest.chip
        ));
    }
    if manifest.board != "esp32-s3-devkitc-1" {
        return Err(format!(
            "firmware targets unsupported board {}",
            manifest.board
        ));
    }
    if manifest.size == 0 || manifest.size > MAX_FIRMWARE_PACKAGE_BYTES as u64 {
        return Err("firmware package size is outside the allowed range".into());
    }
    if manifest.sha256.len() != 64 || !manifest.sha256.bytes().all(|byte| byte.is_ascii_hexdigit())
    {
        return Err("firmware package SHA-256 is invalid".into());
    }
    secure_url(&manifest.url, "firmware package")?;
    Ok(())
}

#[tauri::command]
pub async fn download_firmware_update(
    runtime: State<'_, UpdateRuntime>,
    on_event: Channel<UpdateProgress>,
) -> Result<FirmwareUpdateStatus, String> {
    let (_, public_key) = firmware_update_configuration()
        .ok_or_else(|| "firmware updater is not configured in this build".to_string())?;
    let manifest = runtime
        .pending_firmware
        .lock()
        .map_err(|_| "firmware update lock failed")?
        .as_ref()
        .map(|pending| pending.manifest.clone())
        .ok_or_else(|| "check for firmware updates before downloading".to_string())?;
    let client = Client::builder()
        .timeout(Duration::from_secs(120))
        .build()
        .map_err(|error| error.to_string())?;
    let response = client
        .get(secure_url(&manifest.url, "firmware package")?)
        .send()
        .await
        .map_err(|error| error.to_string())?
        .error_for_status()
        .map_err(|error| error.to_string())?;
    if response
        .content_length()
        .is_some_and(|length| length > MAX_FIRMWARE_PACKAGE_BYTES as u64)
    {
        return Err("firmware package exceeds the maximum allowed size".into());
    }
    let _ = on_event.send(UpdateProgress::Started {
        content_length: response.content_length(),
    });
    let mut bytes =
        Vec::with_capacity(manifest.size.min(MAX_FIRMWARE_PACKAGE_BYTES as u64) as usize);
    let mut stream = response.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|error| error.to_string())?;
        if bytes.len() + chunk.len() > MAX_FIRMWARE_PACKAGE_BYTES {
            return Err("firmware package exceeds the maximum allowed size".into());
        }
        bytes.extend_from_slice(&chunk);
        let progress = ((bytes.len() as u64 * 100 / manifest.size.max(1)).min(100)) as u8;
        let _ = on_event.send(UpdateProgress::Progress { progress });
    }
    if bytes.len() as u64 != manifest.size {
        return Err(format!(
            "firmware package size mismatch: expected {}, received {}",
            manifest.size,
            bytes.len()
        ));
    }
    let _ = on_event.send(UpdateProgress::Verifying);
    verify_firmware_package(&bytes, &manifest, public_key)?;
    let bundle = parse_firmware_bundle(&bytes, &manifest.version)?;
    *runtime
        .pending_firmware
        .lock()
        .map_err(|_| "firmware update lock failed")? = Some(PendingFirmware {
        manifest: manifest.clone(),
        bundle: Some(bundle),
    });
    let _ = on_event.send(UpdateProgress::Finished);
    Ok(firmware_status(&manifest, true, true))
}

fn verify_firmware_package(
    bytes: &[u8],
    manifest: &FirmwareManifest,
    public_key: &str,
) -> Result<(), String> {
    let actual_hash =
        Sha256::digest(bytes)
            .iter()
            .fold(String::with_capacity(64), |mut output, byte| {
                output.push_str(&format!("{byte:02x}"));
                output
            });
    if !actual_hash.eq_ignore_ascii_case(&manifest.sha256) {
        return Err("firmware package SHA-256 does not match the release manifest".into());
    }
    let public_key_text = String::from_utf8(
        BASE64
            .decode(public_key)
            .map_err(|error| error.to_string())?,
    )
    .map_err(|_| "update public key is not valid UTF-8")?;
    let signature_text = String::from_utf8(
        BASE64
            .decode(&manifest.signature)
            .map_err(|error| error.to_string())?,
    )
    .map_err(|_| "firmware signature is not valid UTF-8")?;
    let key = PublicKey::decode(&public_key_text).map_err(|error| error.to_string())?;
    let signature = Signature::decode(&signature_text).map_err(|error| error.to_string())?;
    key.verify(bytes, &signature, true)
        .map_err(|error| format!("firmware signature verification failed: {error}"))
}

fn parse_firmware_bundle(bytes: &[u8], expected_version: &str) -> Result<FirmwareBundle, String> {
    let mut archive = ZipArchive::new(Cursor::new(bytes))
        .map_err(|error| format!("invalid firmware ZIP: {error}"))?;
    let version = read_zip_entry(&mut archive, "version.txt", 64)?;
    let package_version =
        String::from_utf8(version).map_err(|_| "version.txt is not valid UTF-8")?;
    if package_version.trim() != expected_version.trim() {
        return Err("signed firmware package version does not match the release manifest".into());
    }
    let bootloader = read_zip_entry(&mut archive, "bootloader.bin", 0x8000)?;
    let partitions = read_zip_entry(&mut archive, "partitions.bin", 0x6000)?;
    let boot_app0 = read_zip_entry(&mut archive, "boot_app0.bin", 0x2000)?;
    let application = read_zip_entry(
        &mut archive,
        "firmware.bin",
        MAX_FIRMWARE_IMAGE_BYTES - 0x10000,
    )?;
    validate_esp32s3_image("bootloader.bin", &bootloader)?;
    validate_esp32s3_image("firmware.bin", &application)?;
    if !partitions.starts_with(&[0xAA, 0x50]) {
        return Err("partitions.bin is not an ESP32 partition table".into());
    }
    if !boot_app0.starts_with(&[0x01, 0x00, 0x00, 0x00]) {
        return Err("boot_app0.bin is not a supported ESP32 OTA data image".into());
    }
    Ok(FirmwareBundle {
        bootloader,
        partitions,
        boot_app0,
        application,
    })
}

fn read_zip_entry(
    archive: &mut ZipArchive<Cursor<&[u8]>>,
    name: &str,
    maximum_size: u64,
) -> Result<Vec<u8>, String> {
    let mut file = archive
        .by_name(name)
        .map_err(|_| format!("firmware package is missing {name}"))?;
    if file.size() == 0 || file.size() > maximum_size {
        return Err(format!("{name} has an invalid size"));
    }
    let mut output = Vec::with_capacity(file.size() as usize);
    file.read_to_end(&mut output)
        .map_err(|error| format!("could not read {name}: {error}"))?;
    Ok(output)
}

fn validate_esp32s3_image(name: &str, bytes: &[u8]) -> Result<(), String> {
    if bytes.len() < 16 || bytes[0] != 0xE9 || bytes[12] != ESP32S3_IMAGE_CHIP_ID || bytes[13] != 0
    {
        return Err(format!("{name} is not an ESP32-S3 firmware image"));
    }
    Ok(())
}

#[tauri::command]
pub fn list_firmware_ports() -> Result<Vec<FirmwarePort>, String> {
    let ports = serialport::available_ports().map_err(|error| error.to_string())?;
    Ok(ports
        .into_iter()
        .filter_map(|port| {
            let SerialPortType::UsbPort(usb) = port.port_type else {
                return None;
            };
            let is_macropad = usb.vid == MACROPAD_VENDOR_ID && usb.pid == MACROPAD_PRODUCT_ID;
            let product = usb.product.unwrap_or_else(|| "USB serial device".into());
            Some(FirmwarePort {
                label: format!("{} · {}", port.port_name, product),
                name: port.port_name,
                is_macropad,
            })
        })
        .collect())
}

#[tauri::command]
pub async fn flash_firmware_update(
    runtime: State<'_, UpdateRuntime>,
    port_name: String,
    confirmed: bool,
    on_event: Channel<UpdateProgress>,
) -> Result<(), String> {
    if !confirmed {
        return Err("BOOT0 confirmation is required before flashing".into());
    }
    let bundle = runtime
        .pending_firmware
        .lock()
        .map_err(|_| "firmware update lock failed")?
        .as_ref()
        .and_then(|pending| pending.bundle.clone())
        .ok_or_else(|| "download and verify the firmware before flashing".to_string())?;
    tauri::async_runtime::spawn_blocking(move || flash_bundle(&port_name, &bundle, on_event))
        .await
        .map_err(|error| error.to_string())?
}

fn flash_bundle(
    port_name: &str,
    bundle: &FirmwareBundle,
    on_event: Channel<UpdateProgress>,
) -> Result<(), String> {
    let port_info = serialport::available_ports()
        .map_err(|error| error.to_string())?
        .into_iter()
        .find(|port| port.port_name == port_name)
        .ok_or_else(|| format!("serial port {port_name} is no longer available"))?;
    let SerialPortType::UsbPort(usb_info) = port_info.port_type else {
        return Err("selected port is not a USB device".into());
    };
    verify_macropad_usb_identity(&usb_info)?;
    let serial = serialport::new(port_name, 115_200)
        .flow_control(FlowControl::None)
        .open_native()
        .map_err(|error| format!("could not open {port_name}: {error}"))?;
    let connection = Connection::new(
        serial,
        usb_info,
        ResetAfterOperation::HardReset,
        ResetBeforeOperation::DefaultReset,
        460_800,
    );
    let mut flasher = Flasher::connect(
        connection,
        true,
        true,
        false,
        Some(Chip::Esp32s3),
        Some(460_800),
    )
    .map_err(|error| format!("could not connect to ESP32-S3 bootloader: {error}"))?;
    if flasher.chip() != Chip::Esp32s3 {
        return Err("connected chip is not an ESP32-S3".into());
    }
    let segments = [
        Segment {
            addr: 0x0000,
            data: Cow::Borrowed(&bundle.bootloader),
        },
        Segment {
            addr: 0x8000,
            data: Cow::Borrowed(&bundle.partitions),
        },
        Segment {
            addr: 0xE000,
            data: Cow::Borrowed(&bundle.boot_app0),
        },
        Segment {
            addr: 0x10000,
            data: Cow::Borrowed(&bundle.application),
        },
    ];
    let mut progress = FirmwareFlashProgress::new(on_event, bundle.total_size());
    flasher
        .write_bins_to_flash(&segments, &mut progress)
        .map_err(|error| format!("firmware flash failed: {error}"))?;
    Ok(())
}

fn verify_macropad_usb_identity(usb: &UsbPortInfo) -> Result<(), String> {
    if usb.vid != MACROPAD_VENDOR_ID || usb.pid != MACROPAD_PRODUCT_ID {
        return Err(format!(
            "selected device has VID {:04X} / PID {:04X}; expected {:04X} / {:04X}",
            usb.vid, usb.pid, MACROPAD_VENDOR_ID, MACROPAD_PRODUCT_ID
        ));
    }
    Ok(())
}

struct FirmwareFlashProgress {
    on_event: Channel<UpdateProgress>,
    total: usize,
    completed: usize,
    segment_total: usize,
}

impl FirmwareFlashProgress {
    fn new(on_event: Channel<UpdateProgress>, total: usize) -> Self {
        let _ = on_event.send(UpdateProgress::Started {
            content_length: Some(total as u64),
        });
        Self {
            on_event,
            total: total.max(1),
            completed: 0,
            segment_total: 0,
        }
    }
}

impl ProgressCallbacks for FirmwareFlashProgress {
    fn init(&mut self, _address: u32, total: usize) {
        self.segment_total = total;
    }

    fn update(&mut self, current: usize) {
        let progress = (((self.completed + current).min(self.total) * 100) / self.total) as u8;
        let _ = self.on_event.send(UpdateProgress::Progress { progress });
    }

    fn verifying(&mut self) {
        let _ = self.on_event.send(UpdateProgress::Verifying);
    }

    fn finish(&mut self, _skipped: bool) {
        self.completed = (self.completed + self.segment_total).min(self.total);
        if self.completed == self.total {
            let _ = self.on_event.send(UpdateProgress::Finished);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{
        firmware_update_available, secure_url, validate_esp32s3_image,
        verify_macropad_usb_identity, ESP32S3_IMAGE_CHIP_ID,
    };
    use serialport::UsbPortInfo;

    #[test]
    fn update_urls_must_use_https() {
        assert!(secure_url("https://updates.example.com/latest.json", "update").is_ok());
        assert!(secure_url("http://updates.example.com/latest.json", "update").is_err());
    }

    #[test]
    fn validates_esp32s3_image_header() {
        let mut image = [0_u8; 16];
        image[0] = 0xE9;
        image[12] = ESP32S3_IMAGE_CHIP_ID;
        assert!(validate_esp32s3_image("firmware.bin", &image).is_ok());
        image[12] = 0;
        assert!(validate_esp32s3_image("firmware.bin", &image).is_err());
    }

    #[test]
    fn only_accepts_the_macropad_usb_identity() {
        let matching = UsbPortInfo {
            vid: 0x303A,
            pid: 0x1001,
            serial_number: None,
            manufacturer: None,
            product: None,
        };
        let mut other = matching.clone();
        other.pid = 0x0001;
        assert!(verify_macropad_usb_identity(&matching).is_ok());
        assert!(verify_macropad_usb_identity(&other).is_err());
    }

    #[test]
    fn rejects_firmware_replay_and_downgrade() {
        assert_eq!(firmware_update_available(Some("1.2.0"), "1.3.0"), Ok(true));
        assert_eq!(firmware_update_available(Some("1.2.0"), "1.2.0"), Ok(false));
        assert_eq!(firmware_update_available(Some("1.2.0"), "1.1.9"), Ok(false));
        assert_eq!(firmware_update_available(None, "1.0.0"), Ok(true));
    }
}
