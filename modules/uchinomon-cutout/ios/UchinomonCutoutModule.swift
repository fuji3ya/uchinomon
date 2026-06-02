import ExpoModulesCore
import Vision
import CoreImage
import UIKit

// On-device foreground cutout for a child's drawing.
// No network, no upload — VNGenerateForegroundInstanceMaskRequest runs entirely on device (COPPA).
public class UchinomonCutoutModule: Module {
  public func definition() -> ModuleDefinition {
    Name("UchinomonCutout")

    // Whether the running OS can do the on-device cutout (iOS 17+).
    Function("isSupported") { () -> Bool in
      if #available(iOS 17.0, *) { return true }
      return false
    }

    // cutoutForeground(uri) -> file:// URI of a transparent PNG (foreground only).
    AsyncFunction("cutoutForeground") { (uri: String, promise: Promise) in
      guard #available(iOS 17.0, *) else {
        promise.reject("UNSUPPORTED_OS", "うちのモンの きりぬきは iOS 17 いじょうで うごきます。")
        return
      }
      DispatchQueue.global(qos: .userInitiated).async {
        do {
          let outURI = try Self.runCutout(uri: uri)
          promise.resolve(outURI)
        } catch let err as CutoutError {
          promise.reject(err.code, err.message)
        } catch {
          promise.reject("CUTOUT_FAILED", error.localizedDescription)
        }
      }
    }

