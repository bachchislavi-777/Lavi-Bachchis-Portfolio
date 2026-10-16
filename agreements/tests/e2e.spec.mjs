// Full journeys in a real browser: Lavi in the studio, clients on their own devices.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const B = 'http://localhost:8791';
const outbox = async () => (await fetch(`${B}/__test/outbox`)).json();
const setNow = (iso) => fetch(`${B}/__test/clock`, { method: 'POST', body: JSON.stringify({ now: iso }) });
const pdfText = (file) => { try { return execFileSync('pdftotext', [file, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' '); } catch { return null; } };

function watchErrors(page) {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}
async function signIn(page) {
  await page.goto('/studio/');
  await page.getByRole('button', { name: 'Email me a sign-in code' }).click();
  await expect(page.getByText(/Code sent to/)).toBeVisible();
  const code = /code: ([A-Z2-9]{8})/.exec((await outbox()).at(-1).subject)[1];
  await page.getByLabel('Sign-in code').fill(code);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Agreements' })).toBeVisible();
}
async function noSideScroll(page) {
  const w = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(w[0], 'no horizontal scrolling').toBeLessThanOrEqual(w[1]);
}

test.beforeAll(async () => { await setNow('2026-10-16T12:30:00Z'); });

test('monthly agreement: create in studio, client signs, PDF, emails, amendment, invoice paid', async ({ browser }) => {
  const lavi = await (await browser.newContext({ viewport: { width: 1360, height: 900 } })).newPage();
  const laviErrors = watchErrors(lavi);
  await signIn(lavi);

  // Settings
  await lavi.getByRole('button', { name: 'Settings' }).click();
  await lavi.locator('#s-business-address').fill('Studio 4, 10 Example Road\nLondon N1 1AA');
  await lavi.locator('#s-payment-accountName').fill('Lavi Bachchis');
  await lavi.locator('#s-payment-sortCode').fill('04-00-04');
  await lavi.locator('#s-payment-accountNumber').fill('12345678');
  await lavi.locator('#s-payment-paypal').fill('paypal.me/lavibachchis');
  await lavi.getByRole('button', { name: 'Save settings' }).click();
  await expect(lavi.getByText('Settings saved')).toBeVisible();

  // New agreement
  await lavi.getByRole('button', { name: 'Agreements' }).click();
  await lavi.getByRole('link', { name: 'New agreement' }).click();
  await expect(lavi.getByRole('heading', { name: 'Create an agreement' })).toBeVisible();
  await lavi.locator('#cn').fill('Sam Example');
  await lavi.locator('#cc').fill('Example Studio Ltd');
  await lavi.locator('#ce').fill('sam@example.com');
  await expect(lavi.locator('#fee')).toHaveValue('720.00');
  await lavi.locator('#special').fill('- Weekly check-in call on Mondays.');
  // edit one clause for this client
  await lavi.locator('details.clause-ed', { hasText: 'Results, confidentiality and data' }).locator('summary').click();
  await lavi.locator('[data-cl="data.tools"]').fill('I do not use AI tools on this account.');
  await expect(lavi.locator('#prev')).toContainText('I do not use AI tools on this account.');
  await expect(lavi.locator('#prev')).toContainText('Weekly check-in call on Mondays.');
  await lavi.getByRole('button', { name: 'Save and get link' }).click();
  await expect(lavi.getByText('Client link')).toBeVisible();
  const link = await lavi.locator('#link').inputValue();
  expect(link).toMatch(/\/agreement\/#[\w-]+\.[\w-]+$/);
  await expect(lavi.locator('.lead .badge').first()).toHaveText('Waiting for signature');

  // Client signs on their computer
  const sam = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const samErrors = watchErrors(sam);
  await sam.goto(link.replace('http://localhost:4391', ''));
  await expect(sam.getByRole('heading', { name: 'Your agreement is ready to sign' })).toBeVisible();
  await expect(sam.locator('#doc')).toContainText('I do not use AI tools on this account.');
  await sam.getByRole('button', { name: 'Go to signing' }).click();
  await expect(sam.getByRole('heading', { name: 'Sign the agreement' })).toBeInViewport();
  await sam.getByText('For a business', { exact: true }).click();
  await expect(sam.locator('#c-company')).toHaveValue('Example Studio Ltd');
  await sam.locator('#c-role').fill('Director');
  await sam.locator('#c-address').fill('1 Sample Street\nExampletown EX1 2MP');
  await expect(sam.locator('#doc')).toContainText('Represented by Sam Example, Director');
  await sam.getByRole('button', { name: 'Sign agreement' }).click();
  await expect(sam.getByRole('alert')).toContainText('type your name');
  await sam.locator('#sig-name').fill('Sam Example');
  await sam.getByText('I have read this agreement').click();
  await sam.getByText('I agree to sign electronically').click();
  await sam.getByText('I am authorised to sign').click();
  await sam.getByRole('button', { name: 'Sign agreement' }).click();
  await expect(sam.getByRole('heading', { name: 'Signed. Thank you, Sam.' })).toBeVisible();
  await expect(sam.locator('#mail-status')).toContainText('has been emailed to you (sam@example.com)', { timeout: 30_000 });
  const [dl] = await Promise.all([sam.waitForEvent('download'), sam.getByRole('button', { name: 'Download signed copy (PDF)' }).click()]);
  expect(dl.suggestedFilename()).toBe('LB-A-2026-001 - Example Studio Ltd - signed.pdf');
  const file = await dl.path();
  expect(readFileSync(file).subarray(0, 4).toString()).toBe('%PDF');
  const text = pdfText(file);
  if (text !== null) {
    for (const s of ['Service agreement', 'LB-A-2026-001', 'Example Studio Ltd', 'Represented by Sam Example, Director', '£720.00', 'starting on the date this agreement is signed (16 October 2026)', 'Weekly check-in call on Mondays.', 'Late Payment of Commercial Debts', 'Page 1 of']) expect(text).toContain(s);
    expect(text).not.toContain('Consumer Rights Act');
    expect(text).not.toContain('{{');
  }
  const mails = (await outbox()).filter((m) => m.subject.includes('Signed'));
  expect(mails.map((m) => m.to).sort()).toEqual(['bachchis.lavi@gmail.com', 'sam@example.com']);
  expect(mails.every((m) => m.attachments.length === 1 && m.attachments[0].type === 'application/pdf')).toBeTruthy();

  // Returning visit shows the signed copy
  await sam.reload();
  await expect(sam.getByRole('heading', { name: 'Your signed agreement' })).toBeVisible();

  // Lavi amends after a call: fee up to £800
  await lavi.reload();
  await expect(lavi.locator('.lead .badge').first()).toHaveText('Active');
  await lavi.getByRole('button', { name: 'Amend agreement' }).click();
  await expect(lavi.getByRole('heading', { name: 'Amend the agreement' })).toBeVisible();
  await expect(lavi.locator('#eff')).toHaveValue('2026-11-16');
  await lavi.locator('#fee').fill('800');
  await lavi.getByRole('button', { name: 'Save and get link' }).click();
  await expect(lavi.locator('.lead .badge').first()).toHaveText('Amendment in progress');

  await sam.reload();
  await expect(sam.getByRole('heading', { name: 'Your updated agreement is ready to sign' })).toBeVisible();
  await expect(sam.locator('.amend')).toContainText('Monthly fee: £720.00 → £800.00');
  await expect(sam.locator('.amend')).toContainText('The changes apply from 16 November 2026');
  await expect(sam.getByText('Who is signing?')).toHaveCount(0); // type is fixed after the first signature
  await sam.getByRole('button', { name: 'Draw' }).click();
  const pad = sam.locator('#pad');
  const box = await pad.boundingBox();
  await sam.mouse.move(box.x + 30, box.y + 100); await sam.mouse.down();
  for (let i = 0; i < 30; i++) await sam.mouse.move(box.x + 30 + i * 9, box.y + 100 - Math.sin(i / 3) * 30);
  await sam.mouse.up();
  await sam.getByText('I have read this agreement, including the changes').click();
  await sam.getByText('I agree to sign electronically').click();
  await sam.getByText('I am authorised to sign').click();
  await sam.getByRole('button', { name: 'Sign agreement' }).click();
  await expect(sam.getByRole('heading', { name: 'Signed. Thank you, Sam.' })).toBeVisible();
  await expect(sam.locator('.sig-img')).toBeVisible();
  await expect(sam.locator('#mail-status')).toContainText('has been emailed', { timeout: 30_000 });

  // First invoice at the end of the first cycle, at the old fee
  await setNow('2026-11-15T08:05:00Z');
  await lavi.goto('/studio/#/invoices');
  await lavi.getByRole('button', { name: 'Check invoices now' }).click();
  await expect(lavi.getByText('Issued LB-INV-2026-0001')).toBeVisible();
  await lavi.locator('tr[data-inv]', { hasText: 'LB-INV-2026-0001' }).click();
  await expect(lavi.getByRole('heading', { name: 'LB-INV-2026-0001 · £720.00' })).toBeVisible();
  await expect(lavi.locator('.doc.invoice')).toContainText('Sort code');
  // client opens the invoice from the email and downloads it
  const invMail = (await outbox()).find((m) => m.subject.includes('Invoice LB-INV-2026-0001'));
  expect(invMail.to).toBe('sam@example.com');
  const html = await (await fetch(`${B}/__test/outbox?n=${invMail.n}`)).text();
  const invLink = /href="(http:\/\/localhost:4391\/invoice\/#[^"]+)"/.exec(html)[1];
  await sam.goto(invLink.replace('http://localhost:4391', ''));
  await expect(sam.getByRole('heading', { name: 'Your invoice' })).toBeVisible();
  await expect(sam.locator('.badge')).toHaveText('Due 22 Nov 2026');
  const [idl] = await Promise.all([sam.waitForEvent('download'), sam.getByRole('button', { name: 'Download PDF' }).click()]);
  const itext = pdfText(await idl.path());
  if (itext !== null) for (const s of ['Invoice', 'LB-INV-2026-0001', '£720.00', 'Example Studio Ltd', '04-00-04', 'No VAT charged']) expect(itext).toContain(s);
  // Lavi marks it paid
  await lavi.getByRole('button', { name: 'Mark as paid' }).click();
  await lavi.locator('dialog').getByRole('button', { name: 'Mark as paid' }).click();
  await expect(lavi.locator('.lead .badge')).toHaveText(/Paid on/);
  await sam.reload();
  await expect(sam.getByRole('heading', { name: 'Paid, thank you' })).toBeVisible();

  // Second cycle uses the amended fee
  await setNow('2026-12-14T08:05:00Z');
  await lavi.goto('/studio/#/invoices'); // still signed in: sessions last 30 days from last use
  await expect(lavi.getByRole('heading', { name: 'Invoices' })).toBeVisible();
  await setNow('2026-12-15T08:05:00Z');
  await lavi.getByRole('button', { name: 'Check invoices now' }).click();
  await expect(lavi.getByText('Issued LB-INV-2026-0002')).toBeVisible();
  await expect(lavi.locator('tr[data-inv]', { hasText: 'LB-INV-2026-0002' })).toContainText('£800.00');

  expect(laviErrors, 'no errors in the studio').toEqual([]);
  expect(samErrors, 'no errors on client pages').toEqual([]);
});

