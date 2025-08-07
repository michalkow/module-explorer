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
    private fileWatcher: vscode.FileSystemWatcher | undefined;

    constructor() {
        this.refresh();
        
        // Listen for workspace folder changes
        vscode.workspace.onDidChangeWorkspaceFolders(() => {
            console.log('Workspace folders changed, refreshing...');
            this.refresh();
        });
        
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('modulesExplorer')) {
                console.log('Configuration changed, refreshing...');
                // Recreate file watcher with new configuration
                this.setupFileWatcher();
                this.refresh();
            }
        });
        
        // Also refresh when files change
        this.setupFileWatcher();
    }

    private setupFileWatcher() {
        // Dispose of existing watcher if any
        if (this.fileWatcher) {
            this.fileWatcher.dispose();
        }
        
        const config = vscode.workspace.getConfiguration('modulesExplorer');
        const modulesFolder = config.get<string>('modulesFolder', 'modules');
        
        // Create file watcher based on configuration
        const pattern = `**/**/src/${modulesFolder}/**/*`;
        this.fileWatcher = vscode.workspace.createFileSystemWatcher(pattern);
        
        this.fileWatcher.onDidCreate(() => this.refresh());
        this.fileWatcher.onDidDelete(() => this.refresh());
        this.fileWatcher.onDidChange(() => this.refresh());
    }

    async refresh() {
        this.modules = await this.scanModules();
        this._onDidChangeTreeData.fire();
    }

    async scanModules(): Promise<Record<string, ModuleFile[]>> {
        const config = vscode.workspace.getConfiguration('modulesExplorer');
        const configuredDirectories = config.get<string[]>('directories', []);
        const modulesFolder = config.get<string>('modulesFolder', 'modules');
        const filePattern = config.get<string>('filePattern', '*.*');
        
        const roots = vscode.workspace.workspaceFolders?.map(f => f.uri.fsPath) ?? [];
        
        if (roots.length === 0 && configuredDirectories.length === 0) {
            console.log('No workspace folders open and no directories configured');
            vscode.window.showWarningMessage('Module Explorer: No workspace folder open and no directories configured. Please open a folder or configure directories to scan for modules.');
            return {};
        }
        
        // Build patterns based on configuration
        const patterns: string[] = [];
        
        // If configured directories are provided, use them
        if (configuredDirectories.length > 0) {
            patterns.push(...configuredDirectories);
        } else {
            // Otherwise use the default patterns with the configured modules folder name
            patterns.push(
                `apps/**/src/${modulesFolder}/*`,
                `packages/**/src/${modulesFolder}/*`
            );
        }
        
        let moduleMap: Record<string, ModuleFile[]> = {};

        console.log('Scanning with patterns:', patterns);
        
        // Handle configured directories which might be absolute paths or glob patterns
        if (configuredDirectories.length > 0) {
            // Process configured directories/patterns directly
            const found = await fg(patterns, { onlyDirectories: true, absolute: true });
            console.log(`Found ${found.length} module directories from configured patterns`);
            
            for (const modDir of found) {
                const moduleName = path.basename(modDir);
                const files = await fg(path.join(modDir, '**', filePattern), { onlyFiles: true });
                if (!moduleMap[moduleName]) {
                    moduleMap[moduleName] = [];
                }
                
                // For configured directories, use the parent directory name as root folder
                const parentDir = path.dirname(modDir);
                const rootFolder = path.basename(parentDir);
                
                for (const file of files) {
                    moduleMap[moduleName].push({
                        moduleName,
                        filePath: file,
                        label: path.basename(file),
                        rootFolder
                    });
                }
            }
        } else {
            // Use default patterns with workspace roots
            console.log('Scanning workspace roots:', roots);
            
            for (const root of roots) {
                const searchPatterns = patterns.map(p => path.join(root, p));
                console.log('Searching in:', searchPatterns);
                
                const found = await fg(searchPatterns, { onlyDirectories: true });
                console.log(`Found ${found.length} module directories in ${root}`);
                
                for (const modDir of found) {
                    const moduleName = path.basename(modDir);
                    const files = await fg(path.join(modDir, '**', filePattern), { onlyFiles: true });
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
                            label: path.basename(file),
                            rootFolder
                        });
                    }
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
                const config = vscode.workspace.getConfiguration('modulesExplorer');
                const configuredDirectories = config.get<string[]>('directories', []);
                const modulesFolder = config.get<string>('modulesFolder', 'modules');
                
                let message = 'No modules found.';
                if (configuredDirectories.length > 0) {
                    message += ` Looking in configured directories: ${configuredDirectories.join(', ')}`;
                } else if (vscode.workspace.workspaceFolders) {
                    message += ` Looking for: apps/**/src/${modulesFolder}/* or packages/**/src/${modulesFolder}/*`;
                } else {
                    message = 'No workspace folder open and no directories configured. Please open a folder or configure directories.';
                }
                    
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
        
        // Apply styling based on type
        switch(type) {
            case 'module':
                this.iconPath = new vscode.ThemeIcon('package', new vscode.ThemeColor('descriptionForeground'));
                this.contextValue = 'module';
                break;
            case 'folder':
                // Make folder labels muted and non-interactive
                this.contextValue = 'folder-label';
                // Add visual indicator that this is a label/separator
                this.label = '';
                // Make it non-selectable
                this.command = undefined;
                this.tooltip = undefined;
                // Use collapsibleState None to ensure it's not expandable
                this.collapsibleState = vscode.TreeItemCollapsibleState.None;
                // Use description to make text appear in muted color
                this.description = label;

                
                break;
            case 'file':
                this.iconPath = new vscode.ThemeIcon('file');
                this.contextValue = 'file';
                if (command) {
                    this.command = command;
                }
                break;
        }
    }
}

// Export classes for testing
export { ModulesTreeDataProvider, TreeItem };

export function deactivate() {}
