"""Run migrations and access tests only in a new disposable local Docker database."""
import concurrent.futures
import pathlib
import subprocess
import time
import uuid

root = pathlib.Path(__file__).resolve().parent.parent
container = 'together-test-' + uuid.uuid4().hex[:10]
docker = ['docker', '--host=unix:///var/run/docker.sock']

def run(*args, sql=None, check=True):
    return subprocess.run([*docker, *args], input=sql, text=True, capture_output=True, check=check)

def query(sql, check=True):
    return run('exec', '-i', container, 'psql', '-X', '-qAt', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', sql=sql, check=check)

try:
    run('run', '--name', container, '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', '-d', 'postgres:17-alpine')
    for _ in range(60):
        if run('exec', container, 'pg_isready', '-U', 'postgres', check=False).returncode == 0:
            break
        time.sleep(0.5)
    else:
        raise RuntimeError('Disposable test database did not start')
    run('cp', str(root / 'supabase'), container + ':/tmp/together-supabase')
    run('exec', container, 'psql', '-X', '-q', '-U', 'postgres', '-f', '/tmp/together-supabase/tests/access.sql')
    query("insert into auth.users values ('00000000-0000-4000-8000-000000000005'), ('00000000-0000-4000-8000-000000000006'), ('00000000-0000-4000-8000-000000000007');")
    owner = "set role authenticated; set request.jwt.claim.sub='00000000-0000-4000-8000-000000000005'; "
    query(owner + 'select public.create_household();')
    code = query(owner + 'select public.create_household_invitation();').stdout.strip().splitlines()[-1]
    assert len(code) == 64 and all(c in '0123456789abcdef' for c in code)
    def join(person):
        return query("set role authenticated; set request.jwt.claim.sub='00000000-0000-4000-8000-00000000000" + person + "'; select public.join_household('" + code + "');", check=False)
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(join, ['6', '7']))
    assert sum(r.returncode == 0 for r in results) == 1, 'Concurrent invitation use must admit exactly one partner'
    count = query(owner + 'select count(*) from public.household_members;').stdout.strip().splitlines()[-1]
    assert count == '2', 'A household must never admit a third member'
    print('Database tests passed: two-member access, forbidden reads/writes, expiry, replacement, reuse concurrent redemption, and own-account deletion with partner-data preservation.')
except subprocess.CalledProcessError as error:
    raise RuntimeError('Disposable database test failed: ' + error.stderr) from error
finally:
    run('rm', '-f', container, check=False)
