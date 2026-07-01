package com.gatetutor.app

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Message
import android.provider.MediaStore
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.webkit.*
import android.widget.*
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.FileProvider
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.updatePadding
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import androidx.webkit.WebSettingsCompat
import androidx.webkit.WebViewFeature
import java.io.File
import java.io.IOException

@SuppressLint("SetJavaScriptEnabled")
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private lateinit var errorView: LinearLayout
    private lateinit var swipeRefresh: SwipeRefreshLayout
    private lateinit var rootContainer: View

    private var currentUrl: String = ""
    private var uploadMessage: ValueCallback<Array<Uri>>? = null
    private var cameraImageUri: Uri? = null

    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (uploadMessage == null) return@registerForActivityResult

        var results: Array<Uri>? = null

        if (result.resultCode == RESULT_OK) {
            val data = result.data
            if (data != null) {
                val dataString = data.dataString
                if (dataString != null) {
                    results = arrayOf(Uri.parse(dataString))
                } else {
                    val clipData = data.clipData
                    if (clipData != null) {
                        results = Array(clipData.itemCount) { i ->
                            clipData.getItemAt(i).uri
                        }
                    }
                }
            }

            if (results == null && cameraImageUri != null) {
                results = arrayOf(cameraImageUri!!)
            }
        }

        uploadMessage?.onReceiveValue(results)
        uploadMessage = null
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        super.onCreate(savedInstanceState)

        val sharedPrefs = getSharedPreferences("gate_tutor_prefs", Context.MODE_PRIVATE)
        currentUrl = sharedPrefs.getString("server_url", getString(R.string.default_url))
            ?: getString(R.string.default_url)

        setContentView(R.layout.activity_main)

        rootContainer = findViewById(R.id.rootContainer)
        webView = findViewById(R.id.webView)
        progressBar = findViewById(R.id.progressBar)
        errorView = findViewById(R.id.errorView)
        swipeRefresh = findViewById(R.id.swipeRefresh)

        setupEdgeToEdge()
        setupWebView()
        setupSwipeRefresh()
        loadUrl(currentUrl)

        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (checkSelfPermission(android.Manifest.permission.RECORD_AUDIO)
                != android.content.pm.PackageManager.PERMISSION_GRANTED
            ) {
                requestPermissions(arrayOf(android.Manifest.permission.RECORD_AUDIO), 101)
            }
        }
    }

    private fun setupEdgeToEdge() {
        rootContainer.setOnApplyWindowInsetsListener { view, insets ->
            val statusBarInsets = insets.getInsets(WindowInsetsCompat.Type.statusBars())
            view.updatePadding(top = statusBarInsets.top)
            insets
        }
    }

    private fun setupWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.setSupportMultipleWindows(false)
        settings.javaScriptCanOpenWindowsAutomatically = false
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        settings.setSupportZoom(true)
        settings.builtInZoomControls = true
        settings.displayZoomControls = false
        settings.textZoom = 100
        settings.cacheMode = WebSettings.LOAD_CACHE_ELSE_NETWORK
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        settings.userAgentString = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

        @Suppress("DEPRECATION")
        fun applyForceDark() {
            if (WebViewFeature.isFeatureSupported(WebViewFeature.FORCE_DARK)) {
                WebSettingsCompat.setForceDark(webView.settings, WebSettingsCompat.FORCE_DARK_AUTO)
            }
        }
        applyForceDark()

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                if (newProgress < 100) {
                    progressBar.visibility = View.VISIBLE
                    progressBar.progress = newProgress
                } else {
                    progressBar.visibility = View.GONE
                }
            }

            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                uploadMessage = filePathCallback

                val takePhotoIntent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
                var photoFile: File? = null
                try {
                    photoFile = createImageFile()
                    takePhotoIntent.putExtra("PhotoPath", photoFile?.absolutePath)
                } catch (ex: IOException) {
                    photoFile = null
                }

                cameraImageUri = photoFile?.let {
                    FileProvider.getUriForFile(
                        this@MainActivity,
                        "$packageName.fileprovider",
                        it
                    )
                }

                val contentSelectionIntent = Intent(Intent.ACTION_GET_CONTENT)
                contentSelectionIntent.addCategory(Intent.CATEGORY_OPENABLE)
                contentSelectionIntent.type = "*/*"

                val chooser = Intent(Intent.ACTION_CHOOSER)
                chooser.putExtra(Intent.EXTRA_INTENT, contentSelectionIntent)
                chooser.putExtra(Intent.EXTRA_TITLE, "Select file")

                val cameraUri = cameraImageUri
                if (cameraUri != null) {
                    chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, arrayOf(takePhotoIntent))
                }

                fileChooserLauncher.launch(chooser)
                return true
            }

            override fun onCreateWindow(
                view: WebView?,
                isDialog: Boolean,
                isUserGesture: Boolean,
                resultMsg: Message?
            ): Boolean {
                return false
            }

            override fun onPermissionRequest(request: PermissionRequest) {
                runOnUiThread {
                    request.grant(request.resources)
                }
            }
        }

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                swipeRefresh.isRefreshing = false
                errorView.visibility = View.GONE
                webView.visibility = View.VISIBLE
                injectMobileOptimizations(view)
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    if (error?.errorCode == ERROR_HOST_LOOKUP || error?.errorCode == ERROR_CONNECT
                        || error?.errorCode == ERROR_TIMEOUT
                    ) {
                        if (view?.url == currentUrl || request?.isForMainFrame == true) {
                            swipeRefresh.isRefreshing = false
                            showError()
                        }
                    }
                }
            }

            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean {
                val url = request?.url?.toString() ?: return false
                if (url.startsWith(currentUrl) ||
                    url.startsWith("https://gate-cse-tutor") ||
                    url.contains("firebaseapp.com") ||
                    url.contains("accounts.google.com")
                ) {
                    return false
                }
                if (url.startsWith("http://") || url.startsWith("https://")) {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                    startActivity(intent)
                    return true
                }
                return false
            }
        }

        webView.addJavascriptInterface(
            object {
                @android.webkit.JavascriptInterface
                fun getVersion(): String = BuildConfig.VERSION_NAME
            },
            "AndroidBridge"
        )

        val cookieManager = CookieManager.getInstance()
        cookieManager.setAcceptCookie(true)
        try {
            CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)
        } catch (_: Exception) {
        }
    }

    private fun injectMobileOptimizations(view: WebView?) {
        view?.evaluateJavascript(
            """
            (function() {
                var meta = document.querySelector('meta[name="viewport"]');
                if (!meta) {
                    meta = document.createElement('meta');
                    meta.name = 'viewport';
                    document.head.insertBefore(meta, document.head.firstChild);
                }
                meta.content = 'width=device-width, initial-scale=1';
                
                if (!document.getElementById('mob-opt')) {
                    var s = document.createElement('style');
                    s.id = 'mob-opt';
                    s.textContent = [
                        'input,textarea,select{font-size:16px!important}',
                        'body{-webkit-text-size-adjust:100%;text-size-adjust:100%;overflow-x:hidden}',
                        'a,button,[role="button"],input[type="submit"],input[type="button"]{min-height:44px!important;touch-action:manipulation;cursor:pointer}',
                        'img{max-width:100%!important;height:auto}',
                        'pre,code{white-space:pre-wrap;word-break:break-word}'
                    ].join('\n');
                    document.head.appendChild(s);
                }
            })();
            """.trimIndent(), null
        )
    }

    private fun setupSwipeRefresh() {
        swipeRefresh.setColorSchemeResources(R.color.primary)
        swipeRefresh.setOnRefreshListener {
            if (errorView.visibility == View.VISIBLE) {
                errorView.visibility = View.GONE
                webView.visibility = View.VISIBLE
            }
            webView.reload()
        }
    }

    private fun createImageFile(): File {
        val imageDir = File(cacheDir, "images")
        if (!imageDir.exists()) imageDir.mkdirs()
        return File.createTempFile("IMG_", ".jpg", imageDir)
    }

    private fun loadUrl(url: String) {
        currentUrl = url
        progressBar.visibility = View.VISIBLE
        webView.visibility = View.VISIBLE
        errorView.visibility = View.GONE

        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            webView.loadUrl("https://$url")
        } else {
            webView.loadUrl(url)
        }
    }

    private fun showError() {
        webView.visibility = View.GONE
        progressBar.visibility = View.GONE
        errorView.visibility = View.VISIBLE
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            if (webView.canGoBack()) {
                webView.goBack()
                return true
            }
        }
        return super.onKeyDown(keyCode, event)
    }

    override fun onPause() {
        super.onPause()
        webView.onPause()
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    override fun onRestoreInstanceState(savedInstanceState: Bundle) {
        super.onRestoreInstanceState(savedInstanceState)
        webView.restoreState(savedInstanceState)
    }

    private fun showSettingsDialog() {
        val builder = AlertDialog.Builder(this)
        builder.setTitle(R.string.settings_title)

        val layout = LinearLayout(this)
        layout.orientation = LinearLayout.VERTICAL
        layout.setPadding(48, 32, 48, 16)

        val urlLabel = TextView(this)
        urlLabel.text = getString(R.string.settings_url_label)
        urlLabel.setTextColor(getColor(R.color.on_surface))
        urlLabel.textSize = 14f

        val urlInput = EditText(this)
        urlInput.setText(currentUrl)
        urlInput.hint = "https://..."
        urlInput.setSingleLine()

        layout.addView(urlLabel)
        layout.addView(urlInput)

        builder.setView(layout)

        builder.setPositiveButton(R.string.settings_save) { _, _ ->
            val newUrl = urlInput.text.toString().trim()
            if (newUrl.isNotEmpty() && newUrl != currentUrl) {
                currentUrl = newUrl
                val prefs = getSharedPreferences("gate_tutor_prefs", Context.MODE_PRIVATE)
                prefs.edit().putString("server_url", newUrl).apply()
                loadUrl(newUrl)
            }
        }

        builder.setNegativeButton("Cancel", null)
        builder.show()
    }
}
