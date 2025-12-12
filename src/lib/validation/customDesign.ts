export type CustomDesignValidationResult = {
  valid: boolean;
  reason?: string;
};

// Centralized keyword lists for easy extension
const LIVING_KEYWORDS = [
  "person",
  "people",
  "man",
  "woman",
  "kid",
  "baby",
  "face",
  "portrait",
  "dog",
  "cat",
  "animal",
  "lion",
  "wolf",
  "tiger",
  "bear",
  "bird",
  "fish",
  "horse",
  "elephant",
  "monkey",
  "human",
  "child",
  "children",
  "boy",
  "girl",
  "selfie",
];

const RELIGIOUS_KEYWORDS = [
  "jesus",
  "allah",
  "muhammad",
  "quran",
  "bible",
  "cross",
  "church",
  "mosque",
  "temple",
  "saint",
  "hadith",
  "christ",
  "god",
  "prayer",
  "religious",
  "buddha",
  "hindu",
  "shiva",
  "krishna",
  "torah",
  "synagogue",
  "monk",
  "nun",
  "pope",
  "imam",
  "pastor",
  "priest",
  "holy",
  "sacred",
  "divine",
];

const OFFENSIVE_KEYWORDS = [
  "fuck",
  "shit",
  "bitch",
  "slur",
  "nazi",
  "hate",
  "kill",
  "murder",
  "racist",
  "sexist",
  "n-word",
  "f-word",
  "assault",
  "violence",
  "terror",
  "terrorist",
];

/**
 * Validates a custom design description against content policy rules.
 * Returns { valid: true } if the description is acceptable,
 * or { valid: false, reason: string } if it violates a rule.
 */
export function validateCustomDesignDescription(
  description: string
): CustomDesignValidationResult {
  const text = (description || "").toLowerCase().trim();

  if (!text) {
    return {
      valid: false,
      reason: "Please describe your design so our team knows what to create.",
    };
  }

  // Check for living beings
  if (LIVING_KEYWORDS.some((k) => text.includes(k))) {
    return {
      valid: false,
      reason:
        "Custom prints cannot include people, animals, or other living beings. Please adjust your design description.",
    };
  }

  // Check for religious content
  if (RELIGIOUS_KEYWORDS.some((k) => text.includes(k))) {
    return {
      valid: false,
      reason:
        "We don't print religious content for any faith or belief. Please choose a non-religious design.",
    };
  }

  // Check for offensive content
  if (OFFENSIVE_KEYWORDS.some((k) => text.includes(k))) {
    return {
      valid: false,
      reason:
        "We can't print offensive or hateful content. Please rephrase your design idea.",
    };
  }

  return { valid: true };
}
