export class ImportExport {
    constructor(mapData, uiManager, renderer) {
        this.mapData = mapData;
        this.uiManager = uiManager;
        this.renderer = renderer;
    }

    exportMap() {
        const originalData = this.mapData.getData();
        // Create a deep copy to modify for export without altering the current mapData
        const exportData = JSON.parse(JSON.stringify(originalData)); 
        
        // Invert curve values for Haxball export compatibility
        if (exportData.segments) {
            exportData.segments.forEach(segment => {
                if (segment.curve !== undefined && segment.curve !== 0) {
                    segment.curve *= -1;
                }
            });
        }

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = exportData.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.hbs';
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }

    importMap() {
        document.getElementById('importFile').click();
    }

    handleImportFile(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    let importedData = JSON.parse(event.target.result);
                    
                    // Invert curve values upon import to match editor's rendering
                    if (importedData.segments) {
                        importedData.segments.forEach(segment => {
                            if (segment.curve !== undefined && segment.curve !== 0) {
                                segment.curve *= -1;
                            }
                        });
                    }

                    this.mapData.setData(importedData);
                    this.uiManager.updateInputs();
                    this.uiManager.updateUI();
                    this.renderer.render(this.mapData);
                } catch (error) {
                    alert('Invalid file: ' + error.message);
                }
            };
            reader.readAsText(file);
        }
    }
}
