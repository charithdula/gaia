Keyboards.nb = {
  label: 'Norwegian Bokmal',
  shortLabel: 'Nb',
  menuLabel: 'Norsk',
  imEngine: 'latin',
  autoCorrectLanguage: 'nb',
  types: ['text', 'url', 'email', 'number', 'password'],
  alt: {
    a: 'äáàâąã',
    e: 'éèêëę€',
    i: 'íìîï',
    o: 'öóòôõ',
    u: 'üúùûū',
    s: 'śšşß',
    S: 'ŚŠŞ',
    n: 'ńñň',
    c: 'çćč',
    d: 'ðď',
    r: 'ř',
    t: 'ťþ',
    z: 'źžż',
    l: 'ł',
    v: 'w',
    'æ': 'œ'
  },
  width: 11,
  keys: [
    [
      { value: 'q' },{ value: 'w' },{ value: 'e' },{ value: 'r' },
      { value: 't' },{ value: 'y' },{ value: 'u' },{ value: 'i' },
      { value: 'o' },{ value: 'p' },{ value: 'å' }
    ], [
      { value: 'a' },{ value: 's' },{ value: 'd' },{ value: 'f' },
      { value: 'g' },{ value: 'h' },{ value: 'j' },{ value: 'k' },
      { value: 'l' },{ value: 'ø' },{ value: 'æ' }
    ], [
      { value: '⇪', ratio: 2, keyCode: KeyEvent.DOM_VK_CAPS_LOCK },
      { value: 'z' },{ value: 'x' },{ value: 'c' },{ value: 'v' },
      { value: 'b' },{ value: 'n' },{ value: 'm' },
      { value: '⌫', ratio: 2, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '&nbsp', ratio: 9, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ]
};
