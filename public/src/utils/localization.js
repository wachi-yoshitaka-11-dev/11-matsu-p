export class Localization {
  constructor() {
    this.currentLanguage = 'ja'; // Default language
    this.texts = {};
  }

  init(localizationData) {
    if (localizationData) {
      this.texts = localizationData;
    } else {
      console.error('No localization data provided');
      // Minimal fallback text is fine to be empty
      this.texts = {};
    }
  }

  async loadLocalization() {
    try {
      const response = await fetch('./data/localization.json');
      this.texts = await response.json();
    } catch (error) {
      console.error('Failed to load localization data:', error);
      // Minimal fallback text is fine to be empty
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
        return `[${path}]`;
      }
    }

    return current;
  }

  // Shortcut methods for frequently used texts
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

// Global instance (Singleton pattern)
// This design allows access to the same instance from anywhere, but
// dependency injection may be difficult during testing.
export const localization = new Localization();
