use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
struct RequestSettings {
    follow_redirects: bool,
    verify_ssl: bool,
}

#[derive(Debug, Deserialize)]
struct KeyValueItem {
    key: String,
    value: String,
    enabled: bool,
}

#[derive(Debug, Deserialize)]
struct HttpRequest {
    method: String,
    url: String,
    headers: Vec<(String, String)>,
    body_type: String,
    body: Option<String>,
    form_data: Vec<KeyValueItem>,
    settings: RequestSettings,
}

#[derive(Debug, Serialize)]
struct HttpResponse {
    status: u16,
    status_text: String,
    headers: Vec<(String, String)>,
    body: String,
}

#[tauri::command]
async fn send_http(request: HttpRequest) -> Result<HttpResponse, String> {
    let method = reqwest::Method::from_bytes(request.method.as_bytes())
        .map_err(|e| format!("invalid method: {e}"))?;

    let mut builder = reqwest::Client::builder();
    if !request.settings.follow_redirects {
        builder = builder.redirect(reqwest::redirect::Policy::limited(0));
    }
    if !request.settings.verify_ssl {
        builder = builder
            .danger_accept_invalid_certs(true)
            .danger_accept_invalid_hostnames(true);
    }
    let client = builder.build().map_err(|e| format!("client build failed: {e}"))?;

    let mut req = client.request(method, request.url);
    for (key, value) in request.headers {
        let name = match reqwest::header::HeaderName::from_bytes(key.as_bytes()) {
            Ok(name) => name,
            Err(_) => continue,
        };
        let value = match reqwest::header::HeaderValue::from_str(&value) {
            Ok(value) => value,
            Err(_) => continue,
        };
        req = req.header(name, value);
    }

    match request.body_type.as_str() {
        "form-data" => {
            let mut form = reqwest::multipart::Form::new();
            for item in request.form_data {
                if item.enabled && !item.key.trim().is_empty() {
                    form = form.text(item.key, item.value);
                }
            }
            req = req.multipart(form);
        }
        "raw" | "x-www-form-urlencoded" => {
            if let Some(body) = request.body {
                req = req.body(body);
            }
        }
        _ => {}
    }

    let response = req.send().await.map_err(|e| format!("request failed: {e}"))?;
    let status = response.status();
    let status_text = status.canonical_reason().unwrap_or("").to_string();
    let headers_map = response.headers().clone();
    let body = response
        .text()
        .await
        .map_err(|e| format!("read body failed: {e}"))?;

    let mut headers = Vec::new();
    for name in headers_map.keys() {
        for value in headers_map.get_all(name).iter() {
            if let Ok(value_str) = value.to_str() {
                headers.push((name.to_string(), value_str.to_string()));
            }
        }
    }

    Ok(HttpResponse {
        status: status.as_u16(),
        status_text,
        headers,
        body,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![send_http])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
