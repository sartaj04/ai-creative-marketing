/**
 * Identity Schema Definition
 * 
 * This file defines ALL identity fields, their types, constraints, and UI metadata.
 * The UI MUST render all fields defined here. No hardcoding field lists elsewhere.
 * 
 * RULES:
 * - Every field in backend schemas MUST be represented here
 * - UI components MUST use this schema to determine rendering
 * - Fields with options MUST show dropdowns, not free text
 * - Empty fields MUST be visible with "Add" action
 */

// ============================================
// Field Type Definitions
// ============================================

export type FieldType = 
  | 'string'       // Simple text field
  | 'text'         // Long text / textarea
  | 'array'        // Array of strings
  | 'array_enum'   // Array with predefined options
  | 'object_array' // Array of structured objects
  | 'enum'         // Single value from options
  | 'slider'       // Numeric 0-1 slider
  | 'slider_group' // Group of related sliders
  | 'dict';        // Key-value object

export interface FieldOption {
  value: string;
  label: string;
  description?: string;
}

export interface FieldSchema {
  key: string;
  label: string;
  description: string;
  type: FieldType;
  required: boolean;
  source: 'identity_graph' | 'style_profile' | 'persona';
  region: 'core' | 'content' | 'expertise' | 'strategy' | 'character' | 'voice';
  options?: FieldOption[];    // For enum/array_enum types
  allowCustom?: boolean;      // Allow custom values beyond options
  objectSchema?: Record<string, { label: string; type: 'string' | 'number' }>; // For object_array
  sliderLabels?: { left: string; right: string }; // For slider types
  maxItems?: number;          // For array types
  minItems?: number;          // For array types
  placeholder?: string;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

// ============================================
// Predefined Options for Constrained Fields
// ============================================

export const INDUSTRY_OPTIONS: FieldOption[] = [
  { value: 'technology', label: 'Technology', description: 'Software, hardware, IT' },
  { value: 'finance', label: 'Finance', description: 'Banking, investments, fintech' },
  { value: 'healthcare', label: 'Healthcare', description: 'Medical, pharma, health tech' },
  { value: 'education', label: 'Education', description: 'EdTech, training, academia' },
  { value: 'marketing', label: 'Marketing', description: 'Advertising, branding, PR' },
  { value: 'consulting', label: 'Consulting', description: 'Strategy, management consulting' },
  { value: 'media', label: 'Media & Entertainment', description: 'Publishing, content, streaming' },
  { value: 'ecommerce', label: 'E-commerce', description: 'Retail, DTC, marketplaces' },
  { value: 'saas', label: 'SaaS', description: 'Software as a service' },
  { value: 'ai_ml', label: 'AI & Machine Learning', description: 'Artificial intelligence' },
  { value: 'crypto_web3', label: 'Crypto & Web3', description: 'Blockchain, DeFi, NFTs' },
  { value: 'real_estate', label: 'Real Estate', description: 'Property, proptech' },
  { value: 'legal', label: 'Legal', description: 'Law, legal tech' },
  { value: 'hr', label: 'HR & Recruiting', description: 'Human resources, talent' },
  { value: 'other', label: 'Other', description: 'Specify your industry' },
];

export const CAREER_STAGE_OPTIONS: FieldOption[] = [
  { value: 'early_career', label: 'Early Career', description: '0-3 years experience' },
  { value: 'mid_career', label: 'Mid Career', description: '4-10 years experience' },
  { value: 'senior', label: 'Senior', description: '10+ years, individual contributor' },
  { value: 'leadership', label: 'Leadership', description: 'Managing teams or departments' },
  { value: 'executive', label: 'Executive', description: 'C-suite, VP level' },
  { value: 'founder', label: 'Founder/Entrepreneur', description: 'Started own company' },
  { value: 'advisor', label: 'Advisor/Board Member', description: 'Advisory roles' },
  { value: 'thought_leader', label: 'Thought Leader', description: 'Industry influencer' },
];

export const INTEREST_OPTIONS: FieldOption[] = [
  { value: 'ai_technology', label: 'AI & Technology' },
  { value: 'entrepreneurship', label: 'Entrepreneurship' },
  { value: 'leadership', label: 'Leadership' },
  { value: 'personal_development', label: 'Personal Development' },
  { value: 'investing', label: 'Investing' },
  { value: 'reading', label: 'Reading' },
  { value: 'writing', label: 'Writing' },
  { value: 'fitness_health', label: 'Fitness & Health' },
  { value: 'travel', label: 'Travel' },
  { value: 'music', label: 'Music' },
  { value: 'art_design', label: 'Art & Design' },
  { value: 'philosophy', label: 'Philosophy' },
  { value: 'psychology', label: 'Psychology' },
  { value: 'science', label: 'Science' },
  { value: 'sports', label: 'Sports' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'cooking', label: 'Cooking' },
  { value: 'sustainability', label: 'Sustainability' },
  { value: 'parenting', label: 'Parenting' },
  { value: 'community_building', label: 'Community Building' },
];

export const CONTENT_PILLAR_OPTIONS: FieldOption[] = [
  { value: 'industry_insights', label: 'Industry Insights', description: 'Analysis and trends' },
  { value: 'how_to_guides', label: 'How-To Guides', description: 'Practical tutorials' },
  { value: 'thought_leadership', label: 'Thought Leadership', description: 'Opinions and perspectives' },
  { value: 'case_studies', label: 'Case Studies', description: 'Real-world examples' },
  { value: 'personal_stories', label: 'Personal Stories', description: 'Experiences and lessons' },
  { value: 'tool_reviews', label: 'Tool Reviews', description: 'Product recommendations' },
  { value: 'career_advice', label: 'Career Advice', description: 'Professional growth' },
  { value: 'news_commentary', label: 'News Commentary', description: 'Industry news analysis' },
  { value: 'behind_scenes', label: 'Behind the Scenes', description: 'Day-in-life, process' },
  { value: 'interviews', label: 'Interviews', description: 'Conversations with others' },
  { value: 'predictions', label: 'Predictions', description: 'Future trends' },
  { value: 'contrarian_takes', label: 'Contrarian Takes', description: 'Challenging status quo' },
];

export const HOOK_STYLE_OPTIONS: FieldOption[] = [
  { value: 'question', label: 'Question Hook', description: 'Start with a provocative question' },
  { value: 'statistic', label: 'Statistic Hook', description: 'Lead with a surprising stat' },
  { value: 'story', label: 'Story Hook', description: 'Open with a personal story' },
  { value: 'bold_claim', label: 'Bold Claim', description: 'Make a strong statement' },
  { value: 'problem', label: 'Problem Statement', description: 'Identify a pain point' },
  { value: 'contrarian', label: 'Contrarian Opinion', description: 'Challenge conventional wisdom' },
  { value: 'listicle', label: 'Listicle', description: 'Numbered list format' },
  { value: 'how_to', label: 'How-To', description: 'Promise to teach something' },
  { value: 'metaphor', label: 'Metaphor/Analogy', description: 'Creative comparison' },
  { value: 'vulnerable', label: 'Vulnerable Share', description: 'Honest admission' },
];

export const EXPERTISE_AREA_OPTIONS: FieldOption[] = [
  { value: 'product_management', label: 'Product Management' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'data_science', label: 'Data Science' },
  { value: 'design', label: 'Design' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'sales', label: 'Sales' },
  { value: 'operations', label: 'Operations' },
  { value: 'finance', label: 'Finance' },
  { value: 'strategy', label: 'Strategy' },
  { value: 'leadership', label: 'Leadership' },
  { value: 'growth', label: 'Growth' },
  { value: 'content', label: 'Content' },
  { value: 'community', label: 'Community' },
  { value: 'partnerships', label: 'Partnerships' },
  { value: 'customer_success', label: 'Customer Success' },
  { value: 'hr_people', label: 'HR & People' },
  { value: 'legal', label: 'Legal' },
  { value: 'security', label: 'Security' },
  { value: 'ai_ml', label: 'AI/ML' },
  { value: 'blockchain', label: 'Blockchain' },
];

// ============================================
// Complete Identity Schema
// ============================================

export const IDENTITY_SCHEMA: FieldSchema[] = [
  // ===== CORE REGION =====
  {
    key: 'current_role',
    label: 'Current Role',
    description: 'Your primary professional title or role',
    type: 'string',
    required: true,
    source: 'identity_graph',
    region: 'core',
    placeholder: 'e.g., VP of Product, Founder, Senior Engineer',
    validation: { minLength: 2, maxLength: 100 },
  },
  {
    key: 'industry',
    label: 'Industry',
    description: 'The primary industry you operate in',
    type: 'enum',
    required: true,
    source: 'identity_graph',
    region: 'core',
    options: INDUSTRY_OPTIONS,
    allowCustom: true,
  },
  {
    key: 'career_stage',
    label: 'Career Stage',
    description: 'Your current career level',
    type: 'enum',
    required: false,
    source: 'identity_graph',
    region: 'core',
    options: CAREER_STAGE_OPTIONS,
  },
  {
    key: 'bio_summary',
    label: 'Bio Summary',
    description: 'A brief professional bio (2-3 sentences)',
    type: 'text',
    required: false,
    source: 'identity_graph',
    region: 'core',
    placeholder: 'Write a short bio that captures who you are professionally...',
    validation: { maxLength: 500 },
  },

  // ===== EXPERTISE REGION =====
  {
    key: 'expertise_areas',
    label: 'Expertise Areas',
    description: 'Your main areas of professional expertise',
    type: 'array_enum',
    required: true,
    source: 'identity_graph',
    region: 'expertise',
    options: EXPERTISE_AREA_OPTIONS,
    allowCustom: true,
    minItems: 1,
    maxItems: 10,
  },
  {
    key: 'expertise_keywords',
    label: 'Expertise Keywords',
    description: 'Specific skills and keywords that define your expertise',
    type: 'array',
    required: false,
    source: 'identity_graph',
    region: 'expertise',
    allowCustom: true,
    placeholder: 'Add specific skills or keywords...',
    maxItems: 20,
  },
  {
    key: 'career_highlights',
    label: 'Career Highlights',
    description: 'Key achievements and milestones in your career',
    type: 'array',
    required: false,
    source: 'identity_graph',
    region: 'expertise',
    placeholder: 'Add a career achievement...',
    maxItems: 10,
  },
  {
    key: 'education',
    label: 'Education',
    description: 'Your educational background',
    type: 'object_array',
    required: false,
    source: 'identity_graph',
    region: 'expertise',
    objectSchema: {
      degree: { label: 'Degree', type: 'string' },
      school: { label: 'School', type: 'string' },
      year: { label: 'Year', type: 'number' },
    },
    maxItems: 5,
  },

  // ===== CONTENT REGION =====
  {
    key: 'content_pillars',
    label: 'Content Pillars',
    description: 'The main themes you want to be known for',
    type: 'array_enum',
    required: true,
    source: 'identity_graph',
    region: 'content',
    options: CONTENT_PILLAR_OPTIONS,
    allowCustom: true,
    minItems: 2,
    maxItems: 5,
  },
  {
    key: 'narrative_themes',
    label: 'Narrative Themes',
    description: 'Recurring story patterns and angles in your content',
    type: 'array',
    required: false,
    source: 'identity_graph',
    region: 'content',
    allowCustom: true,
    placeholder: 'Add a narrative theme...',
    maxItems: 10,
  },
  {
    key: 'themes',
    label: 'Topics',
    description: 'General topics you frequently discuss',
    type: 'array',
    required: false,
    source: 'identity_graph',
    region: 'content',
    allowCustom: true,
    placeholder: 'Add a topic...',
    maxItems: 15,
  },
  {
    key: 'preferred_hooks',
    label: 'Preferred Hook Styles',
    description: 'How you like to open your content',
    type: 'array_enum',
    required: false,
    source: 'style_profile',
    region: 'content',
    options: HOOK_STYLE_OPTIONS,
    allowCustom: false,
    maxItems: 5,
  },

  // ===== STRATEGY REGION =====
  {
    key: 'target_audience',
    label: 'Target Audience',
    description: 'Who you are trying to reach with your content',
    type: 'text',
    required: true,
    source: 'identity_graph',
    region: 'strategy',
    placeholder: 'Describe your ideal audience...',
    validation: { maxLength: 300 },
  },
  {
    key: 'audience_notes',
    label: 'Audience Notes',
    description: 'Additional details about your target audience',
    type: 'dict',
    required: false,
    source: 'identity_graph',
    region: 'strategy',
  },
  {
    key: 'desired_positioning',
    label: 'Desired Positioning',
    description: 'How you want to be perceived in your industry',
    type: 'text',
    required: false,
    source: 'identity_graph',
    region: 'strategy',
    placeholder: 'How do you want to be known?',
    validation: { maxLength: 300 },
  },
  {
    key: 'goals',
    label: 'Goals',
    description: 'What you want to achieve with your personal brand',
    type: 'text',
    required: false,
    source: 'identity_graph',
    region: 'strategy',
    placeholder: 'What are you trying to accomplish?',
    validation: { maxLength: 300 },
  },
  {
    key: 'aspirations',
    label: 'Aspirations',
    description: 'Your long-term career and brand aspirations',
    type: 'text',
    required: false,
    source: 'identity_graph',
    region: 'strategy',
    placeholder: 'Where do you see yourself in 5-10 years?',
    validation: { maxLength: 300 },
  },

  // ===== CHARACTER REGION =====
  {
    key: 'interests',
    label: 'Interests',
    description: 'Personal interests that inform your content and perspective',
    type: 'array_enum',
    required: false,
    source: 'identity_graph',
    region: 'character',
    options: INTEREST_OPTIONS,
    allowCustom: true,
    maxItems: 10,
  },
  {
    key: 'beliefs',
    label: 'Core Beliefs',
    description: 'Fundamental beliefs that guide your perspective',
    type: 'array',
    required: false,
    source: 'identity_graph',
    region: 'character',
    allowCustom: true,
    placeholder: 'Add a core belief...',
    maxItems: 10,
  },
  {
    key: 'contrarian_views',
    label: 'Contrarian Views',
    description: 'Opinions that go against the mainstream in your industry',
    type: 'array',
    required: false,
    source: 'identity_graph',
    region: 'character',
    allowCustom: true,
    placeholder: 'Add a contrarian take...',
    maxItems: 10,
  },
  {
    key: 'taboo_list',
    label: 'Taboo Topics',
    description: 'Topics or claims you want to avoid in content',
    type: 'array',
    required: false,
    source: 'style_profile',
    region: 'character',
    allowCustom: true,
    placeholder: 'Add something to avoid...',
    maxItems: 20,
  },

  // ===== VOICE REGION =====
  {
    key: 'unique_angles',
    label: 'Unique Angles',
    description: 'What makes your perspective unique',
    type: 'array',
    required: false,
    source: 'identity_graph',
    region: 'voice',
    allowCustom: true,
    placeholder: 'Add a unique angle...',
    maxItems: 10,
  },
  {
    key: 'authority_angles',
    label: 'Authority Angles',
    description: 'Credibility markers and authority sources',
    type: 'array',
    required: false,
    source: 'identity_graph',
    region: 'voice',
    allowCustom: true,
    placeholder: 'Add an authority angle...',
    maxItems: 10,
  },
  {
    key: 'tone_markers',
    label: 'Tone Markers',
    description: 'Voice and tone characteristics',
    type: 'dict',
    required: false,
    source: 'identity_graph',
    region: 'voice',
  },
  {
    key: 'tone_sliders',
    label: 'Tone Style',
    description: 'Your preferred communication style on various spectrums',
    type: 'slider_group',
    required: false,
    source: 'style_profile',
    region: 'voice',
  },
  {
    key: 'format_preferences',
    label: 'Format Preferences',
    description: 'Your preferred content format weights',
    type: 'slider_group',
    required: false,
    source: 'style_profile',
    region: 'voice',
  },
];

// ============================================
// Schema Helpers
// ============================================

export function getFieldsByRegion(region: string): FieldSchema[] {
  return IDENTITY_SCHEMA.filter(f => f.region === region);
}

export function getFieldByKey(key: string): FieldSchema | undefined {
  return IDENTITY_SCHEMA.find(f => f.key === key);
}

export function getRequiredFields(): FieldSchema[] {
  return IDENTITY_SCHEMA.filter(f => f.required);
}

export function getFieldsBySource(source: 'identity_graph' | 'style_profile' | 'persona'): FieldSchema[] {
  return IDENTITY_SCHEMA.filter(f => f.source === source);
}

export function isFieldEmpty(value: any, schema: FieldSchema): boolean {
  if (value === null || value === undefined) return true;
  if (schema.type === 'string' || schema.type === 'text' || schema.type === 'enum') {
    return !value || (typeof value === 'string' && value.trim() === '');
  }
  if (schema.type === 'array' || schema.type === 'array_enum' || schema.type === 'object_array') {
    return !Array.isArray(value) || value.length === 0;
  }
  if (schema.type === 'dict' || schema.type === 'slider_group') {
    return !value || Object.keys(value).length === 0;
  }
  return false;
}

export interface CompletenessResult {
  total: number;
  filled: number;
  required: { total: number; filled: number };
  optional: { total: number; filled: number };
  missingRequired: string[];
  percentage: number;
}

export function calculateCompleteness(
  identityGraph: Record<string, any>,
  styleProfile: Record<string, any> | null
): CompletenessResult {
  const result: CompletenessResult = {
    total: 0,
    filled: 0,
    required: { total: 0, filled: 0 },
    optional: { total: 0, filled: 0 },
    missingRequired: [],
    percentage: 0,
  };

  for (const schema of IDENTITY_SCHEMA) {
    // Skip internal fields
    if (['tone_markers', 'audience_notes'].includes(schema.key)) continue;

    const source = schema.source === 'style_profile' ? styleProfile : identityGraph;
    const value = source?.[schema.key];
    const isEmpty = isFieldEmpty(value, schema);

    result.total++;

    if (schema.required) {
      result.required.total++;
      if (!isEmpty) {
        result.required.filled++;
        result.filled++;
      } else {
        result.missingRequired.push(schema.key);
      }
    } else {
      result.optional.total++;
      if (!isEmpty) {
        result.optional.filled++;
        result.filled++;
      }
    }
  }

  // Weight required fields more heavily (required = 2 points, optional = 1 point)
  const requiredWeight = 2;
  const maxScore = (result.required.total * requiredWeight) + result.optional.total;
  const actualScore = (result.required.filled * requiredWeight) + result.optional.filled;
  result.percentage = maxScore > 0 ? Math.round((actualScore / maxScore) * 100) : 0;

  return result;
}

// ============================================
// Region Definitions
// ============================================

export interface RegionDefinition {
  id: 'core' | 'content' | 'expertise' | 'strategy' | 'character' | 'voice';
  label: string;
  color: string;
  description: string;
}

export const REGION_DEFINITIONS: RegionDefinition[] = [
  { id: 'core', label: 'Identity Core', color: 'slate', description: 'Your foundational identity' },
  { id: 'content', label: 'Content Pillars', color: 'cyan', description: 'What you create content about' },
  { id: 'expertise', label: 'Expertise', color: 'indigo', description: 'Your professional knowledge' },
  { id: 'strategy', label: 'Strategy', color: 'emerald', description: 'Your brand goals and audience' },
  { id: 'character', label: 'Character', color: 'amber', description: 'Your beliefs and personality' },
  { id: 'voice', label: 'Voice & Tone', color: 'violet', description: 'How you communicate' },
];

// ============================================
// Tone Slider Definitions
// ============================================

export const TONE_SLIDER_DEFINITIONS = {
  formal_casual: { left: 'Formal', right: 'Casual', description: 'Professional vs conversational' },
  technical_simple: { left: 'Technical', right: 'Simple', description: 'Jargon-heavy vs accessible' },
  serious_playful: { left: 'Serious', right: 'Playful', description: 'Grave vs lighthearted' },
  humble_confident: { left: 'Humble', right: 'Confident', description: 'Modest vs assertive' },
};

export const FORMAT_PREFERENCE_DEFINITIONS = {
  post: { label: 'Single Posts', description: 'Standard social media posts' },
  thread: { label: 'Threads', description: 'Multi-part connected posts' },
  carousel: { label: 'Carousels', description: 'Swipeable image posts' },
};
