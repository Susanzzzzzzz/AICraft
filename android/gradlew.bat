@rem Gradle wrapper
@if "%DEBUG%"=="" @set DEBUG=
@set APP_HOME=%~dp0
@set CLASSPATH=%APP_HOME%gradlewrappergradle-wrapper.jar
@java -Xmx64m -classpath %CLASSPATH% org.gradle.wrapper.GradleWrapperMain %*
