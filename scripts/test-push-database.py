"""Exercise push migrations in disposable PostgreSQL only; never contact the hosted project."""
import pathlib
import concurrent.futures
import subprocess
import time
import uuid

root = pathlib.Path(__file__).resolve().parent.parent
container = 'together-push-test-' + uuid.uuid4().hex[:10]
docker = ['docker', '--host=unix:///var/run/docker.sock']


def run(*args, check=True):
    return subprocess.run([*docker, *args], text=True, capture_output=True, check=check)


def query(sql):
    return run('exec', container, 'psql', '-X', '-qAt', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', sql).stdout.strip().splitlines()


try:
    run('run', '--name', container, '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', '-d', 'postgres:17-alpine')
    for _ in range(60):
        if run('exec', container, 'sh', '-c', 'test "$(cat /proc/1/comm)" = postgres && pg_isready -U postgres', check=False).returncode == 0:
            break
        time.sleep(0.5)
    else:
        raise RuntimeError('Disposable push database did not start')
    run('cp', str(root / 'supabase'), container + ':/tmp/together-supabase')
    run('exec', container, 'psql', '-X', '-q', '-U', 'postgres', '-f', '/tmp/together-supabase/tests/push.sql')
    query("delete from together_private.push_jobs; set role authenticated; set request.jwt.claim.sub='10000000-0000-4000-8000-000000000001'; insert into public.shopping_items(household_id, name) select public.current_household(), 'Concurrent synthetic' from generate_series(1, 4);")
    def claim(_):
        return set(query('set role service_role; select id from public.claim_push_jobs();'))
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        batches = list(pool.map(claim, range(2)))
    assert not batches[0].intersection(batches[1]), 'Concurrent workers must never share a lease'
    assert len(batches[0] | batches[1]) == 12, 'Both workers must claim all 12 fresh deliveries'
    assert max(map(len, batches)) <= 10, 'Worker batch must stay bounded'
    print('Push database tests passed: access isolation, device cap, future events only, other-member delivery, concurrent leases, revocation, bounded retries and expiry.')
except subprocess.CalledProcessError as error:
    raise RuntimeError('Disposable push database test failed: ' + error.stderr) from error
finally:
    run('rm', '-f', '-v', container, check=False)
