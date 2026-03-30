declare module 'mammoth/mammoth.browser' {
  interface ExtractResult {
    value: string;
    messages: any[];
  }

  interface Input {
    arrayBuffer: ArrayBuffer;
    path?: string;
  }

  interface Options {
    convertImage?: any;
    includeDefaultStyleMap?: boolean;
    styleMap?: string[];
  }

  export function extractRawText(input: Input, options?: Options): Promise<ExtractResult>;
  export function convertToHtml(input: Input, options?: Options): Promise<ExtractResult>;
}
