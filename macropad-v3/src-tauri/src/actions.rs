use enigo::{Direction, Enigo, Key, Keyboard, Settings};
use serde::Deserialize;

#[derive(Deserialize)]
#[serde(tag = "type")]
pub enum ActionRequest {
    #[serde(rename = "none")]
    None,
    #[serde(rename = "audio.volume-up")]
    VolumeUp,
    #[serde(rename = "audio.volume-down")]
    VolumeDown,
    #[serde(rename = "audio.output-mute")]
    OutputMute,
    #[serde(rename = "audio.mic-mute")]
    MicrophoneMute,
    #[serde(rename = "media.play-pause")]
    MediaPlayPause,
    #[serde(rename = "media.next")]
    MediaNext,
    #[serde(rename = "media.previous")]
    MediaPrevious,
    #[serde(rename = "keyboard.shortcut")]
    KeyboardShortcut { keys: String },
    #[serde(rename = "text.type")]
    TypeText { text: String },
    #[serde(rename = "system.open")]
    Open { target: String },
    #[serde(rename = "system.launch")]
    Launch { target: String },
}

pub fn execute_action(action: ActionRequest) -> Result<(), String> {
    match action {
        ActionRequest::None => Ok(()),
        ActionRequest::VolumeUp => click_key(Key::VolumeUp),
        ActionRequest::VolumeDown => click_key(Key::VolumeDown),
        ActionRequest::OutputMute => click_key(Key::VolumeMute),
        ActionRequest::MicrophoneMute => toggle_microphone_mute(),
        ActionRequest::MediaPlayPause => click_key(Key::MediaPlayPause),
        ActionRequest::MediaNext => click_key(Key::MediaNextTrack),
        ActionRequest::MediaPrevious => click_key(Key::MediaPrevTrack),
        ActionRequest::KeyboardShortcut { keys } => send_shortcut(&keys),
        ActionRequest::TypeText { text } => enigo()?.text(&text).map_err(display_error),
        ActionRequest::Open { target } => open_target(&target),
        ActionRequest::Launch { target } => launch_application(&target),
    }
}

fn enigo() -> Result<Enigo, String> {
    Enigo::new(&Settings::default()).map_err(display_error)
}

fn click_key(key: Key) -> Result<(), String> {
    enigo()?.key(key, Direction::Click).map_err(display_error)
}

fn send_shortcut(shortcut: &str) -> Result<(), String> {
    let keys = shortcut
        .split('+')
        .map(str::trim)
        .filter(|part| !part.is_empty())
        .map(parse_key)
        .collect::<Result<Vec<_>, _>>()?;
    if keys.is_empty() {
        return Err("shortcut must contain at least one key".into());
    }

    let mut input = enigo()?;
    for key in keys.iter().take(keys.len() - 1) {
        input
            .key(key.clone(), Direction::Press)
            .map_err(display_error)?;
    }
    input
        .key(keys[keys.len() - 1].clone(), Direction::Click)
        .map_err(display_error)?;
    for key in keys.iter().take(keys.len() - 1).rev() {
        input
            .key(key.clone(), Direction::Release)
            .map_err(display_error)?;
    }
    Ok(())
}

fn parse_key(value: &str) -> Result<Key, String> {
    match value.to_ascii_lowercase().as_str() {
        "ctrl" | "control" => Ok(Key::Control),
        "shift" => Ok(Key::Shift),
        "alt" => Ok(Key::Alt),
        "meta" | "win" | "windows" | "cmd" | "command" => Ok(Key::Meta),
        "enter" | "return" => Ok(Key::Return),
        "space" => Ok(Key::Space),
        "tab" => Ok(Key::Tab),
        "escape" | "esc" => Ok(Key::Escape),
        "up" => Ok(Key::UpArrow),
        "down" => Ok(Key::DownArrow),
        "left" => Ok(Key::LeftArrow),
        "right" => Ok(Key::RightArrow),
        _ => {
            let mut characters = value.chars();
            match (characters.next(), characters.next()) {
                (Some(character), None) => Ok(Key::Unicode(character)),
                _ => Err(format!("unsupported shortcut key: {value}")),
            }
        }
    }
}

fn open_target(target: &str) -> Result<(), String> {
    if target.trim().is_empty() {
        return Err("open target cannot be empty".into());
    }
    open::that(target).map_err(display_error)
}

fn launch_application(target: &str) -> Result<(), String> {
    let target = normalize_application_target(target);
    if target.is_empty() {
        return Err("application path cannot be empty".into());
    }
    std::process::Command::new(target)
        .spawn()
        .map(|_| ())
        .map_err(display_error)
}

fn normalize_application_target(target: &str) -> &str {
    let target = target.trim();
    if target.len() >= 2 && target.starts_with('"') && target.ends_with('"') {
        target[1..target.len() - 1].trim()
    } else {
        target
    }
}

fn display_error(error: impl std::fmt::Display) -> String {
    error.to_string()
}

#[cfg(windows)]
fn toggle_microphone_mute() -> Result<(), String> {
    use windows::Win32::{
        Media::Audio::{
            eCapture, eConsole, Endpoints::IAudioEndpointVolume, IMMDeviceEnumerator,
            MMDeviceEnumerator,
        },
        System::Com::{CoCreateInstance, CoInitializeEx, CLSCTX_ALL, COINIT_MULTITHREADED},
    };

    unsafe {
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
        let enumerator: IMMDeviceEnumerator =
            CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL).map_err(display_error)?;
        let device = enumerator
            .GetDefaultAudioEndpoint(eCapture, eConsole)
            .map_err(display_error)?;
        let endpoint: IAudioEndpointVolume =
            device.Activate(CLSCTX_ALL, None).map_err(display_error)?;
        let is_muted = endpoint.GetMute().map_err(display_error)?.as_bool();
        endpoint
            .SetMute(!is_muted, std::ptr::null())
            .map_err(display_error)
    }
}

#[cfg(not(windows))]
fn toggle_microphone_mute() -> Result<(), String> {
    Err("microphone mute is not implemented on this operating system yet".into())
}

#[cfg(test)]
mod tests {
    use super::{normalize_application_target, parse_key};
    use enigo::Key;

    #[test]
    fn parses_named_and_character_shortcut_keys() {
        assert_eq!(parse_key("Ctrl"), Ok(Key::Control));
        assert_eq!(parse_key("M"), Ok(Key::Unicode('M')));
    }

    #[test]
    fn rejects_unsupported_multi_character_keys() {
        assert!(parse_key("SomethingElse").is_err());
    }

    #[test]
    fn normalizes_pasted_application_paths() {
        assert_eq!(
            normalize_application_target("  C:\\Tools\\app.exe  "),
            "C:\\Tools\\app.exe"
        );
        assert_eq!(
            normalize_application_target("\"C:\\Program Files\\App\\app.exe\""),
            "C:\\Program Files\\App\\app.exe"
        );
    }
}