test('one-off project on a phone: individual signs, 50% deposit invoice, no sideways scrolling', async ({ browser }) => {
  await setNow('2027-01-05T10:00:00Z');
  const lavi = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  const errors = watchErrors(lavi);
  await signIn(lavi);
  await noSideScroll(lavi);
  await lavi.getByRole('link', { name: 'New agreement' }).click();
  await lavi.locator('#type').selectOption('project');
  await lavi.locator('#pkg').selectOption('custom');
  await lavi.locator('#pname').fill('Spring launch');
  await lavi.locator('[data-il="0"]').fill('Launch posts');
  await lavi.locator('[data-iv="0"]').fill('10');
  await lavi.locator('#fee').fill('1,500');
  await lavi.locator('#ce').fill('pat@example.org');
  await expect(lavi.locator('#prev')).toContainText('I invoice 50% (£750.00) when you sign');
  await noSideScroll(lavi);
  await lavi.getByRole('button', { name: 'Save and get link' }).click();
  const link = await lavi.locator('#link').inputValue();
  await noSideScroll(lavi);

  const pat = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  const patErrors = watchErrors(pat);
  await pat.goto(link.replace('http://localhost:4391', ''));
  await expect(pat.getByRole('heading', { name: 'Your agreement is ready to sign' })).toBeVisible();
  await noSideScroll(pat);
  await pat.getByText('As an individual', { exact: true }).click();
  await expect(pat.getByText('Your 14-day right to cancel')).toBeVisible();
  await expect(pat.locator('#doc')).toContainText('Cancellation form');
  await expect(pat.locator('#c-company')).toBeHidden();
  await pat.locator('#c-name').fill('Pat Person');
  await pat.locator('#c-address').fill('2 Home Lane, Leeds LS1 1AA');
  await pat.getByText('Please start work during the 14 days').click();
  await pat.locator('#sig-name').fill('Pat Person');
  await pat.getByText('I have read this agreement').click();
  await pat.getByText('I agree to sign electronically').click();
  await pat.getByRole('button', { name: 'Sign agreement' }).click();
  await expect(pat.getByRole('heading', { name: 'Signed. Thank you, Pat.' })).toBeVisible();
  await expect(pat.locator('#doc')).toContainText('until 19 January 2027');
  await noSideScroll(pat);

  const dep = (await outbox()).find((m) => /Invoice LB-INV-2027-0001 .*£750\.00 due 12 January 2027/.test(m.subject));
  expect(dep, 'deposit invoice emailed on signing').toBeTruthy();
  expect(dep.to).toBe('pat@example.org');
  expect(errors).toEqual([]);
  expect(patErrors).toEqual([]);
});

test('bad links and sign-in protection', async ({ page }) => {
  await page.goto('/agreement/#abcdefghijkl.abcdefghijklmnopqrstuvwxyz123456');
  await expect(page.getByRole('heading', { name: 'This link isn’t valid' })).toBeVisible();
  await page.goto('/agreement/');
  await expect(page.getByRole('heading', { name: 'This link isn’t complete' })).toBeVisible();
  await page.goto('/studio/');
  await page.evaluate(() => localStorage.setItem('lb-studio-session', 'forged-session-value-forged-session-val'));
  await page.reload();
  await expect(page.getByText('Please sign in again.')).toBeVisible();
  const robots = await page.locator('meta[name=robots]').getAttribute('content');
  expect(robots).toContain('noindex');
});
