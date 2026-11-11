#!/usr/bin/env python3
"""Experimental ECM Wasm build; validate compilation and tests in Actions."""
import json
from pathlib import Path
import re
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / '.ecm-work'
SRC = WORK / 'source'
BUILD = WORK / 'build'
DIST = ROOT / 'ecm-dist'
ENGINE = DIST / 'js/ecm'
LOGS = ROOT / 'ecm-logs'
REF = 'ECM-20.0'
REMOTE = 'https://vcgit.hhi.fraunhofer.de/ecm/ECM.git'


def run(*args, cwd=None):
    print('+', ' '.join(map(str, args)), flush=True)
    subprocess.run(list(map(str, args)), cwd=cwd, check=True)


def build_keep_going(targets):
    """Compile with make -k so ALL errors are collected in one run, then
    print a compact summary of the errors (the full log is in ecm-logs/)."""
    LOGS.mkdir(exist_ok=True)
    log_path = LOGS / 'compile.log'
    cmd = ['cmake', '--build', str(BUILD), '--target', *targets,
           '--parallel', '2', '--', '-k']
    print('+', ' '.join(cmd), flush=True)
    lines = []
    with log_path.open('w', encoding='utf-8') as log:
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE,
                                stderr=subprocess.STDOUT, text=True,
                                errors='replace')
        for line in proc.stdout:
            log.write(line)
            lines.append(line.rstrip('\n'))
            if not line.startswith(('[', 'In file included', '  ')):
                print(line, end='', flush=True)
            elif line.startswith('['):
                print(line, end='', flush=True)
        code = proc.wait()
    if code != 0:
        print('\n==== COMPILE ERRORS SUMMARY ====', flush=True)
        hits = [i for i, l in enumerate(lines)
                if re.search(r'\berror\b|fatal error|undefined symbol|'
                             r'wasm-ld: error', l)]
        shown = 0
        last = -10
        seen = set()
        for i in hits:
            if i - last < 6:
                continue
            key = re.sub(r'^.*?/source/', '', lines[i])
            if key in seen:
                continue
            seen.add(key)
            last = i
            shown += 1
            for l in lines[max(0, i - 1):i + 6]:
                # the em++ link command line is huge and useless; cut it
                print(l if len(l) < 400 else l[:400] + ' ...[cut]', flush=True)
            print('-----', flush=True)
            if shown >= 25:
                print('... more errors in ecm-logs/compile.log', flush=True)
                break
        if not hits:
            print('No "error" lines found; last 40 lines:', flush=True)
            print('\n'.join(lines[-40:]), flush=True)
        print('==== END SUMMARY ====', flush=True)
        raise RuntimeError(f'Build failed with exit code {code}')


def find_output(name):
    """Upstream ECM CMake sets its own output dir (source/bin/umake/...),
    which overrides ours, so look in every place the file may end up."""
    roots = [BUILD / 'wasm', BUILD, SRC / 'bin']
    for root in roots:
        if not root.exists():
            continue
        hits = sorted(p for p in root.rglob(name) if p.is_file())
        if hits:
            return hits[0]
    return None


def choose_config(cfg_root, names, mode):
    preferred_names = [name.replace('_vtm.cfg', '_ecm.cfg')
                       for name in names if '_vtm.cfg' in name]
    preferred_names = list(dict.fromkeys(preferred_names + names))
    available = sorted(cfg_root.rglob('*.cfg'))
    print(f'Looking for config: {mode}', flush=True)
    for name in preferred_names:
        hits = [path for path in available if path.name == name]
        if not hits:
            continue
        for candidate in [cfg_root / name,
                          cfg_root / 'tool-on' / name,
                          cfg_root / 'base' / name]:
            if candidate in hits:
                print('Selected config: ' + str(candidate.relative_to(cfg_root)),
                      flush=True)
                return candidate
        if len(hits) == 1:
            print('Selected config: ' + str(hits[0].relative_to(cfg_root)),
                  flush=True)
            return hits[0]
        paths = '\n'.join(str(path.relative_to(cfg_root)) for path in hits)
        raise RuntimeError(
            f'Unrecognized config layout for {mode}: {name}\nCandidates:\n{paths}'
        )
    paths = '\n'.join(str(path.relative_to(cfg_root)) for path in available
                      if path.name.startswith('encoder'))
    raise RuntimeError(
        f'Cannot locate config for {mode}.\nAvailable encoder configs:\n{paths}'
    )


# macOS-only <malloc/malloc.h> (used by IntraNnip/tensor.h) does not exist in
# Emscripten. Use <malloc.h> there and map malloc_size -> malloc_usable_size.
MAC_MALLOC_INCLUDE = re.compile(
    r'^[ \t]*#[ \t]*include[ \t]*<malloc/malloc\.h>[^\n]*', re.M)
