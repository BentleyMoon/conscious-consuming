# DeepSeek key storage, the safe way on Windows.
#
# The key is pasted ONCE into a hidden prompt in YOUR terminal: it never appears on screen, never
# lands in shell history, never passes through a chat transcript, and never enters this repository.
# It is stored DPAPI-encrypted, bound to your Windows account, in %APPDATA% - outside the repo, so
# no git command can ever commit it. A stolen copy of the file is useless on any other machine or
# account. What DPAPI does not protect against: software already running as you; nothing local does.
# If the key ever leaks anywhere, rotate it at platform.deepseek.com.
#
#   npm run secret:deepseek            store (hidden prompt)
#   npm run secret:deepseek -- -Check  confirm one is stored (prints length only, never the key)
#   npm run secret:deepseek -- -Remove delete it
#
# -Value exists only so automated tests can exercise the plumbing with a dummy; a real key should
# always go through the prompt, because command lines are visible in process listings and history.

param(
  [switch]$Check,
  [switch]$Remove,
  [switch]$Read,      # internal: used by scripts/with-deepseek.mjs; writes the key to stdout for the pipe
  [string]$Value
)

$dir  = Join-Path $env:APPDATA 'consciousconsuming'
$file = Join-Path $dir 'deepseek.dpapi'

if ($Remove) {
  if (Test-Path $file) { Remove-Item $file -Force -Confirm:$false; Write-Host 'Stored key removed.' }
  else { Write-Host 'No stored key.' }
  exit 0
}

if ($Check) {
  if (-not (Test-Path $file)) { Write-Host 'No stored key.'; exit 1 }
  try {
    $sec = Get-Content $file | ConvertTo-SecureString
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
    $len = ([Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)).Length
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    Write-Host ("Stored key present ({0} characters). The key itself is never printed." -f $len)
    exit 0
  } catch { Write-Host 'A file exists but cannot be decrypted by this account.'; exit 1 }
}

if ($Read) {
  if (-not (Test-Path $file)) { exit 1 }
  $sec = Get-Content $file | ConvertTo-SecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  # stdout only, consumed by the runner's pipe; nothing is echoed to a console in this mode
  [Console]::Out.Write([Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr))
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  exit 0
}

New-Item -ItemType Directory -Force $dir | Out-Null

if ($Value) {
  # test-only path; see the header
  $sec = ConvertTo-SecureString $Value -AsPlainText -Force
} else {
  $sec = Read-Host 'Paste the DeepSeek API key (input is hidden)' -AsSecureString
  if ($sec.Length -eq 0) { Write-Host 'Nothing entered; nothing stored.'; exit 1 }
}

$sec | ConvertFrom-SecureString | Out-File -Encoding ascii $file
Write-Host ("Stored, encrypted to your Windows account, at {0}" -f $file)
Write-Host 'Use it with: npm run ontology:expand'
