Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
projectDir = fso.GetParentFolderName(scriptDir)
shell.CurrentDirectory = projectDir
shell.Environment("Process")("ELECTRON_DISABLE_SECURITY_WARNINGS") = "true"

command = """" & projectDir & "\node_modules\electron\dist\electron.exe"" ."
For Each arg In WScript.Arguments
  command = command & " " & arg
Next

shell.Run command, 0, False
