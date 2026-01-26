/**
 * Template JSON type definitions
 * Satori-compatible JSX-like structure
 */

/**
 * CSS properties supported by Satori
 */
export interface TemplateStyle {
    // Layout
    display?: 'flex' | 'none';
    flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
    flexWrap?: 'wrap' | 'nowrap';
    justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around';
    alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
    alignContent?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'space-between' | 'space-around';
    alignSelf?: 'auto' | 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
    flexGrow?: number;
    flexShrink?: number;
    flexBasis?: number | string;
    flex?: number | string;
    gap?: number | string;
    rowGap?: number | string;
    columnGap?: number | string;

    // Sizing
    width?: number | string;
    height?: number | string;
    minWidth?: number | string;
    maxWidth?: number | string;
    minHeight?: number | string;
    maxHeight?: number | string;

    // Positioning
    position?: 'relative' | 'absolute';
    top?: number | string;
    right?: number | string;
    bottom?: number | string;
    left?: number | string;

    // Spacing
    margin?: number | string;
    marginTop?: number | string;
    marginRight?: number | string;
    marginBottom?: number | string;
    marginLeft?: number | string;
    padding?: number | string;
    paddingTop?: number | string;
    paddingRight?: number | string;
    paddingBottom?: number | string;
    paddingLeft?: number | string;

    // Background
    backgroundColor?: string;
    backgroundImage?: string;
    backgroundSize?: string;
    backgroundPosition?: string;
    backgroundRepeat?: string;

    // Border
    border?: string;
    borderWidth?: number | string;
    borderStyle?: string;
    borderColor?: string;
    borderRadius?: number | string;
    borderTop?: string;
    borderRight?: string;
    borderBottom?: string;
    borderLeft?: string;

    // Typography
    color?: string;
    fontSize?: number | string;
    fontWeight?: number | string;
    fontFamily?: string;
    fontStyle?: 'normal' | 'italic';
    textAlign?: 'left' | 'right' | 'center' | 'justify';
    textDecoration?: string;
    textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
    lineHeight?: number | string;
    letterSpacing?: number | string;
    whiteSpace?: 'normal' | 'nowrap' | 'pre' | 'pre-wrap' | 'pre-line';
    wordBreak?: 'normal' | 'break-all' | 'keep-all' | 'break-word';
    textOverflow?: 'clip' | 'ellipsis';
    overflow?: 'visible' | 'hidden';

    // Effects
    opacity?: number;
    boxShadow?: string;
    transform?: string;
    transformOrigin?: string;

    // Object fit for images
    objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
    objectPosition?: string;
}

/**
 * Template node representing a single element
 */
export interface TemplateNode {
    type: string;
    props?: {
        style?: TemplateStyle;
        src?: string;
        alt?: string;
        [key: string]: unknown;
    };
    children?: (TemplateNode | string)[];
}

/**
 * Root template structure
 */
export interface TemplateJSON {
    type: 'div';
    props: {
        style: TemplateStyle;
        [key: string]: unknown;
    };
    children?: (TemplateNode | string)[];
}

/**
 * Render request payload
 */
export interface RenderRequest {
    template: TemplateJSON;
    width: number;
    height: number;
    format?: 'png' | 'svg';
    uploadPath?: string;
}

/**
 * Render response
 */
export interface RenderResponse {
    success: boolean;
    url: string;
    format: string;
    width: number;
    height: number;
}

/**
 * Analyze response
 */
export interface AnalyzeResponse {
    success: boolean;
    template?: TemplateJSON; // For single post
    slides?: {               // For carousel
        page: number;
        template: TemplateJSON;
        analysis: {
            detectedElements: string[];
            colorPalette: string[];
            fonts: string[];
        };
    }[];
    analysis?: {             // For single post
        detectedElements: string[];
        colorPalette: string[];
        fonts: string[];
        hasBackgroundImage?: boolean;
    };
    commonAnalysis?: {       // For carousel
        colorPalette: string[];
        fonts: string[];
    };
}

/**
 * Text analysis response for copy/post formats
 */
export interface TextAnalyzeResponse {
    success: boolean;
    format: string;          // The extracted format with {Placeholders}
    name: string;            // Suggested name for the format
    description: string;     // Brief description of the format
    variables: {             // Extracted variables
        name: string;
        type: 'text';
    }[];
}


/**
 * Unsplash image result
 */
export interface UnsplashImage {
    id: string;
    urls: {
        raw: string;
        full: string;
        regular: string;
        small: string;
        thumb: string;
    };
    width: number;
    height: number;
    color: string;
    blur_hash: string;
    user: {
        name: string;
        username: string;
    };
}

/**
 * Unsplash search response
 */
export interface UnsplashSearchResponse {
    success: boolean;
    results: UnsplashImage[];
    total: number;
    totalPages: number;
}
