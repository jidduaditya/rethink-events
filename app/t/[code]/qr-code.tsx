"use client";

// QrCode — client component wrapper for qrcode.react.
// qrcode.react uses browser Canvas/SVG APIs so it cannot render in a Server Component.

import { QRCodeSVG as QRCode } from "qrcode.react";

type QrCodeProps = {
  value: string;
};

export function QrCode({ value }: QrCodeProps) {
  return (
    <div
      className="inline-block border-2 border-on-background p-2 bg-surface"
      aria-label={`QR code for registration ${value}`}
    >
      <QRCode value={value} size={200} level="M" />
    </div>
  );
}
