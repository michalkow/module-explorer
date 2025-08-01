import * as vscode from 'vscode';
import * as path from 'path';
import fg from 'fast-glob';

type ModuleFile = {
    moduleName: string;
    filePath: string;
    label: string;
};

export function activate(context: vscode.ExtensionContext) {
	console.log("Modules Explorer Extension Activated!");
	console.log("Context:", context.extensionPath);
	console.log("Workspace folders:", vscode.workspace.workspaceFolders?.map(f => f.uri.fsPath));
	
	// Show a message to confirm activation
	vscode.window.showInformationMessage('Module Explorer extension is now active!');
	
    const treeDataProvider = new ModulesTreeDataProvider();

    vscode.window.registerTreeDataProvider('modulesExplorer', treeDataProvider);

    context.subscriptions.push(
        vscode.commands.registerCommand('modulesExplorer.openFile', (filePath: string) => {
            vscode.window.showTextDocument(vscode.Uri.file(filePath));
        })
    );
}

class ModulesTreeDataProvider implements vscode.TreeDataProvider<TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | void> = new vscode.EventEmitter<TreeItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | void> = this._onDidChangeTreeData.event;

    public modules: Record<string, ModuleFile[]> = {};  // Made public for testing

    constructor() {
        this.refresh();
        
        // Listen for workspace folder changes
        vscode.workspace.onDidChangeWorkspaceFolders(() => {
            console.log('Workspace folders changed, refreshing...');
            this.refresh();
        });
        
        // Also refresh when files change
        const watcher = vscode.workspace.createFileSystemWatcher('**/**/src/modules/**/*');
        watcher.onDidCreate(() => this.refresh());
        watcher.onDidDelete(() => this.refresh());
        watcher.onDidChange(() => this.refresh());
    }

    async refresh() {
        this.modules = await this.scanModules();
        this._onDidChangeTreeData.fire();
    }

    async scanModules(): Promise<Record<string, ModuleFile[]>> {
        const roots = vscode.workspace.workspaceFolders?.map(f => f.uri.fsPath) ?? [];
        
        if (roots.length === 0) {
            console.log('No workspace folders open');
            vscode.window.showWarningMessage('Module Explorer: No workspace folder open. Please open a folder to scan for modules.');
            return {};
        }
        
        const patterns = [
            'apps/**/src/modules/*',
            'packages/**/src/modules/*'
        ];
        let moduleMap: Record<string, ModuleFile[]> = {};

        console.log('Scanning workspace roots:', roots);
        console.log('Looking for patterns:', patterns);
        
        for (const root of roots) {
            const searchPatterns = patterns.map(p => path.join(root, p));
            console.log('Searching in:', searchPatterns);
            
            const found = await fg(searchPatterns, { onlyDirectories: true, deep: 4 });
            console.log(`Found ${found.length} module directories in ${root}`);
            
            for (const modDir of found) {
                const moduleName = path.basename(modDir);
                const files = await fg(path.join(modDir, '**/*.*'), { onlyFiles: true });
                if (!moduleMap[moduleName]) moduleMap[moduleName] = [];
                for (const file of files) {
                    moduleMap[moduleName].push({
                        moduleName,
                        filePath: file,
                        label: path.relative(root, file)
                    });
                }
            }
        }
        return moduleMap;
    }

    getTreeItem(element: TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TreeItem): Thenable<TreeItem[]> {
        if (!element) {
            // root: modules
            const moduleNames = Object.keys(this.modules);
            
            if (moduleNames.length === 0) {
                // Show helpful message when no modules found
                const message = vscode.workspace.workspaceFolders 
                    ? 'No modules found. Looking for: app/**/src/modules/* or packages/**/src/modules/*'
                    : 'No workspace folder open. Please open a folder.';
                    
                return Promise.resolve([
                    new TreeItem(message, vscode.TreeItemCollapsibleState.None)
                ]);
            }
            
            return Promise.resolve(moduleNames
                .sort()
                .map(m => new TreeItem(m, vscode.TreeItemCollapsibleState.Collapsed)));
        }
        if (this.modules[element.label as string]) {
            // children: files
            return Promise.resolve(this.modules[element.label as string].map(file =>
                new TreeItem(
                    file.label,
                    vscode.TreeItemCollapsibleState.None,
                    {
                        command: 'modulesExplorer.openFile',
                        title: 'Open File',
                        arguments: [file.filePath]
                    }
                )
            ));
        }
        return Promise.resolve([]);
    }
}

class TreeItem extends vscode.TreeItem {
    constructor(
        label: string,
        collapsibleState: vscode.TreeItemCollapsibleState,
        command?: vscode.Command
    ) {
        super(label, collapsibleState);
        if (command) this.command = command;
        this.contextValue = 'file';
    }
}

// Export classes for testing
export { ModulesTreeDataProvider, TreeItem };

export function deactivate() {}
