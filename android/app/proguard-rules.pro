# AICraft ProGuard Rules
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface
-keep class com.aicraft.app.MainActivity { *; }
-dontwarn androidx.**
