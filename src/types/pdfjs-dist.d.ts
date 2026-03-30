declare module 'pdfjs-dist' {
  interface PDFDocumentProxy {
    numPages: number;
    getPage(pageNumber: number): Promise<PDFPageProxy>;
  }

  interface PDFPageProxy {
    getTextContent(): Promise<TextContent>;
  }

  interface TextContent {
    items: TextItem[];
  }

  interface TextItem {
    str: string;
    dir?: string;
    transform?: number[];
    width?: number;
    height?: number;
  }

  interface DocumentInitParameters {
    data?: ArrayBuffer;
    url?: string;
  }

  interface PDFDocumentLoadingTask {
    promise: Promise<PDFDocumentProxy>;
  }

  interface PdfjsDist {
    GlobalWorkerOptions: {
      workerSrc: string;
    };
    getDocument(data: DocumentInitParameters): PDFDocumentLoadingTask;
    version: string;
  }

  const pdfjsLib: PdfjsDist;
  export default pdfjsLib;
}
