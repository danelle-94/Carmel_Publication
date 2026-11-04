//! Carmel Publications admin server.
//!
//! A small password-protected web app that lets an administrator add, edit and delete
//! books. Every change is written to `catalog/books.csv`, uploaded covers go to
//! `catalog/covers/`, and `update_catalog.py` is run so the public site updates at once.
//!
//! The public website never links to or serves this app: it is a separate process that
//! listens on 127.0.0.1 by default, and every page and API call except the login screen
//! requires a valid session cookie.

use std::collections::HashMap;
use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::Mutex;
use std::thread;
use std::time::{Duration, Instant};

use base64::Engine;
use serde_json::{json, Map, Value};
use tiny_http::{Header, Method, Request, Response, Server};

const LOGIN_HTML: &str = include_str!("../ui/login.html");
const DASHBOARD_HTML: &str = include_str!("../ui/dashboard.html");

const COOKIE_NAME: &str = "carmel_admin";
const SESSION_TTL: Duration = Duration::from_secs(8 * 60 * 60);
const MAX_BODY: usize = 24 * 1024 * 1024;
const MAX_IMAGE: usize = 8 * 1024 * 1024;
const MAX_LOGIN_FAILS: u32 = 5;
const LOCKOUT: Duration = Duration::from_secs(60);
const CSRF_HEADER_VALUE: &str = "carmel-admin";

type Resp = Response<std::io::Cursor<Vec<u8>>>;

#[derive(Default)]
struct LoginGuard {
    fails: u32,
    locked_until: Option<Instant>,
}

struct App {
    root: PathBuf,
    password: String,
    secure_cookie: bool,
    loopback_only: bool,
    allowed_host: Option<String>,
    sessions: Mutex<HashMap<String, Instant>>,
    guard: Mutex<LoginGuard>,
    write_lock: Mutex<()>,
}

impl App {
    fn csv_path(&self) -> PathBuf {
        self.root.join("catalog").join("books.csv")
    }
    fn covers_dir(&self) -> PathBuf {
        self.root.join("catalog").join("covers")
    }
}

// ---------------------------------------------------------------- responses

fn resp(status: u16, content_type: &str, body: Vec<u8>) -> Resp {
    let mut r = Response::from_data(body).with_status_code(status);
    let headers = [
        ("Content-Type", content_type),
        ("Cache-Control", "no-store"),
        ("X-Content-Type-Options", "nosniff"),
        ("X-Frame-Options", "DENY"),
        ("Referrer-Policy", "no-referrer"),
        (
            "Content-Security-Policy",
            "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; \
             img-src 'self' data: blob:; connect-src 'self'; form-action 'self'; \
             base-uri 'none'; frame-ancestors 'none'",
        ),
    ];
    for (k, v) in headers {
        r.add_header(Header::from_bytes(k, v).expect("static header"));
    }
    r
}

fn json_resp(status: u16, value: Value) -> Resp {
    resp(status, "application/json; charset=utf-8", value.to_string().into_bytes())
}

fn fail(status: u16, message: &str) -> Resp {
    json_resp(status, json!({ "ok": false, "error": message }))
}

fn html_resp(body: &str) -> Resp {
    resp(200, "text/html; charset=utf-8", body.as_bytes().to_vec())
}

fn redirect(to: &str) -> Resp {
    let mut r = resp(302, "text/plain; charset=utf-8", Vec::new());
    r.add_header(Header::from_bytes("Location", to).expect("location header"));
    r
}

// ---------------------------------------------------------------- request helpers

fn header_value(req: &Request, name: &str) -> Option<String> {
    req.headers()
        .iter()
        .find(|h| h.field.to_string().eq_ignore_ascii_case(name))
        .map(|h| h.value.as_str().to_string())
}

fn ct_eq(a: &[u8], b: &[u8]) -> bool {
    let mut diff = (a.len() != b.len()) as u8;
    for i in 0..a.len().max(b.len()) {
        diff |= a.get(i).copied().unwrap_or(0) ^ b.get(i).copied().unwrap_or(0);
    }
    diff == 0
}

