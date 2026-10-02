# Reproducible local speech assets. No external service or API key.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$taskOutput = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../public/audio'))
New-Item -ItemType Directory -Force $taskOutput | Out-Null
$taskScript = Get-Content -LiteralPath (Join-Path $PSScriptRoot '../src/demo.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$taskVoice = New-Object System.Speech.Synthesis.SpeechSynthesizer
$taskVoice.SelectVoice('Microsoft Haruka Desktop')
$taskVoice.Rate = -1
foreach ($taskTurn in $taskScript.turns) {
    $taskVoice.SetOutputToWaveFile((Join-Path $taskOutput ($taskTurn.id + '.wav')))
    $taskVoice.Speak($taskTurn.japanese)
    $taskVoice.SetOutputToWaveFile((Join-Path $taskOutput ($taskTurn.id + '-reply.wav')))
    $taskVoice.Speak($taskTurn.answer)
}
$taskVoice.SetOutputToNull()
$taskVoice.Dispose()
