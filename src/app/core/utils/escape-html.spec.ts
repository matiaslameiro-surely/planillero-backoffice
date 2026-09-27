import { describe, expect, it } from 'vitest';
import { escapeHtml } from './escape-html';

describe('escapeHtml', () => {
  it('escapa caracteres especiales HTML', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
    expect(escapeHtml('<a href="https://example.com">Link & Test</a>')).toBe(
      '&lt;a href=&quot;https://example.com&quot;&gt;Link &amp; Test&lt;/a&gt;'
    );
    expect(escapeHtml("Tom's \"quote\" & <tag>")).toBe(
      'Tom&#39;s &quot;quote&quot; &amp; &lt;tag&gt;'
    );
  });

  it('preserva texto sin caracteres especiales', () => {
    expect(escapeHtml('Demora por tránsito en Ñuñoa')).toBe('Demora por tránsito en Ñuñoa');
  });

  it('maneja valores null o undefined devolviendo string vacío', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });
});