fn random_token() -> String {
    let mut bytes = [0u8; 32];
    getrandom::fill(&mut bytes).expect("system random number generator");
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

fn session_token(req: &Request) -> Option<String> {
    let cookies = header_value(req, "Cookie")?;
    cookies.split(';').find_map(|part| {
        let (k, v) = part.trim().split_once('=')?;
        (k == COOKIE_NAME).then(|| v.to_string())
    })
}

fn is_authed(app: &App, req: &Request) -> bool {
    let Some(token) = session_token(req) else { return false };
    let mut sessions = app.sessions.lock().unwrap();
    let now = Instant::now();
    sessions.retain(|_, expires| *expires > now);
    sessions.contains_key(&token)
}

fn host_allowed(app: &App, req: &Request) -> bool {
    if !app.loopback_only {
        return true;
    }
    let Some(host) = header_value(req, "Host") else { return false };
    let name = host
        .rsplit_once(':')
        .filter(|(h, port)| !port.is_empty() && port.chars().all(|c| c.is_ascii_digit()) && !h.ends_with(':'))
        .map_or(host.as_str(), |(h, _)| h);
    matches!(name, "localhost" | "127.0.0.1" | "[::1]") || app.allowed_host.as_deref() == Some(name)
}

/// State-changing calls must come from our own page: custom header + same-origin check.
fn csrf_ok(req: &Request) -> bool {
    if header_value(req, "X-Requested-With").as_deref() != Some(CSRF_HEADER_VALUE) {
        return false;
    }
    match header_value(req, "Origin") {
        None => true,
        Some(origin) => {
            let origin = origin.trim_start_matches("http://").trim_start_matches("https://");
            header_value(req, "Host").as_deref() == Some(origin)
        }
    }
}

fn read_json(req: &mut Request) -> Result<Value, String> {
    let content_type = header_value(req, "Content-Type").unwrap_or_default();
    if !content_type.starts_with("application/json") {
        return Err("Expected a JSON request.".into());
    }
    if req.body_length().is_some_and(|len| len > MAX_BODY) {
        return Err("The upload is too large (limit 24 MB).".into());
    }
    let mut buf = Vec::new();
    req.as_reader()
        .take(MAX_BODY as u64 + 1)
        .read_to_end(&mut buf)
        .map_err(|e| format!("Could not read the request: {e}"))?;
    if buf.len() > MAX_BODY {
        return Err("The upload is too large (limit 24 MB).".into());
    }
    serde_json::from_slice(&buf).map_err(|_| "The request body is not valid JSON.".to_string())
}

// ---------------------------------------------------------------- books.csv

struct Table {
    headers: Vec<String>,
    rows: Vec<Vec<String>>,
}

impl Table {
    fn col(&self, name: &str) -> Option<usize> {
        self.headers.iter().position(|h| h == name)
    }
    fn find(&self, id: &str) -> Option<usize> {
        let c = self.col("id")?;
        self.rows.iter().position(|r| r[c] == id)
    }
}

fn slugify(text: &str) -> String {
    let mut out = String::new();
    let mut pending_dash = false;
    for c in text.chars().flat_map(char::to_lowercase) {
        if c.is_ascii_alphanumeric() {
            if pending_dash && !out.is_empty() {
                out.push('-');
            }
            pending_dash = false;
            out.push(c);
        } else {
            pending_dash = true;
        }
    }
    out
}

fn read_table(path: &Path) -> Result<Table, String> {
    let bytes = fs::read(path).map_err(|e| format!("Cannot read books.csv: {e}"))?;
    let body = bytes.strip_prefix(&[0xEF, 0xBB, 0xBF][..]).unwrap_or(&bytes);
    let mut reader = csv::ReaderBuilder::new().flexible(true).from_reader(body);
    let headers: Vec<String> = reader
        .headers()
        .map_err(|e| format!("books.csv has no header row: {e}"))?
        .iter()
        .map(|h| h.trim().to_lowercase())
        .collect();
    let width = headers.len();
    let mut rows = Vec::new();
    for record in reader.records() {
        let record = record.map_err(|e| format!("books.csv could not be read: {e}"))?;
        let mut row: Vec<String> = record.iter().map(|v| v.trim().to_string()).collect();
        if row.iter().all(String::is_empty) {
            continue;
        }
        row.resize(width, String::new());
        rows.push(row);
    }
    let mut table = Table { headers, rows };
    if let (Some(id), Some(title)) = (table.col("id"), table.col("title")) {
        for row in &mut table.rows {
            if row[id].is_empty() {
                row[id] = slugify(&row[title]);
            }
        }
    }
    Ok(table)
}

fn serialize_table(table: &Table) -> Result<Vec<u8>, String> {
    let mut writer = csv::WriterBuilder::new().from_writer(Vec::new());
    writer.write_record(&table.headers).map_err(|e| e.to_string())?;
    for row in &table.rows {
        writer.write_record(row).map_err(|e| e.to_string())?;
    }
    let body = writer.into_inner().map_err(|e| e.to_string())?;
    let mut out = vec![0xEF, 0xBB, 0xBF]; // BOM keeps Excel happy with UTF-8
    out.extend(body);
    Ok(out)
}

fn write_atomic(path: &Path, bytes: &[u8]) -> Result<(), String> {
    let tmp = path.with_extension("csv.tmp");
    fs::write(&tmp, bytes).map_err(|e| format!("Cannot write books.csv: {e}"))?;
    fs::rename(&tmp, path).map_err(|e| format!("Cannot replace books.csv: {e}"))
}

fn catalog_meta(root: &Path) -> Value {
    let names = |value: &Value, key: &str| -> Vec<Value> {
        value[key]
            .as_array()
            .map(|a| a.iter().filter_map(|c| c.get("name").cloned()).collect())
            .unwrap_or_default()
    };
    let parsed = fs::read_to_string(root.join("js").join("data.js"))
        .ok()
        .and_then(|raw| {
            let (start, end) = (raw.find('{')?, raw.rfind('}')?);
            serde_json::from_str::<Value>(&raw[start..=end]).ok()
        })
        .unwrap_or(Value::Null);
    json!({ "categories": names(&parsed, "categories"), "collections": names(&parsed, "collections") })
}

fn has_front_cover(root: &Path, id: &str) -> bool {
    root.join("assets").join("covers").join("front").join(format!("{id}.jpg")).is_file()
}

// ---------------------------------------------------------------- validation

fn clean_text(s: &str) -> String {
    s.chars()
        .map(|c| if c.is_control() { ' ' } else { c })
        .collect::<String>()
        .trim()
        .to_string()
}

fn valid_id(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= 60
        && !id.starts_with('-')
        && !id.ends_with('-')
        && id.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
}

fn grade_number_ok(s: &str) -> bool {
    !s.is_empty() && s.len() <= 2 && s.chars().all(|c| c.is_ascii_digit()) && matches!(s.parse::<u8>(), Ok(1..=12))
}

fn valid_grade(grade: &str) -> bool {
    !grade.is_empty()
        && grade.split('/').all(|part| {
            let part = part.trim();
            if matches!(part, "Nursery" | "LKG" | "UKG" | "Pre-Primary") {
                return true;
            }
            let Some(rest) = part.strip_prefix("Grade") else { return false };
            let nums: Vec<&str> = rest.trim().split(['-', '\u{2013}']).map(str::trim).collect();
            (1..=2).contains(&nums.len()) && nums.iter().all(|n| grade_number_ok(n))
        })
}

fn highlights_text(value: &Value) -> Result<String, String> {
    let items: Vec<String> = match value {
        Value::Array(list) => list.iter().filter_map(Value::as_str).map(clean_text).collect(),
        Value::String(s) => s.split('|').map(clean_text).collect(),
        _ => Vec::new(),
    };
    let items: Vec<String> = items
        .into_iter()
        .map(|h| h.replace('|', "/"))
        .filter(|h| !h.is_empty())
        .collect();
    if items.len() > 12 || items.iter().any(|h| h.chars().count() > 200) {
        return Err("Highlights: use at most 12 points of up to 200 characters each.".into());
    }
    Ok(items.join(" | "))
}

/// Validate and normalise the submitted fields. Only keys present in the request are returned.
fn normalize(book: &Map<String, Value>) -> Result<HashMap<String, String>, String> {
    let mut out = HashMap::new();
    for (key, value) in book {
        let key = key.as_str();
        if matches!(key, "id" | "front_cover" | "full_cover")
            || key.is_empty()
            || !key.chars().all(|c| c.is_ascii_lowercase() || c == '_')
        {
            continue;
        }
        let mut text = if key == "highlights" {
            highlights_text(value)?
        } else {
            clean_text(value.as_str().unwrap_or(""))
        };
        let limit = if key == "description" || key == "highlights" { 3000 } else { 200 };
        if text.chars().count() > limit {
            return Err(format!("'{key}' is too long (limit {limit} characters)."));
        }
        match key {
            "price" => {
                let stripped: String = text.chars().filter(|c| !matches!(c, '\u{20B9}' | ',' | ' ')).collect();
                if !stripped.is_empty() && !stripped.chars().all(|c| c.is_ascii_digit()) {
                    return Err("Price must be a whole number such as 190.".into());
                }
                text = stripped;
            }
            "pages" if !text.is_empty() && !text.chars().all(|c| c.is_ascii_digit()) => {
                return Err("Pages must be a number.".into());
            }
            "year" if !text.is_empty() && !(text.len() == 4 && text.chars().all(|c| c.is_ascii_digit())) => {
                return Err("Year must have 4 digits, e.g. 2025.".into());
            }
            "rating" if !text.is_empty() && !text.parse::<f32>().is_ok_and(|r| (0.0..=5.0).contains(&r)) => {
                return Err("Rating must be a number between 0 and 5.".into());
            }
            "featured" => {
                text = if matches!(text.to_lowercase().as_str(), "yes" | "y" | "true" | "1") { "yes".into() } else { String::new() };
            }
            "orientation" => match text.to_lowercase().as_str() {
                "" | "portrait" => text = String::new(),
                "landscape" => text = "landscape".into(),
                _ => return Err("Orientation must be portrait or landscape.".into()),
            },
            "grade" if !valid_grade(&text) => {
                return Err("Choose at least one valid grade (Nursery, LKG, UKG, Grade 1 - Grade 12).".into());
            }
            _ => {}
        }
        out.insert(key.to_string(), text);
    }
    Ok(out)
}

struct Image {
    bytes: Vec<u8>,
    ext: &'static str,
}

fn decode_image(value: Option<&Value>, label: &str) -> Result<Option<Image>, String> {
    let Some(data) = value.and_then(|v| v.get("data")).and_then(Value::as_str) else {
        return Ok(None);
    };
    let data = data.split_once(";base64,").map_or(data, |(_, rest)| rest);
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(data.trim())
        .map_err(|_| format!("The {label} image could not be read."))?;
    if bytes.len() > MAX_IMAGE {
        return Err(format!("The {label} image is larger than 8 MB."));
    }
    let ext = if bytes.starts_with(&[0x89, b'P', b'N', b'G']) {
        "png"
    } else if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
        "jpg"
    } else if bytes.len() > 12 && &bytes[0..4] == b"RIFF" && &bytes[8..12] == b"WEBP" {
        "webp"
    } else {
        return Err(format!("The {label} image must be a PNG, JPG or WEBP file."));
    };
    Ok(Some(Image { bytes, ext }))
}

