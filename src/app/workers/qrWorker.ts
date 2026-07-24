import jsQR from 'jsqr';

self.onmessage = function (e: MessageEvent) {
  const { data, width, height } = e.data;

  // Coba membaca QR Code
  try {
    const code = jsQR(data, width, height, {
      inversionAttempts: 'dontInvert',
    });

    if (code) {
      self.postMessage({ success: true, data: code.data });
    } else {
      self.postMessage({ success: false });
    }
  } catch (err) {
    self.postMessage({ success: false, error: String(err) });
  }
};
