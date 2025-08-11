export class Localization {
  constructor() {
    this.currentLanguage = 'ja'; // デフォルト言語
    this.texts = {};
  }

  init(localizationData) {
    if (localizationData) {
      this.texts = localizationData;
    } else {
      console.error('No localization data provided');
      // フォールバック用の最小限のテキストは空でいいです
      this.texts = {};
    }
  }

  async loadLocalization() {
    try {
      const response = await fetch('./data/localization.json');
      this.texts = await response.json();
    } catch (error) {
      console.error('Failed to load localization data:', error);
      // フォールバック用の最小限のテキストは空でいいです
      this.texts = {};
    }
  }

  setLanguage(language) {
    if (this.texts[language]) {
      this.currentLanguage = language;
    } else {
      console.warn(`Language '${language}' not found, using default`);
    }
  }

  getText(path) {
    const keys = path.split('.');
    let current = this.texts[this.currentLanguage];

    for (const key of keys) {
      if (current && current[key]) {
        current = current[key];
      } else {
        console.warn(`Localization key not found: ${path}`);
        return `[${path}]`; // Show missing key for easier debugging
      }
    }

    return current;
  }

  // よく使われるテキストのショートカットメソッド
  getUI(key) {
    return this.getText(`ui.${key}`);
  }

  getEquipment(key) {
    return this.getText(`equipment.${key}`);
  }

  getStats(key) {
    return this.getText(`stats.${key}`);
  }
}

// グローバルインスタンス (シングルトンパターン)
// この設計により、どこからでも同じインスタンスにアクセスできますが、
// テストの際には依存関係の注入が難しくなる可能性があります。
export const localization = new Localization();