// ---------------------------------------------------------------- updater

fn run_updater(root: &Path) -> (bool, String) {
    for python in ["python3", "python"] {
        if let Ok(output) = Command::new(python).arg("update_catalog.py").current_dir(root).output() {
            let mut text = String::from_utf8_lossy(&output.stdout).to_string();
            text.push_str(&String::from_utf8_lossy(&output.stderr));
            return (output.status.success(), text.trim().to_string());
        }
    }
    (false, "Python 3 was not found, so update_catalog.py could not run.".into())
}

// ---------------------------------------------------------------- book operations

enum Mode<'a> {
    Create,
    Edit(&'a str),
}

struct CoverWrite {
    path: PathBuf,
    previous: Option<Vec<u8>>,
}

fn rollback(csv_path: &Path, original: &[u8], writes: &[CoverWrite]) {
    let _ = fs::write(csv_path, original);
    for w in writes {
        match &w.previous {
            Some(bytes) => {
                let _ = fs::write(&w.path, bytes);
            }
            None => {
                let _ = fs::remove_file(&w.path);
            }
        }
    }
}

fn save_book(app: &App, body: &Value, mode: Mode) -> Result<Value, (u16, String)> {
    let book = body
        .get("book")
        .and_then(Value::as_object)
        .ok_or((400, "Missing book details.".to_string()))?;
    let fields = normalize(book).map_err(|e| (400, e))?;
    let front = decode_image(body.get("front_cover"), "front cover").map_err(|e| (400, e))?;
    let full = decode_image(body.get("full_cover"), "full cover").map_err(|e| (400, e))?;

    let _guard = app.write_lock.lock().unwrap();
    let csv_path = app.csv_path();
    let original = fs::read(&csv_path).map_err(|e| (500, format!("Cannot read books.csv: {e}")))?;
    let mut table = read_table(&csv_path).map_err(|e| (500, e))?;
    let id_col = table.col("id").ok_or((500, "books.csv has no 'id' column.".to_string()))?;

    let (id, index) = match mode {
        Mode::Create => {
            let raw_id = clean_text(book.get("id").and_then(Value::as_str).unwrap_or(""));
            let id = if raw_id.is_empty() {
                slugify(fields.get("title").map(String::as_str).unwrap_or(""))
            } else {
                raw_id
            };
            if !valid_id(&id) {
                return Err((400, "The book ID may only contain lowercase letters, numbers and hyphens.".into()));
            }
            if table.find(&id).is_some() {
                return Err((409, format!("A book with the ID '{id}' already exists. Choose a different ID.")));
            }
            if front.is_none() {
                return Err((400, "Please upload a front cover image.".into()));
            }
            table.rows.push(vec![String::new(); table.headers.len()]);
            let last = table.rows.len() - 1;
            table.rows[last][id_col] = id.clone();
            (id, last)
        }
        Mode::Edit(id) => {
            let index = table.find(id).ok_or((404, "That book no longer exists.".to_string()))?;
            (id.to_string(), index)
        }
    };

    for (key, value) in &fields {
        if let Some(col) = table.col(key) {
            table.rows[index][col] = value.clone();
        }
    }
    for required in ["title", "category", "grade", "price"] {
        let filled = table.col(required).is_some_and(|c| !table.rows[index][c].is_empty());
        if !filled {
            return Err((400, format!("Please fill in the {required}.")));
        }
    }

    let mut writes: Vec<CoverWrite> = Vec::new();
    let mut stale: Vec<PathBuf> = Vec::new();
    let covers_dir = app.covers_dir();
    fs::create_dir_all(&covers_dir).map_err(|e| (500, format!("Cannot create the covers folder: {e}")))?;
    for (kind, column, image) in [("front", "front_cover", &front), ("full", "full_cover", &full)] {
        let Some(image) = image else { continue };
        let name = format!("{id}-{kind}.{}", image.ext);
        let path = covers_dir.join(&name);
        let previous = fs::read(&path).ok();
        if let Err(e) = fs::write(&path, &image.bytes) {
            rollback(&csv_path, &original, &writes);
            return Err((500, format!("Cannot save the {kind} cover: {e}")));
        }
        writes.push(CoverWrite { path, previous });
        if let Some(col) = table.col(column) {
            table.rows[index][col] = name;
        }
        for ext in ["png", "jpg", "webp"] {
            if ext != image.ext {
                stale.push(covers_dir.join(format!("{id}-{kind}.{ext}")));
            }
        }
    }

    let bytes = serialize_table(&table).map_err(|e| (500, e))?;
    let _ = fs::copy(&csv_path, csv_path.with_extension("csv.bak"));
    if let Err(e) = write_atomic(&csv_path, &bytes) {
        rollback(&csv_path, &original, &writes);
        return Err((500, e));
    }

    let (ok, output) = run_updater(&app.root);
    if !ok {
        rollback(&csv_path, &original, &writes);
        return Err((422, format!("The catalog was not changed.\n\n{output}")));
    }
    for path in stale {
        let _ = fs::remove_file(path);
    }
    Ok(json!({ "ok": true, "id": id, "message": output }))
}

