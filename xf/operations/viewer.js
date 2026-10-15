/* Only encrypted content is hosted. The key is read from the URL fragment,
   which browsers do not include in HTTP requests. Nothing is persisted. */
const gate = document.getElementById('gate');
const frame = document.getElementById('map');
const status = document.getElementById('status');
const form = document.getElementById('unlock-form');
const input = document.getElementById('access-key');
const button = form.querySelector('button');
let frameUrl = null;
let attempt = 0;

function readKey(value) {
  const text = value.trim();
  if (text.includes('://')) return new URLSearchParams(new URL(text).hash.slice(1)).get('key') || '';
  return text;
}

async function openMap(encodedKey) {
  const current = ++attempt;
  gate.hidden = false;
  frame.hidden = true;
  status.className = '';
  status.textContent = 'Opening the map…';
  button.disabled = true;
  try {
    if (!/^[A-Za-z0-9_-]{43}$/.test(encodedKey)) throw new Error('key');
    const keyBytes = Uint8Array.from(atob(encodedKey.replace(/-/g, '+').replace(/_/g, '/') + '='), x => x.charCodeAt(0));
    const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt']);
    const response = await fetch('./map.encrypted', {credentials: 'omit', referrerPolicy: 'no-referrer'});
    if (!response.ok) throw new Error('download');
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (new TextDecoder().decode(bytes.subarray(0, 8)) !== 'ROMAP001') throw new Error('format');
    const plaintext = await crypto.subtle.decrypt({
      name: 'AES-GCM', iv: bytes.subarray(8, 20),
      additionalData: new TextEncoder().encode('robotics-operations-map/v1'), tagLength: 128
    }, key, bytes.subarray(20));
    if (current !== attempt) return;
    if (frameUrl) URL.revokeObjectURL(frameUrl);
    frameUrl = URL.createObjectURL(new Blob([plaintext], {type: 'text/html;charset=utf-8'}));
    frame.onload = () => {
      if (current !== attempt) return;
      gate.hidden = true;
      frame.hidden = false;
      input.value = '';
    };
    frame.src = frameUrl;
  } catch (error) {
    if (current !== attempt) return;
    status.className = 'error';
    status.textContent = error.message === 'download'
      ? 'The map could not be downloaded. Please try again.'
      : 'This link could not unlock the map. Check that you copied the complete private link.';
  } finally {
    if (current === attempt) button.disabled = false;
  }
}

form.addEventListener('submit', event => {
  event.preventDefault();
  try {
    const key = readKey(input.value);
    if (!/^[A-Za-z0-9_-]{43}$/.test(key)) throw new Error('key');
    history.replaceState(null, '', '#key=' + key);
    openMap(key);
  } catch {
    status.className = 'error';
    status.textContent = 'Enter the access key or the complete private link.';
  }
});

function openFromFragment() {
  const key = new URLSearchParams(location.hash.slice(1)).get('key');
  if (key) openMap(key);
}
window.addEventListener('hashchange', openFromFragment);
openFromFragment();
