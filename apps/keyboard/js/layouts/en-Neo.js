Keyboards['en-Neo'] = {
  label: 'English - Neo',
  shortLabel: 'En',
  menuLabel: 'Neo',
  imEngine: 'latin',
  types: ['text', 'url', 'email', 'number', 'password'],
  autoCorrectLanguage: 'en_us',
  alt: {
    a: 'áàâäåãāæ',
    c: 'çćč',
    e: 'éèêëēę€ɛ',
    i: 'ïíìîīį',
    o: 'öóòôōœøɵ',
    u: 'üúùûū',
    s: 'ßśš$',
    S: 'ŚŠ$',
    n: 'ñń',
    l: 'ł£',
    y: 'ÿ¥',
    z: 'žźż',
    '.': ',?!;:'
  },
  keys: [
    [
      { value: 'x' }, { value: 'v' }, { value: 'l' } , { value: 'c' },
      { value: 'w' }, { value: 'k' }, { value: 'h' } , { value: 'g' },
      { value: 'f' }, { value: 'q' }
    ], [
      { value: 'u' }, { value: 'i', }, { value: 'a' }, { value: 'e' },
      { value: 'o' }, { value: 's', }, { value: 'n' }, { value: 'r' },
      { value: 't' }, { value: 'd', }
    ], [
      { value: '⇪', ratio: 2, keyCode: KeyEvent.DOM_VK_CAPS_LOCK },
      { value: 'p' }, { value: 'z' }, { value: 'b' },
      { value: 'm' }, { value: 'j' }, { value: 'y' },
      { value: '⌫', ratio: 2, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ],
  alternateLayout: {
    needsCommaKey: true,
    alt: {
      '0': 'º',
      '1': '1st ',
      '2': '2nd ',
      '3': '3rd ',
      '4': '4th ',
      '5': '5th ',
      '6': '6th ',
      '7': '7th ',
      '8': '8th ',
      '9': '9th ',
      '$': '€ £ ¥',
      '?': '¿',
      '!': '¡',
      '/': '\\'
    },
    keys: [
      [
        { value: ':' }, { value: '&' },
        { value: '#' }, { value: '$' }, { value: '!' },
        { value: '7' }, { value: '8' }, { value: '9' },
        { value: '/' }, { value: '*' }
      ], [
        { value: ';' }, { value: '@' },
        { value: '(' }, { value: ')' }, { value: '?' },
        { value: '4' }, { value: '5' }, { value: '6' },
        { value: '+' }, { value: '-' }
      ], [
        { value: 'Alt', ratio: 2, keyCode: KeyEvent.DOM_VK_ALT },
        { value: '%' }, { value: '"' }, { value: "'" },
        { value: '1' }, { value: '2' }, { value: '3' },
        { value: '⌫', ratio: 2, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
      ], [
        { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
        { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
      ]
    ]
  },
  symbolLayout: {
    needsCommaKey: true,
    keys: [
      [
        { value: '§' }, { value: '_' }, { value: '[' }, { value: ']' },
        { value: '^' }, { value: '<' }, { value: '>' }, { value: '=' },
        { value: '¥' }, { value: '€' }
      ], [
        { value: '©' }, { value: '®' }, { value: '{' }, { value: '}' },
        { value: '`' }, { value: '«' }, { value: '»' }, { value: '±' },
        { value: '£' }, { value: '$' }
      ],
      [
        { value: 'Alt', ratio: 2, keyCode: KeyEvent.DOM_VK_ALT },
        { value: '|' }, { value: '~' }, { value: 'º' },
        { value: '¹' }, { value: '²' }, { value: '³' },
        { value: '⌫', ratio: 2, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
      ], [
        { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
        { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
      ]
    ]
  }
};
