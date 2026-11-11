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
REF = 'ECM-20.0'
REMOTE = 'https://vcgit.hhi.fraunhofer.de/ecm/ECM.git'


def run(*args, cwd=None):
    print('+', ' '.join(map(str, args)), flush=True)
    subprocess.run(list(map(str, args)), cwd=cwd, check=True)


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
    run('emcmake', 'cmake', '-S', SRC, '-B', BUILD,
        '-DCMAKE_BUILD_TYPE=Release',
        '-DCMAKE_POLICY_VERSION_MINIMUM=3.5',
        '-DCMAKE_CXX_FLAGS=-O2 -fexceptions', '-DCMAKE_C_FLAGS=-O2',
        '-DEXTENSION_NNLF=OFF', '-DEXTENSION_360_VIDEO=OFF',
        '-DEXTENSION_HDRTOOLS=OFF')
    run('cmake', '--build', BUILD, '--target', 'EncoderApp', 'DecoderApp',
        '--parallel', '2')

    if DIST.exists():
        shutil.rmtree(DIST)
    ENGINE.mkdir(parents=True)
    for app in ['EncoderApp', 'DecoderApp']:
        for suffix in ['.js', '.wasm']:
            path = BUILD / 'wasm' / (app + suffix)
            if not path.is_file():
                raise RuntimeError('Missing build output: ' + str(path))
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
        'configs': configs, 'status': 'compiled; smoke test must run separately',
        'threading': 'single-thread per Worker',
    }
    (ENGINE / 'build-info.json').write_text(
        json.dumps(metadata, indent=2), encoding='utf-8')
    print('Compiled files prepared. Run smoke.cjs before deploying.', flush=True)


if __name__ == '__main__':
    main()
