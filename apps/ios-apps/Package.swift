// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "iFastFoodApple",
    platforms: [
        .iOS(.v16),
        .macOS(.v13)
    ],
    products: [
        .library(name: "iFastFoodCore", targets: ["iFastFoodCore"]),
    ],
    dependencies: [
        // Consome os modelos gerados via openapi-generator swift-client
    ],
    targets: [
        .target(
            name: "iFastFoodCore",
            dependencies: [],
            path: "Sources/iFastFoodCore"
        ),
    ]
)
