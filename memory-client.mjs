// Dosya tabanlı hafıza istemcisi. localStorage veri kaynağı değildir.
const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
const readUrl = isLocal ? '/api/memory' : new URL('memory-snapshot.json', import.meta.url).href;
let memory = null;
let loading = null;
let writes = Promise.resolve();
let conflictEpoch = 0;
const subscribers = new Set();

function clientError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

async function readJson(response) {
  try { return await response.json(); }
  catch { throw clientError('Hafıza sunucusu geçerli bir JSON yanıtı vermedi.', 'MEMORY_INVALID_RESPONSE'); }
}

function publish(value) {
  if (!value || !Array.isArray(value.inventory?.items) ||
      !Array.isArray(value.sessions?.sessions) ||
      !value.sessions?.preferences || typeof value.sessions.preferences !== 'object' ||
      value.inventory.revision == null || value.sessions.revision == null ||
      typeof value.writable !== 'boolean') {
    throw clientError('Hafıza dosyasının yapısı geçersiz. Veri değiştirilmedi.', 'MEMORY_INVALID_RESPONSE');
  }
  // Yayın arşivindeki hatalı bir bayrak buluta yazma yetkisi veremez.
  memory = isLocal ? value : {...value, writable: false};
  for (const subscriber of subscribers) {
    try { subscriber(memory); }
    catch { /* Bir görünüm hatası diğer abonelerin güncellenmesini engellemez. */ }
  }
  return memory;
}

async function readRemote() {
  let response;
  try { response = await fetch(readUrl, {cache: 'no-store', credentials: 'same-origin'}); }
  catch { throw clientError('Hafıza yüklenemedi. Yerel sunucuyu veya internet bağlantısını kontrol edin.', 'MEMORY_UNAVAILABLE'); }
  const value = await readJson(response);
  if (!response.ok) {
    throw clientError(value.error || 'Hafıza dosyaları okunamadı.', 'MEMORY_READ_FAILED');
  }
  return publish(value);
}

/** İlk ve eşzamanlı okumaları aynı istekte birleştirir; başarısız okuma yeniden denenebilir. */
export function loadMemory() {
  if (!loading) {
    loading = readRemote().catch(error => { loading = null; throw error; });
  }
  return loading;
}

/** loadMemory tamamlanmadan null döner. Dönen durumu doğrudan değiştirmeyin. */
export function getMemory() { return memory; }

/** Durum yüklenmişse abone ilk bildirimi hemen alır. */
export function subscribeMemory(fn) {
  if (typeof fn !== 'function') throw new TypeError('Hafıza aboneliği için bir işlev gerekli.');
  subscribers.add(fn);
  if (memory) {
    try { fn(memory); }
    catch { /* Abone, sonraki güncellemeleri almaya devam eder. */ }
  }
  return () => subscribers.delete(fn);
}

function enqueue(operation) {
  const epoch = conflictEpoch;
  const result = writes.then(() => {
    if (epoch !== conflictEpoch) {
      throw clientError('Başka bir oturumdaki değişiklik nedeniyle bekleyen kayıt uygulanmadı. Güncel verileri kontrol edip yeniden uygulayın.', 'MEMORY_CONFLICT');
    }
    return operation();
  });
  // Bir başarısız yazı sıradaki bağımsız işlemleri bloke etmez.
  writes = result.catch(() => {});
  return result;
}

async function tokenForWrite() {
  let response;
  try { response = await fetch('/api/status', {cache: 'no-store', credentials: 'same-origin'}); }
  catch { throw clientError('Yerel sunucuya ulaşılamıyor. Hafıza kaydedilmedi.', 'MEMORY_UNAVAILABLE'); }
  const status = await readJson(response);
  if (!response.ok || typeof status.token !== 'string' || !status.token) {
    throw clientError('Yerel oturum doğrulanamadı. Sayfayı yenileyin.', 'MEMORY_AUTH_FAILED');
  }
  // Hafıza yazımı Codex girişine veya modelin hazır olmasına bağlı değildir.
  return status.token;
}

async function write(path, section, payload, expectedRevision) {
  await loadMemory();
  if (!isLocal || !memory.writable) {
    throw clientError('Canlı sitedeki hafıza salt okunurdur. Değişiklik yapmak için yerel SifaBul sürümünü açın.', 'MEMORY_READ_ONLY');
  }
  const token = await tokenForWrite();
  let response;
  try {
    response = await fetch(path, {
      method: 'POST', credentials: 'same-origin', cache: 'no-store',
      headers: {'Content-Type': 'application/json', 'X-SifaBul-Token': token},
      body: JSON.stringify({...payload, revision: expectedRevision ?? memory[section].revision})
    });
  } catch {
    throw clientError('Hafıza kaydının sonucu doğrulanamadı. Sayfayı yenileyip durumu kontrol edin; işlem otomatik tekrarlanmadı.', 'MEMORY_WRITE_UNCERTAIN');
  }
  if (response.status === 409) {
    let refreshed = true;
    try {
      const state = await readRemote();
      loading = Promise.resolve(state);
    } catch { refreshed = false; }
    // Eski durumla sıraya alınmış tam görüşme listeleri yeni veriyi ezemez.
    conflictEpoch++;
    throw clientError(refreshed
      ? 'Hafıza başka bir sekmede veya oturumda değişti. Güncel veriler yüklendi; değişikliğinizi kontrol edip yeniden uygulayın.'
      : 'Hafıza başka bir sekmede veya oturumda değişti. Güncel veriler alınamadı; sayfayı yenileyin. Değişikliğiniz uygulanmadı.',
    'MEMORY_CONFLICT');
  }
  const value = await readJson(response);
  if (!response.ok) {
    throw clientError(value.error || 'Hafıza kaydedilemedi. Değişiklik sunucu tarafından kabul edilmedi.', 'MEMORY_WRITE_FAILED');
  }
  const state = publish(value);
  loading = Promise.resolve(state);
  return state;
}

function snapshot(value) {
  // Kuyruktaki bir isteğin içeriği, çağıranın sonraki yerel değişikliklerinden etkilenmez.
  return JSON.parse(JSON.stringify(value));
}

export function updateInventory(id, patch, action, expectedRevision) {
  const payload = snapshot({id, patch, ...(action === undefined ? {} : {action})});
  return enqueue(() => write('/api/memory/inventory', 'inventory', payload, expectedRevision));
}

export function saveSessions(sessions, preferences, expectedRevision) {
  const payload = snapshot({sessions, preferences});
  return enqueue(() => write('/api/memory/sessions', 'sessions', payload, expectedRevision));
}