MALLOC_COMPAT = (
    '#if defined(__APPLE__)\n'
    '#include <malloc/malloc.h>\n'
    '#else\n'
    '#include <malloc.h>\n'
    '#endif\n'
    '#if defined(__EMSCRIPTEN__) && !defined(malloc_size)\n'
    '#define malloc_size(p) malloc_usable_size(p) /* ECM wasm port */\n'
    '#endif'
)


def patch_mac_malloc(src_root):
    patched = []
    for path in sorted(src_root.rglob('*')):
        if path.suffix not in {'.h', '.hpp', '.cpp', '.cc', '.inl'}:
            continue
        if not path.is_file():
            continue
        old = path.read_text(encoding='utf-8', errors='surrogateescape')
        if '<malloc/malloc.h>' not in old:
            continue
        new = MAC_MALLOC_INCLUDE.sub(lambda m: MALLOC_COMPAT, old)
        path.write_text(new, encoding='utf-8', errors='surrogateescape')
        patched.append(str(path.relative_to(SRC)))
        print('Patched mac malloc include in ' + patched[-1], flush=True)
        # diagnostics: other allocator APIs that may need a port
        for no, line in enumerate(new.splitlines(), 1):
            if re.search(r'malloc_size|malloc_good_size|posix_memalign|'
                         r'aligned_alloc|_aligned_|memalign', line):
                print(f'  {path.name}:{no}: {line.strip()}', flush=True)
    return patched


