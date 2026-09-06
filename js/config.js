/**
 * إعدادات منظومة جلب العالمية للتجارة v36.0
 */
const CONFIG = {
  COMPANY_NAME: "شركة جلب العالمية للتجارة",
  APP_NAME: "بوابة جلب | Jalap Hub",
  LOGO_PATH: "assets/logo.png",
  
  // رابط Google Apps Script الخاص بك (تأكد أنه آخر رابط نشر Web App)
  API_URL: "https://script.google.com/macros/s/AKfycbw1DTvmz2e-eoKP-FxRD0I-742FwPFi6Fk3ag201fw4QWC3Sodq63R4O07fGY92T7Yi/exec",

  DEFAULT_GENERAL_RULES: {
    isGenTargetMandatory: true,
    generalThresholdPct: 80,
    generalTargetCommValue: 0,
    minGroupsRequired: 7,
    collectionRules: {
      isCollMandatory: false,
      thresholdPct: 0,
      commType: 'fixed',
      commValue: 0
    }
  }
};
