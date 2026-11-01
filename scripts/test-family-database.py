"""Run family-profile access tests in disposable PostgreSQL, never the hosted project."""
import pathlib
import subprocess
import time
import uuid

root = pathlib.Path(__file__).resolve().parent.parent
container = 'together-family-test-' + uuid.uuid4().hex[:10]
docker = ['docker', '--host=unix:///var/run/docker.sock']


def run(*args, check=True):
    return subprocess.run([*docker, *args], text=True, capture_output=True, check=check)


try:
    run('run', '--name', container, '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', '-d', 'postgres:17-alpine')
    for _ in range(60):
        if run('exec', container, 'sh', '-c', 'test "$(cat /proc/1/comm)" = postgres && pg_isready -U postgres', check=False).returncode == 0:
            break
        time.sleep(0.5)
    else:
        raise RuntimeError('Disposable family database did not start')
    run('cp', str(root / 'supabase'), container + ':/tmp/together-supabase')
    run('exec', container, 'psql', '-X', '-q', '-U', 'postgres', '-f', '/tmp/together-supabase/tests/family.sql')
    print('Family database tests passed: partner CRUD, invalid fields, foreign/anonymous isolation, immutable identity/kind, creator deletion and household cleanup.')
except subprocess.CalledProcessError as error:
    raise RuntimeError('Disposable family database test failed: ' + error.stderr) from error
finally:
    run('rm', '-f', '-v', container, check=False)
