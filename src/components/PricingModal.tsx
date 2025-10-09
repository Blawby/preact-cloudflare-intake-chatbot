import { FunctionComponent } from "preact";
import { useState, useEffect, useMemo } from "preact/hooks";
import { useTranslation } from '@/i18n/hooks';
import Modal from "./Modal";
import { Button } from "./ui/Button";
import { UserGroupIcon } from "@heroicons/react/24/outline";
import { Select } from "./ui/input/Select";
import { type SubscriptionTier } from "../utils/mockUserData";
import {
  mockPricingDataService,
  type PricingPlan,
} from "../utils/mockPricingData";
import {
  mockUserDataService,
  getLanguageForCountry,
} from "../utils/mockUserData";
import { formatCurrency } from "../utils/currencyFormatter";
import { setLocale } from '@/i18n/hooks';

// Country codes list - stable module-level constant
const COUNTRY_CODES = [
  "af", "al", "dz", "ad", "ao", "ag", "ar", "am", "au", "at",
  "az", "bs", "bh", "bd", "bb", "by", "be", "bz", "bj", "bt",
  "bo", "ba", "bw", "br", "bn", "bg", "bf", "bi", "kh", "cm",
  "ca", "cv", "cf", "td", "cl", "cn", "co", "km", "cg", "cd",
  "cr", "ci", "hr", "cu", "cy", "cz", "dk", "dj", "dm", "do",
  "ec", "eg", "sv", "gq", "er", "ee", "et", "fj", "fi", "fr",
  "ga", "gm", "ge", "de", "gh", "gr", "gd", "gt", "gn", "gw",
  "gy", "ht", "hn", "hu", "is", "in", "id", "ir", "iq", "ie",
  "il", "it", "jm", "jp", "jo", "kz", "ke", "ki", "kp", "kr",
  "kw", "kg", "la", "lv", "lb", "ls", "lr", "ly", "li", "lt",
  "lu", "mk", "mg", "mw", "my", "mv", "ml", "mt", "mh", "mr",
  "mu", "mx", "fm", "md", "mc", "mn", "me", "ma", "mz", "mm",
  "na", "nr", "np", "nl", "nz", "ni", "ne", "ng", "no", "om",
  "pk", "pw", "pa", "pg", "py", "pe", "ph", "pl", "pt", "qa",
  "ro", "ru", "rw", "kn", "lc", "vc", "ws", "sm", "st", "sa",
  "sn", "rs", "sc", "sl", "sg", "sk", "si", "sb", "so", "za",
  "ss", "es", "lk", "sd", "sr", "sz", "se", "ch", "sy", "tw",
  "tj", "tz", "th", "tl", "tg", "to", "tt", "tn", "tr", "tm",
  "tv", "ug", "ua", "ae", "gb", "us", "uy", "uz", "vu", "va",
  "ve", "vn", "ye", "zm", "zw"
] as const;

