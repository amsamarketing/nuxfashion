declare module 'jsbarcode' {
  export default function JsBarcode(
    target: HTMLCanvasElement | SVGElement,
    value: string,
    options?: Record<string, unknown>,
  ): void;
}