fn delete_book(app: &App, id: &str) -> Result<Value, (u16, String)> {
    let _guard = app.write_lock.lock().unwrap();
    let csv_path = app.csv_path();
    let original = fs::read(&csv_path).map_err(|e| (500, format!("Cannot read books.csv: {e}")))?;
    let mut table = read_table(&csv_path).map_err(|e| (500, e))?;
    let index = table.find(id).ok_or((404, "That book no longer exists.".to_string()))?;
    table.rows.remove(index);
    let bytes = serialize_table(&table).map_err(|e| (500, e))?;
    let _ = fs::copy(&csv_path, csv_path.with_extension("csv.bak"));
    write_atomic(&csv_path, &bytes).map_err(|e| (500, e))?;
    let (ok, output) = run_updater(&app.root);
    if !ok {
        rollback(&csv_path, &original, &[]);
        return Err((422, format!("The catalog was not changed.\n\n{output}")));
    }
    Ok(json!({ "ok": true, "message": output }))
}

fn list_books(app: &App) -> Resp {
    match read_table(&app.csv_path()) {
        Ok(table) => {
            let books: Vec<Value> = table
                .rows
                .iter()
                .map(|row| {
                    let mut obj = Map::new();
                    for (h, v) in table.headers.iter().zip(row) {
                        obj.insert(h.clone(), Value::String(v.clone()));
                    }
                    let id = table.col("id").map(|c| row[c].as_str()).unwrap_or("");
                    obj.insert("_has_cover".into(), Value::Bool(has_front_cover(&app.root, id)));
                    Value::Object(obj)
                })
                .collect();
            json_resp(200, json!({ "ok": true, "columns": table.headers, "books": books, "meta": catalog_meta(&app.root) }))
        }
        Err(e) => fail(500, &e),
    }
}

