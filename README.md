# Module Explorer

A Visual Studio Code extension that provides a dedicated explorer view for discovering and navigating modules in your workspace. Perfect for monorepo projects with modular architectures.

## Features

- **Module Discovery**: Automatically scans your workspace for modules located in `src/modules/` directories
- **Hierarchical View**: Organizes modules by name and groups files by their root folder (app, packages, etc.)
- **Quick Navigation**: Click on any file to open it directly in the editor
- **Real-time Updates**: Automatically refreshes when files are added, modified, or deleted
- **Multi-workspace Support**: Works with multiple workspace folders
- **Clean Interface**: Provides a focused view of your modular architecture

## Usage

1. Open a workspace folder in VS Code
2. The "Modules" view will appear in the Explorer panel
3. Expand module names to see all files organized by their root folder
4. Click on any file to open it in the editor

## Supported Project Structure

The extension looks for modules in the following patterns:
- `apps/**/src/modules/*`
- `packages/**/src/modules/*`

### Example Structure

```
workspace/
├── app/
│   └── feature1/
│       └── src/
│           └── modules/
│               ├── auth/
│               │   ├── index.ts
│               │   └── types.ts
│               └── users/
│                   ├── index.ts
│                   └── api.ts
└── packages/
    ├── core/
    │   └── src/
    │       └── modules/
    │           └── utils/
    │               └── index.ts
    └── ui/
        └── src/
            └── modules/
                └── components/
                    └── index.ts
```

This would display in the Modules explorer as:
```
📦 auth
  app/feature1
    index.ts
    types.ts

📦 users
  app/feature1
    api.ts
    index.ts

📦 utils
  packages/core
    index.ts

📦 components
  packages/ui
    index.ts
```

## Requirements

- Visual Studio Code 1.99.3 or higher
- A workspace with modules following the supported directory structure

## Extension Settings

This extension does not currently add any VS Code settings. It automatically activates when a workspace is opened and scans for modules.

## Known Issues

- The extension currently only supports TypeScript/JavaScript files
- Module scanning is limited to the `src/modules/` pattern
- Large workspaces with many modules may experience slower initial scanning

## Release Notes

### 0.0.1

Initial release of Module Explorer:
- Basic module discovery and tree view
- File navigation capabilities
- Real-time file system watching
- Support for multi-workspace projects

## Contributing

Feel free to submit issues and enhancement requests!

## License

This extension is provided as-is for educational and development purposes.

---

**Enjoy exploring your modules! 🚀**
