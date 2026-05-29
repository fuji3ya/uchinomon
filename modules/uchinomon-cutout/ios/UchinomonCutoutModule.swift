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