def main():
    WORK.mkdir(exist_ok=True)
    if SRC.exists():
        shutil.rmtree(SRC)
    run('git', 'clone', '--depth', '1', '--branch', REF, REMOTE, SRC)
    commit = subprocess.check_output(
        ['git', 'rev-parse', 'HEAD'], cwd=SRC, text=True
    ).strip()
    print('Source commit:', commit, flush=True)
    required = [
        'CMakeLists.txt', 'source/Lib/CommonLib/CMakeLists.txt',
        'source/Lib/CommonLib/TypeDef.h',
        'source/App/EncoderApp/CMakeLists.txt',
        'source/App/DecoderApp/CMakeLists.txt',
    ]
    for name in required:
        if not (SRC / name).is_file():
            raise RuntimeError('Required upstream file missing: ' + name)

    print('Available encoder configurations:', flush=True)
    for path in sorted((SRC / 'cfg').rglob('encoder*.cfg')):
        print('  ' + str(path.relative_to(SRC / 'cfg')), flush=True)

    # Diagnostics: where does upstream pick x86 SIMD sources/flags?
    print('x86/SIMD-related lines in CMake files:', flush=True)
    for path in sorted(SRC.rglob('CMakeLists.txt')):
        for no, line in enumerate(
                path.read_text(encoding='utf-8', errors='replace').splitlines(), 1):
            if re.search(r'x86|SSE|AVX|SIMD|arm64|SYSTEM_PROCESSOR|Werror|'
                         r'warnings-as-errors', line, re.I):
                print(f'  {path.relative_to(SRC)}:{no}: {line.strip()}',
                      flush=True)

    changed = []
    for path in SRC.rglob('CMakeLists.txt'):
        old = path.read_text(encoding='utf-8')
        new = re.sub(
            r'NOT\s*\(\s*CMAKE_SYSTEM_PROCESSOR\s+STREQUAL\s+"arm64"\s*\)',
            'NOT EMSCRIPTEN AND NOT (CMAKE_SYSTEM_PROCESSOR STREQUAL "arm64")',
            old,
        ).replace('warnings-as-errors', '')
        if old != new:
            path.write_text(new, encoding='utf-8')
            changed.append(str(path.relative_to(SRC)))

    simd_changes = []
    for path in (SRC / 'source/Lib/CommonLib').glob('*.h'):
        names = []

        def disable(match):
            names.append(match.group(1))
            return '#define ' + match.group(1) + ' 0 /* ECM wasm scalar port */'

        old = path.read_text(encoding='utf-8')
        new = re.sub(
            r'^[ \t]*#[ \t]*define[ \t]+(ENABLE_SIMD_OPT(?:_[A-Za-z0-9_]+)?)\b[^\n]*',
            disable, old, flags=re.M,
        )
        if names:
            path.write_text(new, encoding='utf-8')
            simd_changes.append({
                'file': str(path.relative_to(SRC)), 'macros': names,
            })
    if not simd_changes:
        raise RuntimeError(
            'No recognized ENABLE_SIMD_OPT macros. Inspect upstream SIMD dispatch.'
        )

    malloc_patches = patch_mac_malloc(SRC / 'source')

    choices = {
        'ai': ['encoder_intra_vtm.cfg', 'encoder_intra.cfg'],
        'ra': ['encoder_randomaccess_vtm.cfg', 'encoder_randomaccess.cfg'],
        'ld': ['encoder_lowdelay_vtm.cfg', 'encoder_lowdelay_P_vtm.cfg',
               'encoder_lowdelay.cfg'],
    }
    configs = {}
    for mode, names in choices.items():
        selected = choose_config(SRC / 'cfg', names, mode)
        configs[mode] = '/cfg/' + selected.relative_to(SRC / 'cfg').as_posix()
        print(f'Config {mode}: {configs[mode]}', flush=True)

    # INITIAL_MEMORY: the static data/bss of ECM alone is ~383 MB
    # (wasm-ld: "initial memory too small, 383413984 bytes needed"),
    # so the module must start with more than that. 512 MiB < MAXIMUM 2 GiB.
    extra = r"""
if(EMSCRIPTEN)
  foreach(app EncoderApp DecoderApp)
    set_target_properties(${app} PROPERTIES SUFFIX ".js"
      RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/wasm")
    target_link_options(${app} PRIVATE
      "-sMODULARIZE=1"
      "-sINVOKE_RUN=0"
      "-sEXPORTED_RUNTIME_METHODS=['FS','callMain']"
      "-sFORCE_FILESYSTEM=1"
      "-sALLOW_MEMORY_GROWTH=1"
      "-sINITIAL_MEMORY=536870912"
      "-sMAXIMUM_MEMORY=2147483648"
      "-sSTACK_SIZE=8388608"
      "-sEXIT_RUNTIME=0"
      "-sENVIRONMENT=web,worker,node"
      "-fexceptions")
  endforeach()
  target_link_options(EncoderApp PRIVATE "-sEXPORT_NAME=createECMEncoder"
    "--embed-file" "${CMAKE_SOURCE_DIR}/cfg@/cfg")
  target_link_options(DecoderApp PRIVATE "-sEXPORT_NAME=createECMDecoder")
endif()
"""
    with (SRC / 'CMakeLists.txt').open('a', encoding='utf-8') as file:
        file.write(extra)
    if BUILD.exists():
        shutil.rmtree(BUILD)
    # -w: silence upstream warnings (wasm32 size_t shifts etc.) so real errors
    # are visible in the log and -Werror from upstream cannot fail the build.
    run('emcmake', 'cmake', '-S', SRC, '-B', BUILD,
        '-DCMAKE_BUILD_TYPE=Release',
        '-DCMAKE_POLICY_VERSION_MINIMUM=3.5',
        '-DCMAKE_CXX_FLAGS=-O2 -fexceptions -w',
        '-DCMAKE_C_FLAGS=-O2 -w',
        '-DEXTENSION_NNLF=OFF', '-DEXTENSION_360_VIDEO=OFF',
        '-DEXTENSION_HDRTOOLS=OFF')
    build_keep_going(['EncoderApp', 'DecoderApp'])

    if DIST.exists():
        shutil.rmtree(DIST)
    ENGINE.mkdir(parents=True)
    for app in ['EncoderApp', 'DecoderApp']:
        for suffix in ['.js', '.wasm']:
            path = find_output(app + suffix)
            if path is None:
                raise RuntimeError('Missing build output: ' + app + suffix)
            print(f'Output {app}{suffix}: {path} '
                  f'({path.stat().st_size / 1048576:.1f} MiB)', flush=True)
            shutil.copy2(path, ENGINE / path.name)
    worker = (ROOT / 'tools/ecm/ecm-engine.js.in').read_text(encoding='utf-8')
    if '__ECM_CONFIGS__' not in worker:
        raise RuntimeError('Worker template lacks __ECM_CONFIGS__ placeholder')
    worker = worker.replace('__ECM_CONFIGS__', json.dumps(configs))
    (ENGINE / 'ecm-engine.js').write_text(worker, encoding='utf-8')
    (ENGINE / 'configs.json').write_text(
        json.dumps(configs, indent=2), encoding='utf-8')
    licenses = [p for p in SRC.iterdir() if p.is_file()
                and any(x in p.name.lower()
                        for x in ['copying', 'license', 'licence'])]
    if not licenses:
        raise RuntimeError(
            'Upstream license file not located; review before distributing binaries.'
        )
    for path in licenses:
        shutil.copy2(path, ENGINE / path.name)
    metadata = {
        'source': REMOTE, 'ref': REF, 'commit': commit,
        'emscripten': subprocess.check_output(
            ['emcc', '--version'], text=True).splitlines()[0],
        'cmake_patches': changed, 'simd_patches': simd_changes,
        'malloc_patches': malloc_patches,
        'configs': configs, 'status': 'compiled; smoke test must run separately',
        'threading': 'single-thread per Worker',
    }
    (ENGINE / 'build-info.json').write_text(
        json.dumps(metadata, indent=2), encoding='utf-8')
    print('Compiled files prepared. Run smoke.cjs before deploying.', flush=True)


if __name__ == '__main__':
    main()