fn result_resp(result: Result<Value, (u16, String)>) -> Resp {
    match result {
        Ok(value) => json_resp(200, value),
        Err((status, message)) => fail(status, &message),
    }
}

// ---------------------------------------------------------------- login

fn login(app: &App, req: &mut Request) -> Resp {
    {
        let guard = app.guard.lock().unwrap();
        if let Some(until) = guard.locked_until {
            let now = Instant::now();
            if until > now {
                let secs = (until - now).as_secs() + 1;
                return fail(429, &format!("Too many wrong attempts. Try again in {secs} seconds."));
            }
        }
    }
    let body = match read_json(req) {
        Ok(v) => v,
        Err(e) => return fail(400, &e),
    };
    let supplied = body.get("password").and_then(Value::as_str).unwrap_or("");
    if ct_eq(supplied.as_bytes(), app.password.as_bytes()) {
        *app.guard.lock().unwrap() = LoginGuard::default();
        let token = random_token();
        app.sessions.lock().unwrap().insert(token.clone(), Instant::now() + SESSION_TTL);
        let mut cookie = format!(
            "{COOKIE_NAME}={token}; HttpOnly; SameSite=Strict; Path=/; Max-Age={}",
            SESSION_TTL.as_secs()
        );
        if app.secure_cookie {
            cookie.push_str("; Secure");
        }
        let mut r = json_resp(200, json!({ "ok": true }));
        r.add_header(Header::from_bytes("Set-Cookie", cookie).expect("cookie header"));
        return r;
    }
    thread::sleep(Duration::from_millis(600));
    let mut guard = app.guard.lock().unwrap();
    guard.fails += 1;
    if guard.fails >= MAX_LOGIN_FAILS {
        guard.fails = 0;
        guard.locked_until = Some(Instant::now() + LOCKOUT);
    }
    fail(401, "Incorrect password.")
}