// English fallback names - stable module-level constant
const FALLBACK_COUNTRY_NAMES: Record<string, string> = {
  af: "Afghanistan", al: "Albania", dz: "Algeria", ad: "Andorra",
  ao: "Angola", ag: "Antigua & Barbuda", ar: "Argentina", am: "Armenia",
  au: "Australia", at: "Austria", az: "Azerbaijan", bs: "Bahamas",
  bh: "Bahrain", bd: "Bangladesh", bb: "Barbados", by: "Belarus",
  be: "Belgium", bz: "Belize", bj: "Benin", bt: "Bhutan",
  bo: "Bolivia", ba: "Bosnia & Herzegovina", bw: "Botswana", br: "Brazil",
  bn: "Brunei", bg: "Bulgaria", bf: "Burkina Faso", bi: "Burundi",
  kh: "Cambodia", cm: "Cameroon", ca: "Canada", cv: "Cape Verde",
  cf: "Central African Republic", td: "Chad", cl: "Chile", cn: "China",
  co: "Colombia", km: "Comoros", cg: "Congo", cd: "Congo (Democratic Republic)",
  cr: "Costa Rica", ci: "Côte d'Ivoire", hr: "Croatia", cu: "Cuba",
  cy: "Cyprus", cz: "Czech Republic", dk: "Denmark", dj: "Djibouti",
  dm: "Dominica", do: "Dominican Republic", ec: "Ecuador", eg: "Egypt",
  sv: "El Salvador", gq: "Equatorial Guinea", er: "Eritrea", ee: "Estonia",
  et: "Ethiopia", fj: "Fiji", fi: "Finland", fr: "France",
  ga: "Gabon", gm: "Gambia", ge: "Georgia", de: "Germany",
  gh: "Ghana", gr: "Greece", gd: "Grenada", gt: "Guatemala",
  gn: "Guinea", gw: "Guinea-Bissau", gy: "Guyana", ht: "Haiti",
  hn: "Honduras", hu: "Hungary", is: "Iceland", in: "India",
  id: "Indonesia", ir: "Iran", iq: "Iraq", ie: "Ireland",
  il: "Israel", it: "Italy", jm: "Jamaica", jp: "Japan",
  jo: "Jordan", kz: "Kazakhstan", ke: "Kenya", ki: "Kiribati",
  kp: "Korea (North)", kr: "Korea (South)", kw: "Kuwait", kg: "Kyrgyzstan",
  la: "Laos", lv: "Latvia", lb: "Lebanon", ls: "Lesotho",
  lr: "Liberia", ly: "Libya", li: "Liechtenstein", lt: "Lithuania",
  lu: "Luxembourg", mk: "Macedonia", mg: "Madagascar", mw: "Malawi",
  my: "Malaysia", mv: "Maldives", ml: "Mali", mt: "Malta",
  mh: "Marshall Islands", mr: "Mauritania", mu: "Mauritius", mx: "Mexico",
  fm: "Micronesia", md: "Moldova", mc: "Monaco", mn: "Mongolia",
  me: "Montenegro", ma: "Morocco", mz: "Mozambique", mm: "Myanmar",
  na: "Namibia", nr: "Nauru", np: "Nepal", nl: "Netherlands",
  nz: "New Zealand", ni: "Nicaragua", ne: "Niger", ng: "Nigeria",
  no: "Norway", om: "Oman", pk: "Pakistan", pw: "Palau",
  pa: "Panama", pg: "Papua New Guinea", py: "Paraguay", pe: "Peru",
  ph: "Philippines", pl: "Poland", pt: "Portugal", qa: "Qatar",
  ro: "Romania", ru: "Russia", rw: "Rwanda", kn: "Saint Kitts & Nevis",
  lc: "Saint Lucia", vc: "Saint Vincent & the Grenadines", ws: "Samoa",
  sm: "San Marino", st: "São Tomé & Príncipe", sa: "Saudi Arabia",
  sn: "Senegal", rs: "Serbia", sc: "Seychelles", sl: "Sierra Leone",
  sg: "Singapore", sk: "Slovakia", si: "Slovenia", sb: "Solomon Islands",
  so: "Somalia", za: "South Africa", ss: "South Sudan", es: "Spain",
  lk: "Sri Lanka", sd: "Sudan", sr: "Suriname", sz: "Swaziland",
  se: "Sweden", ch: "Switzerland", sy: "Syria", tw: "Taiwan",
  tj: "Tajikistan", tz: "Tanzania", th: "Thailand", tl: "Timor-Leste",
  tg: "Togo", to: "Tonga", tt: "Trinidad & Tobago", tn: "Tunisia",
  tr: "Turkey", tm: "Turkmenistan", tv: "Tuvalu", ug: "Uganda",
  ua: "Ukraine", ae: "United Arab Emirates", gb: "United Kingdom",
  us: "United States", uy: "Uruguay", uz: "Uzbekistan", vu: "Vanuatu",
  va: "Vatican City", ve: "Venezuela", vn: "Vietnam", ye: "Yemen",
  zm: "Zambia", zw: "Zimbabwe"
};

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier?: SubscriptionTier;
  onUpgrade?: (tier: SubscriptionTier) => void;
}

