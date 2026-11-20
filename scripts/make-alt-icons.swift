// Génère les icônes alternatives (Premium) aux couleurs des accents. Seuls les verts « Forêt » de l’icône
// (fond, poignées, contours) prennent la teinte de l’accent ; la feuille, symbole anti-gaspi, reste verte
// et le frigo reste blanc.
//   swift scripts/make-alt-icons.swift
// À relancer après un changement de assets/icon.png ou assets/android-icon-foreground.png, puis refaire
// les vignettes du sélecteur : sips -Z 120 <icône> --out assets/app-icons/thumbs/<nom>.png
import AppKit

let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent()
let assets = root.appendingPathComponent("assets")
let output = assets.appendingPathComponent("app-icons")
try? FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)

struct HSV { var h: Double, s: Double, v: Double }

func hsv(_ hex: UInt32) -> HSV {
  let r = Double((hex >> 16) & 0xFF) / 255, g = Double((hex >> 8) & 0xFF) / 255, b = Double(hex & 0xFF) / 255
  return toHSV(r, g, b)
}

func toHSV(_ r: Double, _ g: Double, _ b: Double) -> HSV {
  let mx = max(r, g, b), mn = min(r, g, b), d = mx - mn
  var h = 0.0
  if d > 0 {
    if mx == r { h = 60 * ((g - b) / d).truncatingRemainder(dividingBy: 6) }
    else if mx == g { h = 60 * ((b - r) / d + 2) }
    else { h = 60 * ((r - g) / d + 4) }
  }
  if h < 0 { h += 360 }
  return HSV(h: h, s: mx == 0 ? 0 : d / mx, v: mx)
}

func toRGB(_ c: HSV) -> (Double, Double, Double) {
  let k = { (n: Double) -> Double in
    let x = (n + c.h / 60).truncatingRemainder(dividingBy: 6)
    return c.v - c.v * c.s * max(0, min(x, 4 - x, 1))
  }
  return (k(5), k(3), k(1))
}

/// Vert « Forêt » d’origine et accents (mêmes couleurs que src/theme/accents.ts, mode clair).
let base = hsv(0x2F6B4F)
let accents: [(name: String, color: HSV)] = [
  ("ocean", hsv(0x1F5F8B)), ("framboise", hsv(0xA32A55)), ("prune", hsv(0x5E3F8F)), ("terracotta", hsv(0x9C4523)),
]

func recolor(_ file: String, to target: HSV, opaque: Bool) -> CGImage {
  let source = NSImage(contentsOf: assets.appendingPathComponent(file))!.cgImage(forProposedRect: nil, context: nil, hints: nil)!
  let w = source.width, h = source.height
  let space = CGColorSpace(name: CGColorSpace.sRGB)!
  // Tampon RGBA 8 bits, alpha non prémultiplié en lecture grâce à la division ci-dessous.
  let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4, space: space,
                      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  if opaque {
    // iOS refuse les icônes avec canal alpha : fond opaque sous l’image.
    ctx.setFillColor(CGColor(srgbRed: 0.18, green: 0.42, blue: 0.31, alpha: 1))
    ctx.fill(CGRect(x: 0, y: 0, width: w, height: h))
  }
  ctx.draw(source, in: CGRect(x: 0, y: 0, width: w, height: h))
  let buffer = ctx.data!.bindMemory(to: UInt8.self, capacity: w * h * 4)
  for i in stride(from: 0, to: w * h * 4, by: 4) {
    let a = Double(buffer[i + 3]) / 255
    if a == 0 { continue }
    var c = toHSV(Double(buffer[i]) / 255 / a, Double(buffer[i + 1]) / 255 / a, Double(buffer[i + 2]) / 255 / a)
    // Verts « Forêt » (fond, poignées, contours) : la feuille, plus jaune (≈ 95°), n’est pas touchée.
    guard c.h >= 125 && c.h <= 185 && c.s > 0.12 else { continue }
    c = HSV(h: target.h, s: min(1, c.s * target.s / base.s), v: min(1, c.v * target.v / base.v))
    let (r, g, b) = toRGB(c)
    buffer[i] = UInt8(min(255, max(0, r * a * 255).rounded()))
    buffer[i + 1] = UInt8(min(255, max(0, g * a * 255).rounded()))
    buffer[i + 2] = UInt8(min(255, max(0, b * a * 255).rounded()))
  }
  let image = ctx.makeImage()!
  guard opaque else { return image }
  let flat = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: 0, space: space,
                       bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
  flat.draw(image, in: CGRect(x: 0, y: 0, width: w, height: h))
  return flat.makeImage()!
}

func save(_ image: CGImage, _ name: String) {
  try! NSBitmapImageRep(cgImage: image).representation(using: .png, properties: [:])!.write(to: output.appendingPathComponent(name))
  print("assets/app-icons/\(name)")
}

for accent in accents {
  // Le premier plan Android, lui, doit rester transparent.
  save(recolor("icon.png", to: accent.color, opaque: true), "icon-\(accent.name).png")
  save(recolor("android-icon-foreground.png", to: accent.color, opaque: false), "android-foreground-\(accent.name).png")
}
