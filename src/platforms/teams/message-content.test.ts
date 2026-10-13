import { describe, expect, it } from 'bun:test'

import { parseTeamsContent, teamsHtmlToText } from './message-content'

const AMS_IMAGE_URL = 'https://kr-prod.asyncgw.teams.microsoft.com/v1/objects/0-skr-d1-abc/views/imgo'
const ATTACHMENT_URL = 'https://contoso-my.sharepoint.com/personal/alice/Documents/report.pdf'

describe('parseTeamsContent', () => {
  it('keeps the raw html and lists inline images for rich messages', () => {
    const html = `<p>Look at this</p><p><img src="${AMS_IMAGE_URL}" itemtype="http://schema.skype.com/AMSImage" alt="image"></p><p>Thoughts?</p>`

    const parsed = parseTeamsContent(html, { messagetype: 'RichText/Html' })

    expect(parsed).toEqual({
      content: 'Look at this\n\nThoughts?',
      html,
      files: [AMS_IMAGE_URL],
    })
  })

  it('omits html and files for plain text messages', () => {
    const parsed = parseTeamsContent('Tom &amp; Jerry', { messagetype: 'Text' })

    expect(parsed).toEqual({ content: 'Tom & Jerry', html: undefined, files: undefined })
  })

  it('lists inline images before attachments from properties.files', () => {
    const properties = {
      files: JSON.stringify([{ '@type': 'http://schema.skype.com/File', objectUrl: ATTACHMENT_URL }]),
    }
    const html = `<p>See <img src="${AMS_IMAGE_URL}" itemtype="http://schema.skype.com/AMSImage"></p>`

    const parsed = parseTeamsContent(html, { messagetype: 'RichText/Html', properties })

    expect(parsed.files).toEqual([AMS_IMAGE_URL, ATTACHMENT_URL])
  })

  it('falls back to fileInfo.fileUrl when an attachment has no objectUrl', () => {
    const properties = { files: [{ fileInfo: { fileUrl: ATTACHMENT_URL } }] }

    const parsed = parseTeamsContent('<p>report</p>', { messagetype: 'RichText/Html', properties })

    expect(parsed.files).toEqual([ATTACHMENT_URL])
  })

  it('reads attachments when properties itself arrives as a JSON string', () => {
    const properties = JSON.stringify({ files: JSON.stringify([{ objectUrl: ATTACHMENT_URL }]) })

    const parsed = parseTeamsContent('<p>report</p>', { messagetype: 'RichText/Html', properties })

    expect(parsed.files).toEqual([ATTACHMENT_URL])
  })

  it('ignores malformed properties.files', () => {
    const parsed = parseTeamsContent('<p>hi</p>', { messagetype: 'RichText/Html', properties: { files: '{not json' } })

    expect(parsed.files).toBeUndefined()
  })

  it('does not treat emoji, stickers, or GIFs as files', () => {
    const html =
      '<p>hi <img itemtype="http://schema.skype.com/Emoji" src="https://statics.teams.cdn.office.net/emoji.png" alt="🙇"></p>' +
      '<img itemtype="http://schema.skype.com/Sticker" src="https://statics.teams.cdn.office.net/sticker.png">' +
      '<img src="https://media1.giphy.com/media/dog.gif" alt="Happy Dog GIF">'

    const parsed = parseTeamsContent(html, { messagetype: 'RichText/Html' })

    expect(parsed.files).toBeUndefined()
    expect(parsed.content).toBe('hi 🙇')
  })

  it('treats channel content without a messagetype as html only when it has tags', () => {
    expect(parseTeamsContent('<p>a &lt; b</p>')).toEqual({
      content: 'a < b',
      html: '<p>a &lt; b</p>',
      files: undefined,
    })
    expect(parseTeamsContent('a &lt; b')).toEqual({ content: 'a &lt; b', html: undefined, files: undefined })
  })

  it('returns empty content for a missing body', () => {
    expect(parseTeamsContent(undefined, { messagetype: 'RichText/Html' }).content).toBe('')
  })
})

describe('teamsHtmlToText', () => {
  it('turns block elements and line breaks into newlines', () => {
    expect(teamsHtmlToText('<p>one<br>two</p>\r\n<p>&nbsp;</p>\r\n<div>three</div>')).toBe('one\ntwo\n\nthree')
  })

  it('treats source newlines as whitespace, like a browser', () => {
    expect(
      teamsHtmlToText(
        '<p>title<br>\r\n<a href="https://example.com">https://example.com</a><br>\r\nbody\r\ncontinues</p>',
      ),
    ).toBe('title\nhttps://example.com\nbody continues')
  })

  it('decodes named and numeric entities once', () => {
    expect(teamsHtmlToText('<p>&#51004;로 &#x1F600; &quot;q&quot; &amp;lt;</p>')).toBe('으로 😀 "q" &lt;')
  })

  it('decodes common typographic named entities', () => {
    expect(teamsHtmlToText('<p>&copy; 2026 &mdash; &ldquo;ok&rdquo;&hellip;</p>')).toBe('© 2026 — “ok”…')
  })

  it('keeps link targets that differ from the link text', () => {
    expect(teamsHtmlToText('<a href="https://example.com/a?x=1&amp;y=2">Docs &amp; more</a>')).toBe(
      'Docs & more (https://example.com/a?x=1&y=2)',
    )
  })

  it('does not repeat a link target that matches the link text', () => {
    expect(teamsHtmlToText('<a href="https://example.com">https://example.com</a>')).toBe('https://example.com')
    expect(teamsHtmlToText('<a href="mailto:alice@example.com">alice@example.com</a>')).toBe('alice@example.com')
  })

  it('preserves whitespace inside pre blocks', () => {
    expect(teamsHtmlToText('<p>code:</p><pre><code>{\n  "a": 1\n}</code></pre><p>done</p>')).toBe(
      'code:\n\n{\n  "a": 1\n}\n\ndone',
    )
  })

  it('leaves blank lines and leading spaces inside pre blocks untouched', () => {
    expect(teamsHtmlToText('<pre>  indented\n\n\n\nafter gap  </pre>')).toBe('  indented\n\n\n\nafter gap  ')
  })

  it('collapses runs of spaces within a line', () => {
    expect(teamsHtmlToText('<p>a    b\t c</p>')).toBe('a b c')
  })
})