const PricingModal: FunctionComponent<PricingModalProps> = ({
  isOpen,
  onClose,
  currentTier = "free",
  onUpgrade,
}) => {
  const { t, i18n } = useTranslation(["pricing", "common"]);
  const [selectedTab, setSelectedTab] = useState<"personal" | "business">(
    "business"
  );
  const [selectedCountry, setSelectedCountry] = useState("us");

  // Localized country names using Intl.DisplayNames
  // Falls back to English names if Intl.DisplayNames is unavailable
  const countryOptions = useMemo(() => {
    try {
      // Use Intl.DisplayNames for localized country names
      if (typeof Intl !== 'undefined' && Intl.DisplayNames) {
        const displayNames = new Intl.DisplayNames([i18n.language], { type: 'region' });
        
        return COUNTRY_CODES.map(code => {
          try {
            // Intl.DisplayNames requires uppercase ISO 3166-1 alpha-2 codes
            const label = displayNames.of(code.toUpperCase());
            return {
              value: code,
              label: label || FALLBACK_COUNTRY_NAMES[code] || code.toUpperCase()
            };
          } catch {
            // Fallback if specific country code fails
            return {
              value: code,
              label: FALLBACK_COUNTRY_NAMES[code] || code.toUpperCase()
            };
          }
        });
      }
    } catch (error) {
      console.warn('Intl.DisplayNames not available, using fallback names');
    }

    // Fallback to English names if Intl.DisplayNames unavailable
    return COUNTRY_CODES.map(code => ({
      value: code,
      label: FALLBACK_COUNTRY_NAMES[code] || code.toUpperCase()
    }));
  }, [i18n.language]);

  // Load user's current country preference
  useEffect(() => {
    const preferences = mockUserDataService.getPreferences();
    // Default to 'us' if no country is set, or if the country isn't in our list
    const country = preferences.country?.toLowerCase() || 'us';
    // Check against stable COUNTRY_CODES constant to avoid countryOptions dependency
    const countryExists = COUNTRY_CODES.includes(country as any);
    setSelectedCountry(countryExists ? country : 'us');
  }, []);

  const handleCountryChange = async (country: string) => {
    setSelectedCountry(country);
    // Get the appropriate language for the selected country
    const language = getLanguageForCountry(country);
    // Update user preferences with both country and language
    mockUserDataService.setPreferences({
      country,
      language,
    });
    // Trigger language change in i18n to update UI
    try {
      await setLocale(language);
    } catch (error) {
      console.error('Failed to change language:', error);
    }

    // TODO: Future Enhancement - Regional Pricing
    // When implementing regional pricing, add here:
    // 1. Fetch region-specific pricing from backend API based on country code
    // 2. Convert prices to local currency using exchange rate service
    // 3. Apply PPP (Purchasing Power Parity) adjustments if needed
    // 4. Update pricing display with local currency symbol and format
    // Example implementation:
    // const regionalPricing = await fetchRegionalPricing(country);
    // setPricing(regionalPricing);
    // Note: Consider using Stripe's Price objects which support multiple currencies
  };

  // Get pricing plans from mock data service
  const allPlans = mockPricingDataService.getPricingPlans();
  
  // Show different plans based on selected tab with translations
  const mainPlans: PricingPlan[] = (() => {
    const plans = selectedTab === 'personal'
      ? allPlans.filter(plan => plan.id !== 'business')
      : allPlans.filter(plan => plan.id !== 'plus');
    
    return plans.map(plan => {
      const isCurrent = plan.id === currentTier;
      const isRecommended = selectedTab === 'personal' ? plan.id === 'plus' : plan.id === 'business';
      
      const formattedPrice = formatCurrency(
        plan.priceAmount,
        plan.currency,
        i18n.language
      );
      const billingTerm = t(
        `pricing:billing.${
          plan.billingPeriod === "month" ? "monthly" : "yearly"
        }`
      );

      return {
        ...plan,
        name: t(plan.name),
        description: t(plan.description),
        buttonText: isCurrent ? t("pricing:modal.currentPlan") : t(plan.buttonText),
        formattedPrice,
        billingTerm,
        features: plan.features.map((f) => ({
          ...f,
          text: t(f.text),
          description: f.description ? t(f.description) : undefined,
        })),
        isCurrent,
        isRecommended,
      };
    });
  })();

  const handleUpgrade = (tier: SubscriptionTier) => {
    if (onUpgrade) {
      onUpgrade(tier);
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      type="fullscreen"
      showCloseButton={false}
    >
      <div className="h-screen lg:h-full bg-dark-bg text-white overflow-y-auto overscroll-contain">
        {/* Header - Mobile scroll fix */}
        <div className="relative p-6 border-b border-dark-border">
          {/* Close Button */}
          <Button
            onClick={onClose}
            variant="icon"
            size="sm"
            className="absolute top-4 right-4"
            aria-label="Close modal"
            icon={
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            }
          />

          {/* Centered Content */}
          <div className="flex flex-col items-center space-y-6">
            <h1 className="text-2xl font-semibold text-white">
              {t("pricing:modal.title")}
            </h1>
            <div className="flex bg-dark-card-bg rounded-lg p-1">
              <button
                onClick={() => setSelectedTab("personal")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedTab === "personal"
                    ? "bg-dark-bg text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {t("pricing:modal.tabs.personal")}
              </button>
              <button
                onClick={() => setSelectedTab("business")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedTab === "business"
                    ? "bg-dark-bg text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {t("pricing:modal.tabs.business")}
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full mx-auto">
            {mainPlans.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-xl p-6 transition-all duration-200 flex flex-col h-full ${
                  plan.isRecommended
                    ? "bg-dark-card-bg border-2 border-accent-500"
                    : "bg-dark-card-bg border border-dark-border"
                }`}
              >
                {/* Recommended Badge */}
                {plan.isRecommended && (
                  <div className="absolute -top-3 left-6">
                    <span className="bg-accent-500 text-gray-900 text-xs font-medium px-3 py-1 rounded-full">
                      {t("pricing:modal.recommended").toUpperCase()}
                    </span>
                  </div>
                )}

                {/* Plan Header */}
                <div className="mb-6">
                  <h3 className="text-2xl font-bold mb-2 text-white">
                    {plan.name}
                  </h3>
                  <div className="text-3xl font-bold mb-2 text-white">
                    {plan.formattedPrice}
                    <span className="text-lg font-normal text-gray-300 ml-1">
                      / {plan.billingTerm}
                    </span>
                  </div>
                  <p className="text-gray-300">{plan.description}</p>
                </div>

                {/* Action Button */}
                <div className="mb-6">
                  <Button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={plan.isCurrent}
                    variant={plan.isCurrent ? "secondary" : "primary"}
                    size="lg"
                    className="w-full"
                  >
                    {plan.buttonText}
                  </Button>
                </div>

                {/* Features List */}
                <div className="space-y-3 flex-1">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <feature.icon className="w-5 h-5 mt-0.5 flex-shrink-0 text-gray-400" />
                      <span className="text-sm text-gray-300">
                        {feature.text}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Footer Text */}
                {plan.id === "free" && (
                  <div className="mt-6 pt-4 border-t border-dark-border">
                    <p className="text-xs text-gray-400">
                      {t("pricing:modal.existingPlan")}{" "}
                      <button className="underline hover:text-white">
                        {t("pricing:modal.billingHelp")}
                      </button>
                    </p>
                  </div>
                )}

                {plan.id === "business" && (
                  <div className="mt-6 pt-4 border-t border-dark-border">
                    <p className="text-xs text-gray-400 mb-1">
                      {t("pricing:modal.businessUsers")}
                    </p>
                    <p className="text-xs text-gray-400">
                      {t("pricing:modal.unlimitedGuardrails")}{" "}
                      <button className="underline hover:text-white">
                        {t("common:learnMore")}
                      </button>
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Modal Footer */}
          <div className="border-t border-dark-border px-6 py-2 mt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Enterprise Section */}
              <div className="flex items-center gap-2">
                <UserGroupIcon className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-400">
                  {t("pricing:modal.needMore")}
                </span>
                <button
                  className="text-sm text-white underline hover:text-gray-300 transition-colors"
                  onClick={() => {
                    // Redirect to enterprise page
                    window.open("/enterprise", "_blank");
                  }}
                >
                  {t("pricing:modal.seeEnterprise")}
                </button>
              </div>

              {/* Country/Region Selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">
                  {t("pricing:modal.countryLabel")}:
                </span>
                <Select
                  value={selectedCountry}
                  options={countryOptions}
                  onChange={handleCountryChange}
                  direction="up"
                  searchable={true}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default PricingModal;