fn logout(app: &App, req: &Request) -> Resp {
    if let Some(token) = session_token(req) {
        app.sessions.lock().unwrap().remove(&token);
    }
    let mut r = json_resp(200, json!({ "ok": true }));
    let expired = format!("{COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0");
    r.add_header(Header::from_bytes("Set-Cookie", expired).expect("cookie header"));
    r
}

// ---------------------------------------------------------------- routing

fn route(app: &App, req: &mut Request) -> Resp {
    if !host_allowed(app, req) {
        return fail(403, "Unexpected host name.");
    }
    let method = req.method().clone();
    let url = req.url().to_string();
    let path = url.split('?').next().unwrap_or("/").trim_end_matches('/').to_string();
    let path = if path.is_empty() { "/".to_string() } else { path };

    if method != Method::Get && !csrf_ok(req) {
        return fail(403, "Request blocked (missing security header).");
    }

    match (&method, path.as_str()) {
        (Method::Get, "/") => redirect("/admin"),
        (Method::Get, "/admin") => {
            if is_authed(app, req) { html_resp(DASHBOARD_HTML) } else { html_resp(LOGIN_HTML) }
        }
        (Method::Post, "/api/login") => login(app, req),
        (Method::Post, "/api/logout") => logout(app, req),
        _ if !path.starts_with("/api/") && !path.starts_with("/cover/") => fail(404, "Not found."),
        _ if !is_authed(app, req) => fail(401, "Please sign in."),
        (Method::Get, "/api/books") => list_books(app),
        (Method::Post, "/api/books") => match read_json(req) {
            Ok(body) => result_resp(save_book(app, &body, Mode::Create)),
            Err(e) => fail(400, &e),
        },
        (Method::Put, p) if p.starts_with("/api/books/") => {
            let id = p["/api/books/".len()..].to_string();
            if !valid_id(&id) {
                return fail(400, "Invalid book ID.");
            }
            match read_json(req) {
                Ok(body) => result_resp(save_book(app, &body, Mode::Edit(&id))),
                Err(e) => fail(400, &e),
            }
        }
        (Method::Delete, p) if p.starts_with("/api/books/") => {
            let id = &p["/api/books/".len()..];
            if !valid_id(id) {
                return fail(400, "Invalid book ID.");
            }
            result_resp(delete_book(app, id))
        }
        (Method::Get, p) if p.starts_with("/cover/") => {
            let id = &p["/cover/".len()..];
            if !valid_id(id) {
                return fail(400, "Invalid book ID.");
            }
            let file = app.root.join("assets").join("covers").join("front").join(format!("{id}.jpg"));
            match fs::read(file) {
                Ok(bytes) => resp(200, "image/jpeg", bytes),
                Err(_) => fail(404, "No cover."),
            }
        }
        _ => fail(404, "Not found."),
    }
}

