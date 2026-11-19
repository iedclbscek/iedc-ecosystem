import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCustomWidgetDocument, safeWidgetUrl, embedWidgetUrl } from './customWidgetDocument.js';
test('custom document puts a restrictive policy before user content and keeps code inside data strings', () => {
  const doc = buildCustomWidgetDocument({html:'<p>Hello</p><script>fetch("/secret")</script>',css:'</style><script>bad()</script>',javascript:'</script><img src=x onerror=bad()>'});
  assert.ok(doc.indexOf('Content-Security-Policy') < doc.indexOf('Hello'));
  assert.match(doc, /connect-src &#39;none&#39;/);
  assert.match(doc, /form-action &#39;none&#39;/);
  assert.doesNotMatch(doc, /<img src=x onerror=bad\(\)>/);
  assert.match(doc, /worker-src &#39;none&#39;/);
});
test('links reject executable and protocol-relative URLs; embed URLs are constructed from approved providers',()=>{
  assert.equal(safeWidgetUrl('javascript:alert(1)'), '');
  assert.equal(safeWidgetUrl('//evil.test'), '');
  assert.equal(safeWidgetUrl('https://example.com'), 'https://example.com');
  assert.equal(embedWidgetUrl('https://evil.test/video'), '');
  assert.equal(embedWidgetUrl('https://youtu.be/abcdefghijk'), 'https://www.youtube-nocookie.com/embed/abcdefghijk');
});