    // analyze(uri) -> { colors: ["#rrggbb", ...], width, height }.
    // Dominant colors of the drawing's actual pixels (skips transparent + the
    // paper-white background) so the dex text matches what the child drew.
    AsyncFunction("analyze") { (uri: String, promise: Promise) in
      DispatchQueue.global(qos: .userInitiated).async {
        guard let cg = Self.loadNormalizedCGImage(uri: uri) else {
          promise.resolve(["colors": [String](), "width": 0, "height": 0])
          return
        }
        let colors = Self.dominantColors(cg, maxColors: 3)
        promise.resolve(["colors": colors, "width": cg.width, "height": cg.height])
      }
    }
  }

  // Render to a small RGBA buffer and bucket the non-transparent, non-paper
  // pixels into coarse color bins; return the most common bins as hex.
  static func dominantColors(_ cg: CGImage, maxColors: Int) -> [String] {
    let w = 48, h = 48
    var buf = [UInt8](repeating: 0, count: w * h * 4)
    let cs = CGColorSpaceCreateDeviceRGB()
    guard let ctx = CGContext(data: &buf, width: w, height: h, bitsPerComponent: 8,
                              bytesPerRow: w * 4, space: cs,
                              bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return [] }
    ctx.draw(cg, in: CGRect(x: 0, y: 0, width: w, height: h))

    var counts: [Int: Int] = [:]      // quantized key -> count
    var sums: [Int: (Int, Int, Int, Int)] = [:]  // key -> (r,g,b,n) for averaging
    for i in stride(from: 0, to: buf.count, by: 4) {
      let r = Int(buf[i]), g = Int(buf[i+1]), b = Int(buf[i+2]), a = Int(buf[i+3])
      if a < 128 { continue }                       // transparent (cut background)
      if r > 232 && g > 222 && b > 205 { continue }  // paper-white / cream background
      if r < 28 && g < 28 && b < 28 { continue }     // near-black crayon outline
      let key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5)  // 3 bits/channel
      counts[key, default: 0] += 1
      let s = sums[key] ?? (0, 0, 0, 0)
      sums[key] = (s.0 + r, s.1 + g, s.2 + b, s.3 + 1)
    }
    let top = counts.sorted { $0.value > $1.value }.prefix(maxColors)
    return top.compactMap { (key, _) in
      guard let s = sums[key], s.3 > 0 else { return nil }
      let r = s.0 / s.3, g = s.1 / s.3, b = s.2 / s.3
      return String(format: "#%02x%02x%02x", r, g, b)
    }
  }

  enum CutoutError: Error {
    case load, noForeground, mask, render, write
    var code: String {
      switch self {
      case .load: return "LOAD_FAILED"
      case .noForeground: return "NO_FOREGROUND"
      case .mask: return "MASK_FAILED"
      case .render: return "RENDER_FAILED"
      case .write: return "WRITE_FAILED"
      }
    }
    var message: String {
      switch self {
      case .load: return "がぞうを よみこめませんでした。"
      case .noForeground: return "おえかきが みつかりませんでした。もういちど さつえいしてね。"
      case .mask: return "きりぬきに しっぱいしました。"
      case .render: return "がぞうの しょりに しっぱいしました。"
      case .write: return "ほぞんに しっぱいしました。"
      }
    }
  }

  @available(iOS 17.0, *)
  private static func runCutout(uri: String) throws -> String {
    // 1. Load + orientation-normalize the source image.
    guard let cgImage = loadNormalizedCGImage(uri: uri) else { throw CutoutError.load }

    // 2. Run the foreground instance mask request on-device.
    let request = VNGenerateForegroundInstanceMaskRequest()
    let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
    do {
      try handler.perform([request])
    } catch {
      throw CutoutError.mask
    }
    guard let observation = request.results?.first else { throw CutoutError.noForeground }

    // 3. Scaled mask covering all detected foreground instances.
    let maskPixelBuffer: CVPixelBuffer
    do {
      maskPixelBuffer = try observation.generateScaledMaskForImage(
        forInstances: observation.allInstances, from: handler)
    } catch {
      throw CutoutError.mask
    }

    // 4. Blend original over a transparent background using the mask.
    let original = CIImage(cgImage: cgImage)
    var mask = CIImage(cvPixelBuffer: maskPixelBuffer)
    if mask.extent != original.extent, mask.extent.width > 0, mask.extent.height > 0 {
      let sx = original.extent.width / mask.extent.width
      let sy = original.extent.height / mask.extent.height
      mask = mask.transformed(by: CGAffineTransform(scaleX: sx, y: sy))
    }
    guard let blend = CIFilter(name: "CIBlendWithMask") else { throw CutoutError.render }
    blend.setValue(original, forKey: kCIInputImageKey)
    blend.setValue(CIImage.empty(), forKey: kCIInputBackgroundImageKey)
    blend.setValue(mask, forKey: kCIInputMaskImageKey)
    guard let output = blend.outputImage?.cropped(to: original.extent) else {
      throw CutoutError.render
    }

    // 5. Render to a transparent PNG and write to the temporary cache.
    let context = CIContext(options: [.useSoftwareRenderer: false])
    let colorSpace = CGColorSpace(name: CGColorSpace.sRGB) ?? CGColorSpaceCreateDeviceRGB()
    guard let png = context.pngRepresentation(of: output, format: .RGBA8, colorSpace: colorSpace) else {
      throw CutoutError.render
    }
    let dir = FileManager.default.temporaryDirectory
    let fileURL = dir.appendingPathComponent("uchinomon_cutout_\(UUID().uuidString).png")
    do {
      try png.write(to: fileURL, options: .atomic)
    } catch {
      throw CutoutError.write
    }
    return fileURL.absoluteString
  }

  // Loads a UIImage from a file://, plain path, or data: URI and returns an
  // orientation-baked CGImage so Vision/CoreImage see upright pixels.
  private static func loadNormalizedCGImage(uri: String) -> CGImage? {
    var image: UIImage?
    if uri.hasPrefix("data:"), let commaIdx = uri.firstIndex(of: ","),
       let data = Data(base64Encoded: String(uri[uri.index(after: commaIdx)...])) {
      image = UIImage(data: data)
    } else {
      let path = uri.hasPrefix("file://") ? (URL(string: uri)?.path ?? uri) : uri
      image = UIImage(contentsOfFile: path)
    }
    guard let img = image else { return nil }
    if img.imageOrientation == .up, let cg = img.cgImage { return cg }
    UIGraphicsBeginImageContextWithOptions(img.size, false, img.scale)
    defer { UIGraphicsEndImageContext() }
    img.draw(in: CGRect(origin: .zero, size: img.size))
    return UIGraphicsGetImageFromCurrentImageContext()?.cgImage
  }
}
