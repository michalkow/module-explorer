# Modules Explorer

**Navigate your codebase by logical modules rather than nested folders.**

> Perfect for monorepos, micro‑services, and any project where related files live in different packages or layers.

---

## Motivation

Modern repositories often scatter a single feature’s files across separate front‑end and back‑end packages. Scrolling through the regular *File Explorer* gets tedious when `user.model.ts`, `user.controller.ts`, and `user.service.ts` live miles apart. **Modules Explorer** lets you see those files side‑by‑side in one dedicated view, so you can stay focused on features instead of folders.

## Features

* **Modules Explorer View** – a new tree in the Activity Bar that groups every *module* (folder) and displays its files in a flat list.
* **Monorepo‑friendly** – works across multiple workspace folders and package managers.
* **Configurable roots** – point the extension at the directories that contain your modules (e.g. `packages/*/src/modules`).
* **Globs & patterns** – include or exclude files with familiar glob syntax.
* **One‑click navigation** – open any file straight from the tree.
- **Clean Interface**: Provides a focused view of your modular architecture

## Installation

1. Launch VS Code.
2. Open the **Extensions** view (`Ctrl+Shift+X`).
3. Search for **“Modules Explorer”** and click **Install**.

*…or from the command line:*

```bash
code --install-extension yourpublisher.modules-explorer
```

## Usage

1. Open a workspace folder in VS Code
2. The "Modules" view will appear in the Explorer panel
3. Expand module names to see all files organized by their root folder
4. Click on any file to open it in the editor

## Extension Settings

| Setting                       | Type       | Default | Description                                                                |
| ----------------------------- | ---------- | ------- | -------------------------------------------------------------------------- |
| `modulesExplorer.directories` | `string[]` | `[]`    | Array of absolute paths or glob patterns that point to folders with module directories. |
| `modulesExplorer.modulesFolder` | `string`  | `modules`  | Name of the modules directory.                          |
| `modulesExplorer.filePattern` | `string`   | `*.*`   | Glob pattern for files to show inside a module.                            |

## Example Structure

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

No additional dependencies – it runs anywhere VS Code does.

## Known Issues

None so far. Found a bug? [Open an issue](https://github.com/yourusername/modules-explorer/issues).

## Release Notes

### 0.0.1 – *Initial release*

* Core **Modules Explorer** view
* Configurable directories & file patterns

---

## Contributing

Pull requests are welcome! Please read the [contribution guide](CONTRIBUTING.md) first.

## License

[MIT](LICENSE)