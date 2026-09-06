/**
 * إعدادات منظومة جلب العالمية - Config v43.0
 */
const CONFIG = {
  COMPANY_NAME: 'شركة جلب العالمية للتجارة',
  LOGO_PATH: 'assets/logo.png',
  
  // تأكد أن الرابط ينتهي بـ /exec
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyc2pX-q3M9pLp8iWbU1Hw6w1vT_o9I5gB2tq_V1X4/exec',

  DEFAULT_GENERAL_RULES: {
    generalThresholdPct: 80,
    generalTargetCommValue: 500,
    minGroupsRequired: 10,
    isGenTargetMandatory: true
  },

  DEFAULT_AVAILABLE_MONTHS: ['2026-09', '2026-08']
};
