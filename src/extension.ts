import * as vscode from 'vscode';
import * as path from 'path';
import fg from 'fast-glob';

type ModuleFile = {
    moduleName: string;
    filePath: string;
    label: string;
    rootFolder: string; // The folder above src/modules (e.g., 'app', 'packages/core')
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
                if (!moduleMap[moduleName]) {
                    moduleMap[moduleName] = [];
                }
                
                // Extract the root folder (the folder above src/modules)
                const relativePath = path.relative(root, modDir);
                const pathParts = relativePath.split(path.sep);
                // Find the index of 'src' in the path
                const srcIndex = pathParts.indexOf('src');
                // The root folder is everything before 'src'
                const rootFolder = srcIndex > 0 ? pathParts.slice(0, srcIndex).join('/') : pathParts[0];
                
                for (const file of files) {
                    moduleMap[moduleName].push({
                        moduleName,
                        filePath: file,
                        label: path.basename(file), // Only filename, not full path
                        rootFolder
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
                    new TreeItem(message, vscode.TreeItemCollapsibleState.None, 'file')
                ]);
            }
            
            return Promise.resolve(moduleNames
                .sort()
                .map(m => new TreeItem(m, vscode.TreeItemCollapsibleState.Collapsed, 'module')));
        }
        
        if (element.type === 'module' && this.modules[element.label as string]) {
            // Group files by root folder
            const files = this.modules[element.label as string];
            const folderGroups: Record<string, ModuleFile[]> = {};
            
            files.forEach(file => {
                if (!folderGroups[file.rootFolder]) {
                    folderGroups[file.rootFolder] = [];
                }
                folderGroups[file.rootFolder].push(file);
            });
            
            const items: TreeItem[] = [];
            
            // Sort folders and create tree items
            Object.keys(folderGroups).sort().forEach(folder => {
                // Add folder label
                items.push(new TreeItem(folder, vscode.TreeItemCollapsibleState.None, 'folder'));
                
                // Add files under this folder
                folderGroups[folder].sort((a, b) => a.label.localeCompare(b.label)).forEach(file => {
                    items.push(new TreeItem(
                        file.label,
                        vscode.TreeItemCollapsibleState.None,
                        'file',
                        {
                            command: 'modulesExplorer.openFile',
                            title: 'Open File',
                            arguments: [file.filePath]
                        }
                    ));
                });
            });
            
            return Promise.resolve(items);
        }
        
        return Promise.resolve([]);
    }
}

class TreeItem extends vscode.TreeItem {
    public type: 'module' | 'folder' | 'file';
    public data?: any;
    
    constructor(
        label: string,
        collapsibleState: vscode.TreeItemCollapsibleState,
        type: 'module' | 'folder' | 'file' = 'file',
        command?: vscode.Command,
        data?: any
    ) {
        super(label, collapsibleState);
        this.type = type;
        this.data = data;
        if (command) {
            this.command = command;
        }
        this.contextValue = type;
        
        // Style folder labels differently
        if (type === 'folder') {
            // Make folder labels muted and non-interactive
            this.contextValue = 'folder-label';
            // Add visual indicator that this is a label/separator
            this.label = `— ${label} —`;
            // Make it non-selectable
            this.command = undefined;
            this.tooltip = undefined;
            // Use collapsibleState None to ensure it's not expandable
            this.collapsibleState = vscode.TreeItemCollapsibleState.None;
        }
    }
}

// Export classes for testing
export { ModulesTreeDataProvider, TreeItem };

export function deactivate() {}