// ---------------------------------------------------------------- startup

fn find_root() -> Option<PathBuf> {
    if let Ok(dir) = std::env::var("CATALOG_ROOT") {
        let dir = PathBuf::from(dir);
        return dir.join("catalog").join("books.csv").is_file().then_some(dir);
    }
    let mut dir = std::env::current_dir().ok()?;
    loop {
        if dir.join("catalog").join("books.csv").is_file() {
            return Some(dir);
        }
        if !dir.pop() {
            return None;
        }
    }
}

fn load_password(root: &Path) -> Option<String> {
    let from_env = std::env::var("ADMIN_PASSWORD").ok();
    let from_file = || fs::read_to_string(root.join("admin").join(".admin_password")).ok();
    let password = from_env.or_else(from_file)?.trim().to_string();
    (!password.is_empty()).then_some(password)
}

fn main() {
    let Some(root) = find_root() else {
        eprintln!("Could not find catalog/books.csv. Run this from the project folder or set CATALOG_ROOT.");
        std::process::exit(1);
    };
    let Some(password) = load_password(&root) else {
        eprintln!(
            "No admin password set. Put it in admin/.admin_password (one line) or set ADMIN_PASSWORD."
        );
        std::process::exit(1);
    };

    let bind = std::env::var("ADMIN_BIND").unwrap_or_else(|_| "127.0.0.1:8080".to_string());
    let loopback_only = bind.starts_with("127.") || bind.starts_with("localhost") || bind.starts_with("[::1]");
    let app = App {
        root,
        password,
        secure_cookie: std::env::var("ADMIN_SECURE_COOKIE").is_ok_and(|v| v == "1"),
        loopback_only,
        allowed_host: std::env::var("ADMIN_ALLOWED_HOST").ok(),
        sessions: Mutex::new(HashMap::new()),
        guard: Mutex::new(LoginGuard::default()),
        write_lock: Mutex::new(()),
    };

    let server = match Server::http(&bind) {
        Ok(s) => s,
        Err(e) => {
            eprintln!("Could not start on {bind}: {e}\nTry another port, e.g. ADMIN_BIND=127.0.0.1:8090");
            std::process::exit(1);
        }
    };
    println!("Carmel admin running at http://{bind}/admin  (Ctrl+C to stop)");

    for mut request in server.incoming_requests() {
        let response = route(&app, &mut request);
        let _ = request.respond(response);
    }
}
