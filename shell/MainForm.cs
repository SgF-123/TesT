using System.Drawing;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace TesT.Shell;

public sealed class MainForm : Form
{
    private const int WmNcHitTest = 0x0084;
    private const int HtClient = 1;
    private const int HtLeft = 10;
    private const int HtRight = 11;
    private const int HtTop = 12;
    private const int HtTopLeft = 13;
    private const int HtTopRight = 14;
    private const int HtBottom = 15;
    private const int HtBottomLeft = 16;
    private const int HtBottomRight = 17;

    private readonly WebView2 _webView = new();
    private readonly List<string> _pending = new();
    private PiBridge? _pi;
    private Process? _piLogin;
    private bool _rendererReady;
    private bool _coreReady;
    private bool _dragging;
    private Point _dragLast;

    public MainForm()
    {
        Log("constructor:start");
        Text = "TesT";
        FormBorderStyle = FormBorderStyle.None;
        StartPosition = FormStartPosition.CenterScreen;
        MinimumSize = new Size(1100, 700);
        Size = new Size(1440, 900);
        BackColor = Color.FromArgb(238, 238, 235);
        Padding = new Padding(6);
        DoubleBuffered = true;

        _webView.Dock = DockStyle.Fill;
        _webView.DefaultBackgroundColor = Color.FromArgb(238, 238, 235);
        Controls.Add(_webView);

        Load += async (_, _) =>
        {
            try
            {
                await InitializeAsync();
            }
            catch (Exception ex)
            {
                Log("initialize:error " + ex);
                MessageBox.Show(this, ex.Message, "TesT", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        };
        FormClosing += (_, _) => _pi?.Dispose();
        Log("constructor:end");
    }

    private async Task InitializeAsync()
    {
        Log("initialize:start");
        ApplyRoundedCorners();
        MaximizedBounds = Screen.FromControl(this).WorkingArea;

        if (!Directory.Exists(Paths.DistDir))
        {
            MessageBox.Show(
                this,
                $"找不到前端构建目录：{Paths.DistDir}\n请先在 tesT 目录执行 npm run build。",
                "TesT",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
            Close();
            return;
        }

        // This Windows session terminates the WebView2 browser process without
        // --no-sandbox. Keep the flags local to the desktop shell.
        var options = new CoreWebView2EnvironmentOptions(
            "--no-sandbox --disable-gpu --disable-features=msWebOOUI,msPdfOOUI");
        var environment = await CoreWebView2Environment.CreateAsync(
            null,
            Path.Combine(Paths.DataDir, "WebView2"),
            options);
        Log("environment:ready");
        await _webView.EnsureCoreWebView2Async(environment);
        Log("webview:ready");
        _coreReady = true;

        var core = _webView.CoreWebView2;
        Log("core:ready");
        core.Settings.AreDevToolsEnabled = true;
        core.Settings.AreDefaultContextMenusEnabled = false;
        core.Settings.IsStatusBarEnabled = false;
        Log("settings:done");
        core.SetVirtualHostNameToFolderMapping(
            "test.local",
            Paths.DistDir,
            CoreWebView2HostResourceAccessKind.Allow);
        Log("mapping:done");

        var blankReady = new TaskCompletionSource<bool>(
            TaskCreationOptions.RunContinuationsAsynchronously);
        void OnBlank(object? sender, CoreWebView2NavigationCompletedEventArgs args)
        {
            if (args.IsSuccess)
            {
                blankReady.TrySetResult(true);
            }
        }

        core.NavigationCompleted += OnBlank;
        core.Navigate("about:blank");
        await blankReady.Task;
        core.NavigationCompleted -= OnBlank;
        Log("blank:ready");

        await core.AddScriptToExecuteOnDocumentCreatedAsync(BridgeScript);
        Log("script:added");
        core.WebMessageReceived += OnWebMessage;
        core.NavigationCompleted += (_, _) => _webView.Focus();
        var darkQuery = Environment.GetCommandLineArgs().Contains("--dark")
            ? "&dark=1"
            : string.Empty;
        var presetQuery = Environment.GetCommandLineArgs().Contains("--preset")
            ? "&preset=1"
            : string.Empty;
        core.Navigate(
            $"https://test.local/index.html?shell=1{darkQuery}{presetQuery}");
        Log("navigate:called");

#if DEBUG
        _ = ProbeAndCaptureAsync(core);
#endif

        _pi = new PiBridge(Paths.PiCli, Paths.PiWorkDir, Paths.PiDataDir);
        _pi.RecordReceived += PostRecord;
        _pi.StatusChanged += status => PostJson(
            $"{{\"kind\":\"status\",\"status\":{JsonSerializer.Serialize(status)}}}");
        _pi.LogReceived += text => PostJson(
            $"{{\"kind\":\"log\",\"text\":{JsonSerializer.Serialize(text)}}}");
        _pi.Start();
        Log("pi:started");

#if DEBUG
        if (Environment.GetCommandLineArgs().Contains("--cc-import"))
        {
            _ = Task.Delay(2000).ContinueWith(_ =>
            {
                if (!IsDisposed)
                {
                    BeginInvoke(new Action(PostCcConfig));
                }
            });
        }
        if (Environment.GetCommandLineArgs().Contains("--import-pi"))
        {
            _ = Task.Delay(2000).ContinueWith(_ =>
            {
                if (!IsDisposed)
                {
                    BeginInvoke(new Action(HandleImportPi));
                }
            });
        }
        if (Environment.GetCommandLineArgs().Contains("--one-click"))
        {
            _ = Task.Delay(2000).ContinueWith(_ =>
            {
                if (!IsDisposed)
                {
                    BeginInvoke(new Action(HandleOneClick));
                }
            });
        }
        if (Environment.GetCommandLineArgs().Contains("--open-login"))
        {
            _ = Task.Delay(2000).ContinueWith(_ =>
            {
                if (!IsDisposed)
                {
                    BeginInvoke(new Action(HandleOpenPiLogin));
                }
            });
        }
#endif
    }

    private async Task ProbeAndCaptureAsync(CoreWebView2 core)
    {
        Log("probe:waiting");
        await Task.Delay(3000);
        try
        {
            Log("probe:executing");
            var probe = await OnUiAsync(() =>
                core.ExecuteScriptAsync(
                    "JSON.stringify({title:document.title,text:document.body.innerText.slice(0,240),tesT:!!window.tesT,className:document.querySelector('.app')?.className||null,glass:(()=>{const b=document.querySelector('.glass-primary');if(!b)return null;const s=getComputedStyle(b);return {cls:b.className,bg:s.backgroundImage,color:s.color,opacity:s.opacity};})(),animations:document.getAnimations().map(a=>({n:a.animationName,s:a.playState,t:(a.effect&&a.effect.target&&a.effect.target.className)||''})),counts:{skeleton:document.querySelectorAll('.skeleton').length,dot:document.querySelectorAll('.dot-spinner').length,ring:document.querySelectorAll('.ring').length,caret:document.querySelectorAll('.caret').length,plan:document.querySelectorAll('.plan-card').length}})"));
            await File.WriteAllTextAsync(
                Path.Combine(Paths.DataDir, "shell-probe.json"),
                probe);
            Log("probe:done " + probe);

            using var stream = File.Create(
                Path.Combine(Paths.DataDir, "shell-capture.png"));
            await OnUiAsync(async () =>
            {
                await core.CapturePreviewAsync(
                    CoreWebView2CapturePreviewImageFormat.Png,
                    stream);
                return true;
            });
            Log("capture:done");

            if (Environment.GetCommandLineArgs().Contains("--smoke"))
            {
                await OnUiAsync(async () =>
                {
                    await core.ExecuteScriptAsync(
                        "window.tesT.send({type:'prompt',message:'Reply with OK only.'})");
                    return true;
                });
                await Task.Delay(7000);
                var smokeProbe = await OnUiAsync(() =>
                    core.ExecuteScriptAsync(
                        "JSON.stringify({text:document.body.innerText.slice(-600)})"));
                Log("smoke:probe " + smokeProbe);
                using var smokeStream = File.Create(
                    Path.Combine(Paths.DataDir, "shell-smoke.png"));
                await OnUiAsync(async () =>
                {
                    await core.CapturePreviewAsync(
                        CoreWebView2CapturePreviewImageFormat.Png,
                        smokeStream);
                    return true;
                });
                Log("smoke:done");
            }
        }
        catch (Exception ex)
        {
            Log("probe:error " + ex);
            await File.WriteAllTextAsync(
                Path.Combine(Paths.DataDir, "shell-probe-error.txt"),
                ex.ToString());
        }
    }

    private Task<T> OnUiAsync<T>(Func<Task<T>> action)
    {
        var completion = new TaskCompletionSource<T>(
            TaskCreationOptions.RunContinuationsAsynchronously);
        BeginInvoke(async () =>
        {
            try
            {
                completion.TrySetResult(await action());
            }
            catch (Exception ex)
            {
                completion.TrySetException(ex);
            }
        });
        return completion.Task;
    }

    private static void Log(string message)
    {
        try
        {
            File.AppendAllText(
                Path.Combine(Paths.DataDir, "shell.log"),
                $"{DateTime.Now:O} {message}{Environment.NewLine}");
        }
        catch
        {
            // ignored
        }
    }

    private void OnWebMessage(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        JsonDocument document;
        try
        {
            document = JsonDocument.Parse(e.WebMessageAsJson);
        }
        catch
        {
            return;
        }

        using (document)
        {
            var root = document.RootElement;
            if (!root.TryGetProperty("kind", out var kindElement))
            {
                return;
            }

            switch (kindElement.GetString())
            {
                case "bridge-ready":
                    _rendererReady = true;
                    FlushPending();
                    break;
                case "pi-command":
                    if (root.TryGetProperty("command", out var command))
                    {
                        _pi?.Send(command.GetRawText());
                    }
                    break;
                case "window":
                    if (root.TryGetProperty("action", out var action))
                    {
                        HandleWindowAction(action.GetString());
                    }
                    break;
                case "drag":
                    HandleDrag(root);
                    break;
                case "cc-config":
                    PostCcConfig();
                    break;
                case "open-models":
                    OpenModelsConfig();
                    break;
                case "save-provider":
                    HandleSaveProvider(root);
                    break;
                case "fetch-models":
                    _ = HandleFetchModels(root);
                    break;
                case "clear-providers":
                    HandleClearProviders();
                    break;
                case "open-pi-login":
                    HandleOpenPiLogin();
                    break;
                case "pi-auth-status":
                    PostPiAuthStatus();
                    break;
                case "import-pi":
                    HandleImportPi();
                    break;
                case "one-click":
                    HandleOneClick();
                    break;
            }
        }
    }

    private void HandleWindowAction(string? action)
    {
        switch (action)
        {
            case "minimize":
                WindowState = FormWindowState.Minimized;
                break;
            case "maximize":
                WindowState = WindowState == FormWindowState.Maximized
                    ? FormWindowState.Normal
                    : FormWindowState.Maximized;
                break;
            case "close":
                Close();
                break;
        }
    }

    private void HandleDrag(JsonElement root)
    {
        var action = root.GetProperty("action").GetString();
        if (action == "begin")
        {
            _dragging = true;
            _dragLast = new Point(
                (int)root.GetProperty("x").GetDouble(),
                (int)root.GetProperty("y").GetDouble());
            return;
        }

        if (action == "end")
        {
            _dragging = false;
            return;
        }

        if (action != "move" || !_dragging)
        {
            return;
        }

        var x = (int)root.GetProperty("x").GetDouble();
        var y = (int)root.GetProperty("y").GetDouble();
        var scale = DeviceDpi / 96.0;
        var deltaX = (int)Math.Round((x - _dragLast.X) * scale);
        var deltaY = (int)Math.Round((y - _dragLast.Y) * scale);
        Location = new Point(Location.X + deltaX, Location.Y + deltaY);
        _dragLast = new Point(x, y);
    }

    private void PostRecord(string record)
    {
        PostJson($"{{\"kind\":\"pi\",\"record\":{record}}}");
    }

    private void PostJson(string json)
    {
        if (InvokeRequired)
        {
            try
            {
                BeginInvoke(new Action(() => PostJson(json)));
            }
            catch
            {
                // The form may be closing.
            }

            return;
        }

        if (!_rendererReady || !_coreReady)
        {
            _pending.Add(json);
            return;
        }

        try
        {
            _webView.CoreWebView2.PostWebMessageAsJson(json);
        }
        catch
        {
            _pending.Add(json);
        }
    }

    private void FlushPending()
    {
        if (_pending.Count == 0)
        {
            return;
        }

        var pending = _pending.ToArray();
        _pending.Clear();
        foreach (var json in pending)
        {
            PostJson(json);
        }
    }

    private void PostCcConfig()
    {
        var path = Paths.FindCcConfig();
        if (path is null)
        {
            PostJson(JsonSerializer.Serialize(new
            {
                kind = "cc-import",
                imported = 0,
                names = Array.Empty<string>(),
                error = "未找到 CC Switch 配置；v4 请先在 CC Switch 保存一次（~/.cc-switch/cc-switch.db）",
            }));
            return;
        }

        var result = CcImporter.Import(
            path,
            Path.Combine(Paths.PiDataDir, "models.json"));
        if (result.Error is not null)
        {
            PostJson(JsonSerializer.Serialize(new
            {
                kind = "cc-import",
                imported = 0,
                names = result.Names,
                error = result.Error,
                path,
            }));
            return;
        }

        _pi?.Restart();
        PostJson(JsonSerializer.Serialize(new
        {
            kind = "cc-import",
            imported = result.Imported,
            names = result.Names,
            error = (string?)null,
            path,
        }));
    }

    private void OpenModelsConfig()
    {
        try
        {
            var path = Path.Combine(Paths.PiDataDir, "models.json");
            if (!File.Exists(path))
            {
                File.WriteAllText(path, "{\n  \"providers\": {}\n}\n");
            }

            Process.Start(new ProcessStartInfo
            {
                FileName = "notepad.exe",
                Arguments = $"\"{path}\"",
                UseShellExecute = true,
            });
        }
        catch (Exception ex)
        {
            Log("open-models:error " + ex);
        }
    }

    private void HandleSaveProvider(JsonElement root)
    {
        if (!root.TryGetProperty("provider", out var providerElement))
        {
            return;
        }

        var provider = JsonNode.Parse(providerElement.GetRawText()) as JsonObject;
        if (provider is null)
        {
            return;
        }

        var name = provider["name"]?.ToString() ?? string.Empty;
        var result = CcImporter.SaveProvider(
            Path.Combine(Paths.PiDataDir, "models.json"),
            provider);
        if (result.Error is not null)
        {
            PostJson(JsonSerializer.Serialize(new
            {
                kind = "provider-saved",
                name,
                error = result.Error,
            }));
            return;
        }

        _pi?.Restart();
        PostJson(JsonSerializer.Serialize(new
        {
            kind = "provider-saved",
            key = result.Key,
            name,
            error = (string?)null,
        }));
    }

    private async Task HandleFetchModels(JsonElement root)
    {
        var requestId = root.TryGetProperty("requestId", out var idElement)
            ? idElement.GetString() ?? string.Empty
            : string.Empty;
        var baseUrl = root.TryGetProperty("baseUrl", out var baseElement)
            ? baseElement.GetString() ?? string.Empty
            : string.Empty;
        var api = root.TryGetProperty("api", out var apiElement)
            ? apiElement.GetString() ?? string.Empty
            : string.Empty;
        var apiKey = root.TryGetProperty("apiKey", out var keyElement)
            ? keyElement.GetString() ?? string.Empty
            : string.Empty;
        string? apiKeyField = null;
        if (root.TryGetProperty("apiKeyField", out var fieldElement))
        {
            apiKeyField = fieldElement.GetString();
        }

        JsonObject? headers = null;
        if (root.TryGetProperty("headers", out var headersElement) &&
            headersElement.ValueKind == JsonValueKind.Object)
        {
            headers = JsonNode.Parse(headersElement.GetRawText()) as JsonObject;
        }

        var result = await ModelDiscovery.FetchAsync(
            baseUrl,
            api,
            apiKey,
            apiKeyField,
            headers);
        PostJson(JsonSerializer.Serialize(new
        {
            kind = "models-fetched",
            requestId,
            count = result.Models.Count,
            models = result.Models.Select(model => new
            {
                id = model.Id,
                name = model.Name,
            }),
            endpoint = result.Endpoint,
            error = result.Error,
        }));
    }

    private void HandleClearProviders()
    {
        var path = Path.Combine(Paths.PiDataDir, "models.json");
        try
        {
            if (File.Exists(path))
            {
                var backup = path + ".bak";
                File.Copy(path, backup, overwrite: true);
                File.Delete(path);
            }

            _pi?.Restart();
            PostJson(JsonSerializer.Serialize(new
            {
                kind = "providers-cleared",
                error = (string?)null,
            }));
        }
        catch (Exception ex)
        {
            PostJson(JsonSerializer.Serialize(new
            {
                kind = "providers-cleared",
                error = ex.Message,
            }));
        }
    }

    private void HandleOpenPiLogin()
    {
        if (_piLogin is { HasExited: false })
        {
            PostJson(JsonSerializer.Serialize(new
            {
                kind = "pi_login_opened",
                alreadyOpen = true,
            }));
            return;
        }

        var process = PiLogin.OpenTerminal();
        if (process is null)
        {
            PostJson(JsonSerializer.Serialize(new
            {
                kind = "pi_login_opened",
                error = "无法打开 Pi 登录窗口，请检查 Pi CLI 是否存在。",
            }));
            return;
        }

        _piLogin = process;
        process.EnableRaisingEvents = true;
        process.Exited += (_, _) =>
        {
            _piLogin = null;
            _pi?.Restart();
            var status = PiLogin.ReadStatus();
            PostJson(JsonSerializer.Serialize(new
            {
                kind = "pi_login_closed",
                providers = status.Providers,
                oauthProviders = status.OAuthProviders,
            }));
        };

        PostJson(JsonSerializer.Serialize(new
        {
            kind = "pi_login_opened",
            error = (string?)null,
        }));
        _ = PiLogin.TryTypeLoginAsync(process);
    }

    private void PostPiAuthStatus()
    {
        var status = PiLogin.ReadStatus();
        PostJson(JsonSerializer.Serialize(new
        {
            kind = "pi-auth-status",
            providers = status.Providers,
            oauthProviders = status.OAuthProviders,
        }));
    }

    private void HandleImportPi()
    {
        var result = PiConfigImporter.Import(
            Paths.PiNativeAgentDir,
            Paths.PiDataDir);
        if (result.Error is not null)
        {
            PostJson(JsonSerializer.Serialize(new
            {
                kind = "pi-import",
                providers = 0,
                auth = false,
                source = result.Source,
                error = result.Error,
            }));
            return;
        }

        _pi?.Restart();
        PostJson(JsonSerializer.Serialize(new
        {
            kind = "pi-import",
            providers = result.Providers,
            auth = result.Auth,
            settings = result.Settings,
            source = result.Source,
            error = (string?)null,
        }));
    }

    private void HandleOneClick()
    {
        var result = OneClickConfigurator.Configure(
            Paths.PiNativeAgentDir,
            Paths.PiDataDir,
            Paths.FindCcConfig());
        if (result.Error is not null)
        {
            PostJson(JsonSerializer.Serialize(new
            {
                kind = "one-click",
                providers = 0,
                auth = false,
                source = string.Empty,
                names = Array.Empty<string>(),
                error = result.Error,
            }));
            return;
        }

        _pi?.Restart();
        PostJson(JsonSerializer.Serialize(new
        {
            kind = "one-click",
            providers = result.Providers,
            auth = result.Auth,
            source = result.Source,
            names = result.Names,
            error = (string?)null,
        }));
    }

    private void ApplyRoundedCorners()
    {
        try
        {
            var preference = 2; // DWMWCP_ROUND
            DwmSetWindowAttribute(Handle, 33, ref preference, sizeof(int));
        }
        catch
        {
            // ignored
        }
    }

    protected override void WndProc(ref Message m)
    {
        if (m.Msg == WmNcHitTest)
        {
            base.WndProc(ref m);
            if ((int)m.Result == HtClient && WindowState == FormWindowState.Normal)
            {
                var point = PointToClient(Cursor.Position);
                const int border = 6;
                var left = point.X <= border;
                var right = point.X >= ClientSize.Width - border;
                var top = point.Y <= border;
                var bottom = point.Y >= ClientSize.Height - border;

                if (top && left) m.Result = HtTopLeft;
                else if (top && right) m.Result = HtTopRight;
                else if (bottom && left) m.Result = HtBottomLeft;
                else if (bottom && right) m.Result = HtBottomRight;
                else if (left) m.Result = HtLeft;
                else if (right) m.Result = HtRight;
                else if (top) m.Result = HtTop;
                else if (bottom) m.Result = HtBottom;
            }

            return;
        }

        base.WndProc(ref m);
    }

    [DllImport("dwmapi.dll")]
    private static extern int DwmSetWindowAttribute(
        IntPtr hwnd,
        int attribute,
        ref int value,
        int size);

    private const string BridgeScript = """
(() => {
  const bridge = {
    isShell: true,
    _listeners: [],
    onRecord(fn) {
      if (typeof fn === "function") this._listeners.push(fn);
    },
    offRecord(fn) {
      this._listeners = this._listeners.filter((item) => item !== fn);
    },
    _emit(record) {
      for (const fn of this._listeners) {
        try { fn(record); } catch (error) { console.error(error); }
      }
    },
    send(command) {
      window.chrome.webview.postMessage({ kind: "pi-command", command });
    },
    ready() {
      window.chrome.webview.postMessage({ kind: "bridge-ready" });
    },
    windowAction(action) {
      window.chrome.webview.postMessage({ kind: "window", action });
    },
    beginDrag(x, y) {
      window.chrome.webview.postMessage({ kind: "drag", action: "begin", x, y });
    },
    dragTo(x, y) {
      window.chrome.webview.postMessage({ kind: "drag", action: "move", x, y });
    },
    endDrag() {
      window.chrome.webview.postMessage({ kind: "drag", action: "end" });
    },
    readCcConfig() {
      window.chrome.webview.postMessage({ kind: "cc-config" });
    },
    openModelsConfig() {
      window.chrome.webview.postMessage({ kind: "open-models" });
    },
    saveProvider(provider) {
      window.chrome.webview.postMessage({ kind: "save-provider", provider });
    },
    fetchModels(payload) {
      window.chrome.webview.postMessage({ kind: "fetch-models", ...payload });
    },
    clearProviders() {
      window.chrome.webview.postMessage({ kind: "clear-providers" });
    },
    openPiLogin() {
      window.chrome.webview.postMessage({ kind: "open-pi-login" });
    },
    piAuthStatus() {
      window.chrome.webview.postMessage({ kind: "pi-auth-status" });
    },
    importPi() {
      window.chrome.webview.postMessage({ kind: "import-pi" });
    },
    oneClick() {
      window.chrome.webview.postMessage({ kind: "one-click" });
    }
  };

  window.tesT = bridge;
  window.chrome.webview.addEventListener("message", (event) => {
    const message = event.data;
    if (!message) return;
    if (message.kind === "pi") bridge._emit(message.record);
    else if (message.kind === "status") bridge._emit({ type: "bridge_status", status: message.status });
    else if (message.kind === "log") bridge._emit({ type: "bridge_log", text: message.text });
    else if (message.kind === "cc-import") bridge._emit({
      type: "cc_import",
      imported: message.imported,
      names: message.names,
      error: message.error,
      path: message.path
    });
    else if (message.kind === "provider-saved") bridge._emit({
      type: "provider_saved",
      key: message.key,
      name: message.name,
      error: message.error
    });
    else if (message.kind === "models-fetched") bridge._emit({
      type: "models_fetched",
      requestId: message.requestId,
      count: message.count,
      models: message.models,
      endpoint: message.endpoint,
      error: message.error
    });
    else if (message.kind === "providers-cleared") bridge._emit({
      type: "providers_cleared",
      error: message.error
    });
    else if (message.kind === "pi_login_opened") bridge._emit({
      type: "pi_login_opened",
      error: message.error,
      alreadyOpen: message.alreadyOpen
    });
    else if (message.kind === "pi_login_closed") bridge._emit({
      type: "pi_login_closed",
      providers: message.providers,
      oauthProviders: message.oauthProviders
    });
    else if (message.kind === "pi-auth-status") bridge._emit({
      type: "pi_auth_status",
      providers: message.providers,
      oauthProviders: message.oauthProviders
    });
    else if (message.kind === "pi-import") bridge._emit({
      type: "pi_import",
      providers: message.providers,
      auth: message.auth,
      settings: message.settings,
      source: message.source,
      error: message.error
    });
    else if (message.kind === "one-click") bridge._emit({
      type: "one_click",
      providers: message.providers,
      auth: message.auth,
      source: message.source,
      names: message.names,
      error: message.error
    });
  });

  const announce = () => setTimeout(() => bridge.ready(), 600);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", announce);
  } else {
    announce();
  }
})();
""";
}
