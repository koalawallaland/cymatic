import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {cleanEmail, joinWaitlist} from '../shop/waitlist.js';

const db = new PGlite();
await db.exec('create role anon; create role authenticated; create role service_role;');
await db.exec(await readFile(new URL('../supabase/migrations/202611130001_shop_waitlist.sql', import.meta.url), 'utf8'));
const asAnon = async (sql, params = []) => {
  await db.exec('set role anon');
  try { return await db.query(sql, params); } finally { await db.exec('reset role'); }
};

test('emails are trimmed, lowercased and rejected when malformed', () => {
  assert.equal(cleanEmail('  Katie@Example.COM '), 'katie@example.com');
  for (const bad of ['', 'nope', 'a@b', 'two words@example.com', 'x@y.z'.padStart(260, 'a')]) assert.equal(cleanEmail(bad), null);
});

test('the public role can join the list and cannot read, change or empty it', async () => {
  await asAnon("insert into public.shop_waitlist(email, source) values ($1, 'shop')", ['first@example.com']);
  await assert.rejects(asAnon('select email from public.shop_waitlist'), /permission denied/);
  await assert.rejects(asAnon("update public.shop_waitlist set email = 'x@example.com'"), /permission denied/);
  await assert.rejects(asAnon('delete from public.shop_waitlist'), /permission denied/);
  await assert.rejects(asAnon("insert into public.shop_waitlist(email) values ('first@example.com')"), /duplicate key/);
  await assert.rejects(asAnon("insert into public.shop_waitlist(email) values ('Loud@Example.com')"), /check constraint/);
  await assert.rejects(asAnon("insert into public.shop_waitlist(email) values ('not-an-email')"), /check constraint/);
  await assert.rejects(asAnon("insert into public.shop_waitlist(email, created_at) values ('later@example.com', now())"), /permission denied/);
  assert.equal((await db.query('select count(*)::int as n from public.shop_waitlist')).rows[0].n, 1);
});

test('joining posts one cleaned address and treats a repeat as success', async () => {
  const calls = [];
  const config = {supabaseUrl: 'https://project.example', publishableKey: 'public-key'};
  const fetcher = status => async (url, options) => { calls.push({url, options}); return new Response(null, {status}); };
  assert.deepEqual(await joinWaitlist(' Me@Example.com ', {config, fetcher: fetcher(201)}), {ok: true});
  assert.equal(calls[0].url, 'https://project.example/rest/v1/shop_waitlist');
  assert.equal(calls[0].options.headers.apikey, 'public-key');
  assert.deepEqual(JSON.parse(calls[0].options.body), {email: 'me@example.com', source: 'shop'});
  assert.deepEqual(await joinWaitlist('me@example.com', {config, fetcher: fetcher(409)}), {ok: true});
});

test('failures are reported and never claimed as saved', async () => {
  const config = {supabaseUrl: 'https://project.example', publishableKey: 'public-key'};
  let called = false;
  assert.deepEqual(await joinWaitlist('nope', {config, fetcher: async () => { called = true; }}), {ok: false, reason: 'invalid'});
  assert.equal(called, false);
  assert.deepEqual(await joinWaitlist('me@example.com', {config, fetcher: async () => new Response(null, {status: 404})}), {ok: false, reason: 'unavailable'});
  assert.deepEqual(await joinWaitlist('me@example.com', {config, fetcher: async () => { throw Error('offline'); }}), {ok: false, reason: 'unavailable'});
  assert.deepEqual(await joinWaitlist('me@example.com', {config: {}, fetcher: async () => new Response(null, {status: 201})}), {ok: false, reason: 'unavailable'});
});

test('every page links the shared layer and has a way back to the desk', async () => {
  const pages = (await readdir(new URL('..', import.meta.url), {recursive: true}))
    .filter(file => file.endsWith('.html') && !file.includes('node_modules'));
  assert.ok(pages.length >= 33);
  for (const page of pages) {
    const html = await readFile(new URL(`../${page}`, import.meta.url), 'utf8');
    const up = '../'.repeat(page.split('/').length - 1);
    assert.ok(html.includes(`href="${up}kwl-assets/kwl-shared.css"`), `${page} is missing the shared stylesheet`);
    assert.equal(html.split('kwl-assets/kwl-shared.css').length, 2, `${page} links the shared stylesheet more than once`);
    assert.ok(/href="[^"]*home\.html"/.test(html), `${page} has no link back to the desk`);
    assert.ok(html.includes('og:image'), `${page} has no share preview image`);
  }
});
