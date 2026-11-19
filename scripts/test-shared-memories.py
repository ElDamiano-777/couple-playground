"""Test shared memory privacy in disposable PostgreSQL only; never connect to hosted data."""
import pathlib
import subprocess
import time
import uuid

root = pathlib.Path(__file__).resolve().parent.parent
container = 'together-memories-test-' + uuid.uuid4().hex[:10]
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
        raise RuntimeError('Disposable memory database did not start')
    run('cp', str(root / 'supabase'), container + ':/tmp/together-supabase')
    run('exec', container, 'psql', '-X', '-q', '-U', 'postgres', '-f', '/tmp/together-supabase/tests/shared-memories.sql')
    print('Shared memory database tests passed: partner access, photo retention, conflicting edits, validation and household isolation.')
except subprocess.CalledProcessError as error:
    raise RuntimeError('Disposable memory database test failed: ' + error.stderr) from error
finally:
    run('rm', '-f', '-v', container, check=False)
