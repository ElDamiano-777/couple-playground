"""Verify seeded POC logins with disposable PostgreSQL and the hosted GoTrue version.

TOGETHER_POC_TEST_PASSWORD is passed locally, never saved to source or printed.
"""
import json
import os
import pathlib
import subprocess
import time
import urllib.error
import urllib.request
import uuid

password = os.environ.get('TOGETHER_POC_TEST_PASSWORD')
if not password:
    raise SystemExit('Set TOGETHER_POC_TEST_PASSWORD for the disposable login check.')
root = pathlib.Path(__file__).resolve().parent.parent
prefix = 'together-auth-test-' + uuid.uuid4().hex[:8]
docker = ['docker', '--host=unix:///var/run/docker.sock']
db, auth, network = prefix + '-db', prefix + '-auth', prefix + '-net'

def run(*args, sql=None, check=True):
    return subprocess.run([*docker, *args], input=sql, text=True, capture_output=True, check=check)

def query(sql, role=None, user=None, check=True):
    if role:
        sql = "set role authenticated; set request.jwt.claim.sub='" + user + "'; " + sql
    return run('exec', '-i', db, 'psql', '-X', '-qAt', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', sql=sql, check=check)

try:
    run('network', 'create', network)
    run('run', '--name', db, '--network', network, '--network-alias', 'test-db', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', '-d', 'postgres:17-alpine')
    for _ in range(60):
        if run('exec', db, 'pg_isready', '-U', 'postgres', check=False).returncode == 0:
            break
        time.sleep(.5)
    query('create schema auth;')
    run('run', '--name', auth, '--network', network, '-p', '127.0.0.1::9999',
        '-e', 'GOTRUE_DB_DRIVER=postgres', '-e', 'GOTRUE_DB_DATABASE_URL=postgresql://postgres@test-db:5432/postgres?search_path=auth',
        '-e', 'GOTRUE_SITE_URL=http://localhost:9999', '-e', 'API_EXTERNAL_URL=http://localhost:9999',
        '-e', 'GOTRUE_API_HOST=0.0.0.0', '-e', 'GOTRUE_API_PORT=9999',
        '-e', 'GOTRUE_JWT_SECRET=isolated-test-jwt-secret-not-used-by-the-live-project',
        '-e', 'GOTRUE_JWT_AUD=authenticated', '-e', 'GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated',
        '-e', 'GOTRUE_EXTERNAL_EMAIL_ENABLED=true', '-e', 'GOTRUE_DISABLE_SIGNUP=true', '-d', 'supabase/gotrue:v2.197.0')
    port = run('port', auth, '9999').stdout.strip().split(':')[-1]
    base = 'http://127.0.0.1:' + port
    def request(path, payload=None, token=None, method=None):
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = 'Bearer ' + token
        data = json.dumps(payload).encode() if payload is not None else None
        try:
            with urllib.request.urlopen(urllib.request.Request(base + path, data=data, headers=headers, method=method), timeout=10) as response:
                return response.status, json.load(response)
        except urllib.error.HTTPError as error:
            return error.code, json.loads(error.read())
    for _ in range(60):
        try:
            if request('/health')[0] == 200:
                break
        except (OSError, ValueError):
            pass
        time.sleep(.5)
    else:
        raise RuntimeError('Disposable Auth server did not start')
    query("create role anon; create role authenticated; grant usage on schema public,auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;")
    for migration in sorted((root / 'supabase/migrations').glob('*.sql')):
        query(migration.read_text())
    sessions = []
    for name in ['masha', 'damian']:
        status, session = request('/token?grant_type=password', {'email': name + '@poc.together.invalid', 'password': password})
        assert status == 200 and session['user']['app_metadata']['together_poc'], 'Seeded login did not authenticate'
        sessions.append(session)
    status, _ = request('/token?grant_type=password', {'email': 'masha@poc.together.invalid', 'password': 'synthetic-wrong-password'})
    assert status == 400, 'Wrong password must fail'
    home = 'd0000000-0000-4000-8000-000000000003'
    for session in sessions:
        assert query('select public.current_household();', 'authenticated', session['user']['id']).stdout.strip() == home
    query("insert into public.shopping_items(household_id,name) values ('" + home + "','Synthetic POC access check');", 'authenticated', sessions[0]['user']['id'])
    assert query('select count(*) from public.shopping_items;', 'authenticated', sessions[1]['user']['id']).stdout.strip() == '1'
    private = '00000000-0000-4000-8000-000000000099'
    query("insert into auth.users(id) values ('" + private + "');")
    query("select public.create_household(); insert into public.shopping_items(household_id,name) values (public.current_household(),'Synthetic private item');", 'authenticated', private)
    assert query('select count(*) from public.shopping_items;', 'authenticated', sessions[0]['user']['id']).stdout.strip() == '1', 'POC account leaked a personal household'
    assert query('select count(*) from public.shopping_items;', 'authenticated', private).stdout.strip() == '1', 'Personal account leaked the POC household'
    status, _ = request('/user', {'password': 'synthetic-unauthorized-password-change'}, sessions[0]['access_token'], 'PUT')
    assert status >= 400, 'POC credentials must not be changeable by a logged-in tester'
    result = query('select public.delete_my_account();', 'authenticated', sessions[0]['user']['id'], check=False)
    assert result.returncode != 0, 'POC accounts must not be deletable by a tester'
    status, _ = request('/token?grant_type=refresh_token', {'refresh_token': sessions[0]['refresh_token']})
    assert status == 200, 'Session renewal must remain available'
    print('POC Auth checks passed: both username accounts, correct/wrong password, session renewal, shared membership, private-household isolation and immutable POC accounts.')
except subprocess.CalledProcessError as error:
    raise RuntimeError('Disposable Auth database setup failed: ' + error.stderr) from error
finally:
    run('rm', '-f', '-v', auth, check=False)
    run('rm', '-f', '-v', db, check=False)
    run('network', 'rm', network, check=False)
