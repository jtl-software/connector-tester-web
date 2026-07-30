// electron-builder `afterPack` hook.
//
// C1 (round 1) shipped a Windows build with the macOS PHP binary inside it,
// undetected, because electron-builder's own file-copy step
// (app-builder-lib's `copyFiles`) only *warns* when a declared `extraResources`
// source doesn't exist — it does not fail the build. That means any package
// that ends up with no `php/<triple>/` binary at all (the fetch step was
// skipped, `php:fetch` failed for one target, the directory got cleaned,
// someone added a new target and forgot the PHP resource entry) ships
// silently: `npm run build:win`/`build:mac` exits 0, and every user of that
// package hits the "PHP runtime missing" dialog on first launch. This hook
// makes that a red build instead: it asserts, right after electron-builder
// finishes packing each target, that the expected PHP binary is actually
// present in the packaged output AND is a binary of the right format for
// that target (so a wrong-platform binary — the exact shape of C1 — fails
// the build too, not just a missing one).
import { existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { readdirSync } from 'node:fs'

const ARCH_NAMES = ['ia32', 'x64', 'armv7l', 'arm64', 'universal']

function findMacBundle(appOutDir) {
  const entry = readdirSync(appOutDir).find((name) => name.endsWith('.app'))
  if (!entry) {
    throw new Error(`[verify-php-bundle] No .app bundle found in ${appOutDir}`)
  }
  return path.join(appOutDir, entry)
}

function fileFormat(binaryPath) {
  return execFileSync('file', ['-b', binaryPath], { encoding: 'utf8' }).trim()
}

/**
 * @param {import('electron-builder').AfterPackContext} context
 */
export default async function verifyPhpBundle(context) {
  const { electronPlatformName, arch, appOutDir } = context
  const archName = ARCH_NAMES[arch] ?? String(arch)

  let resourcesDir
  let triple
  let binary
  let expectedFormatSubstring

  if (electronPlatformName === 'darwin') {
    resourcesDir = path.join(findMacBundle(appOutDir), 'Contents', 'Resources')
    triple = `darwin-${archName}`
    binary = 'php'
    expectedFormatSubstring = archName === 'arm64' ? 'Mach-O 64-bit executable arm64' : 'Mach-O 64-bit executable x86_64'
  } else if (electronPlatformName === 'win32') {
    resourcesDir = path.join(appOutDir, 'resources')
    triple = `win32-${archName}`
    binary = 'php.exe'
    expectedFormatSubstring = 'PE32+ executable'
  } else {
    // Not a target this project ships (e.g. linux). Nothing to assert yet —
    // but note in electron-builder.yml's own comment: a new platform target
    // added later needs an entry here too, or it silently gets no assertion
    // at all (the same failure class this hook exists to prevent).
    console.log(`[verify-php-bundle] Skipping unrecognised platform "${electronPlatformName}" — no PHP assertion defined for it.`)
    return
  }

  const phpPath = path.join(resourcesDir, 'php', triple, binary)

  if (!existsSync(phpPath)) {
    throw new Error(
      `[verify-php-bundle] Missing PHP runtime at:\n\n  ${phpPath}\n\n` +
      `This package would ship with no backend and fail for every single user on first launch. ` +
      `Run "npm run php:fetch" in desktop/ (see desktop/scripts/fetch-php.sh) before building, and ` +
      `confirm desktop/electron-builder.yml's per-platform "extraResources" entry for "${electronPlatformName}" ` +
      `points at an existing php/${triple}/ directory.`
    )
  }

  const format = fileFormat(phpPath)
  if (!format.includes(expectedFormatSubstring)) {
    throw new Error(
      `[verify-php-bundle] PHP binary at:\n\n  ${phpPath}\n\n` +
      `is not the expected format for this target.\n` +
      `  expected to contain: "${expectedFormatSubstring}"\n` +
      `  actual "file -b" output: "${format}"\n\n` +
      `This is the exact failure class as C1 (a wrong-platform PHP binary bundled into a package) — ` +
      `check that php/${triple}/${binary} was fetched for the right OS/arch, not copied from another triple.`
    )
  }

  console.log(`[verify-php-bundle] OK — ${phpPath} (${format})`)
}
