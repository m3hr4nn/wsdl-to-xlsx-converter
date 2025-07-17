/**
 * WSDL to Excel Documentation Generator
 * Main JavaScript file for handling file processing and Excel generation
 */

let currentFile = null;
let processedData = null;

// DOM elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const processBtn = document.getElementById('processBtn');
const status = document.getElementById('status');
const previewSection = document.getElementById('previewSection');
const previewContent = document.getElementById('previewContent');
const downloadBtn = document.getElementById('downloadBtn');

// Initialize event listeners
function initializeEventListeners() {
    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('drop', handleDrop);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    fileInput.addEventListener('change', handleFileSelect);
    processBtn.addEventListener('click', processWSDL);
    downloadBtn.addEventListener('click', downloadExcel);
}

// Drag and drop handlers
function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFileSelect(e) {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
}

// File handling
function handleFile(file) {
    const validExtensions = ['.wsdl', '.xml'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!validExtensions.includes(fileExtension)) {
        showStatus('Please select a valid WSDL or XML file.', 'error');
        return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showStatus('File size must be less than 5MB.', 'error');
        return;
    }

    currentFile = file;
    fileName.textContent = file.name;
    fileSize.textContent = `Size: ${formatFileSize(file.size)}`;
    fileInfo.style.display = 'block';
    processBtn.disabled = false;
    hideStatus();
    previewSection.style.display = 'none';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Status management
function showStatus(message, type) {
    status.textContent = message;
    status.className = `status ${type}`;
    status.style.display = 'block';
    
    if (type === 'processing') {
        const spinner = document.createElement('div');
        spinner.className = 'spinner';
        status.insertBefore(spinner, status.firstChild);
    }
}

function hideStatus() {
    status.style.display = 'none';
    status.innerHTML = '';
}

// File reading utility
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

// Main WSDL processing function
async function processWSDL() {
    if (!currentFile) return;

    showStatus('Processing WSDL file...', 'processing');
    processBtn.disabled = true;

    try {
        const xmlContent = await readFileAsText(currentFile);
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

        // Check for parsing errors
        const parseError = xmlDoc.querySelector('parsererror');
        if (parseError) {
            throw new Error('Invalid XML/WSDL file format. Please check your file and try again.');
        }

        // Extract WSDL information
        const wsdlData = extractWSDLData(xmlDoc);
        processedData = wsdlData;

        // Show preview
        displayPreview(wsdlData);
        showStatus('WSDL processed successfully! Ready to download Excel file.', 'success');
        
    } catch (error) {
        console.error('Error processing WSDL:', error);
        showStatus(`Error processing WSDL: ${error.message}`, 'error');
    } finally {
        processBtn.disabled = false;
    }
}

// WSDL data extraction
function extractWSDLData(xmlDoc) {
    const data = {
        serviceName: '',
        targetNamespace: '',
        services: [],
        portTypes: [],
        operations: [],
        messages: [],
        complexTypes: [],
        simpleTypes: [],
        bindings: [],
        documentation: ''
    };

    try {
        // Extract basic information
        const definitions = xmlDoc.querySelector('definitions');
        if (definitions) {
            data.serviceName = definitions.getAttribute('name') || 'Unknown Service';
            data.targetNamespace = definitions.getAttribute('targetNamespace') || '';
        }

        // Extract documentation
        const documentation = xmlDoc.querySelector('documentation');
        if (documentation) {
            data.documentation = documentation.textContent || '';
        }

        // Extract services
        extractServices(xmlDoc, data);
        
        // Extract port types and operations
        extractPortTypes(xmlDoc, data);
        
        // Extract messages
        extractMessages(xmlDoc, data);
        
        // Extract complex types
        extractComplexTypes(xmlDoc, data);
        
        // Extract simple types
        extractSimpleTypes(xmlDoc, data);
        
        // Extract bindings
        extractBindings(xmlDoc, data);

    } catch (error) {
        console.error('Error extracting WSDL data:', error);
        throw new Error('Failed to extract WSDL data. Please check your file format.');
    }

    return data;
}

function extractServices(xmlDoc, data) {
    const services = xmlDoc.querySelectorAll('service');
    services.forEach(service => {
        const serviceData = {
            name: service.getAttribute('name') || 'Unknown',
            ports: []
        };

        const ports = service.querySelectorAll('port');
        ports.forEach(port => {
            const address = port.querySelector('address');
            serviceData.ports.push({
                name: port.getAttribute('name') || 'Unknown',
                binding: port.getAttribute('binding') || 'Unknown',
                location: address ? address.getAttribute('location') : 'Unknown'
            });
        });

        data.services.push(serviceData);
    });
}

function extractPortTypes(xmlDoc, data) {
    const portTypes = xmlDoc.querySelectorAll('portType');
    portTypes.forEach(portType => {
        const portTypeData = {
            name: portType.getAttribute('name') || 'Unknown',
            operations: []
        };

        const operations = portType.querySelectorAll('operation');
        operations.forEach(operation => {
            const operationData = {
                name: operation.getAttribute('name') || 'Unknown',
                input: '',
                output: '',
                fault: '',
                documentation: ''
            };

            const input = operation.querySelector('input');
            const output = operation.querySelector('output');
            const fault = operation.querySelector('fault');
            const doc = operation.querySelector('documentation');

            if (input) operationData.input = input.getAttribute('message') || '';
            if (output) operationData.output = output.getAttribute('message') || '';
            if (fault) operationData.fault = fault.getAttribute('message') || '';
            if (doc) operationData.documentation = doc.textContent || '';

            portTypeData.operations.push(operationData);
            data.operations.push(operationData);
        });

        data.portTypes.push(portTypeData);
    });
}

function extractMessages(xmlDoc, data) {
    const messages = xmlDoc.querySelectorAll('message');
    messages.forEach(message => {
        const messageData = {
            name: message.getAttribute('name') || 'Unknown',
            parts: []
        };

        const parts = message.querySelectorAll('part');
        parts.forEach(part => {
            messageData.parts.push({
                name: part.getAttribute('name') || 'Unknown',
                element: part.getAttribute('element') || '',
                type: part.getAttribute('type') || ''
            });
        });

        data.messages.push(messageData);
    });
}

function extractComplexTypes(xmlDoc, data) {
    const complexTypes = xmlDoc.querySelectorAll('complexType');
    complexTypes.forEach(complexType => {
        const typeData = {
            name: complexType.getAttribute('name') || 'Unknown',
            elements: []
        };

        const elements = complexType.querySelectorAll('element');
        elements.forEach(element => {
            typeData.elements.push({
                name: element.getAttribute('name') || 'Unknown',
                type: element.getAttribute('type') || 'Unknown',
                minOccurs: element.getAttribute('minOccurs') || '1',
                maxOccurs: element.getAttribute('maxOccurs') || '1'
            });
        });

        data.complexTypes.push(typeData);
    });
}

function extractSimpleTypes(xmlDoc, data) {
    const simpleTypes = xmlDoc.querySelectorAll('simpleType');
    simpleTypes.forEach(simpleType => {
        const typeData = {
            name: simpleType.getAttribute('name') || 'Unknown',
            restriction: '',
            enumerations: []
        };

        const restriction = simpleType.querySelector('restriction');
        if (restriction) {
            typeData.restriction = restriction.getAttribute('base') || '';
            
            const enumerations = restriction.querySelectorAll('enumeration');
            enumerations.forEach(enumeration => {
                typeData.enumerations.push(enumeration.getAttribute('value') || '');
            });
        }

        data.simpleTypes.push(typeData);
    });
}

function extractBindings(xmlDoc, data) {
    const bindings = xmlDoc.querySelectorAll('binding');
    bindings.forEach(binding => {
        const bindingData = {
            name: binding.getAttribute('name') || 'Unknown',
            type: binding.getAttribute('type') || 'Unknown',
            style: '',
            transport: '',
            operations: []
        };

        const soapBinding = binding.querySelector('binding');
        if (soapBinding) {
            bindingData.style = soapBinding.getAttribute('style') || '';
            bindingData.transport = soapBinding.getAttribute('transport') || '';
        }

        const operations = binding.querySelectorAll('operation');
        operations.forEach(operation => {
            const soapOperation = operation.querySelector('operation');
            bindingData.operations.push({
                name: operation.getAttribute('name') || 'Unknown',
                soapAction: soapOperation ? soapOperation.getAttribute('soapAction') : ''
            });
        });

        data.bindings.push(bindingData);
    });
}

// Preview display
function displayPreview(data) {
    const preview = [
        `<div class="preview-item"><strong>Service Name:</strong> ${data.serviceName}</div>`,
        `<div class="preview-item"><strong>Target Namespace:</strong> ${data.targetNamespace}</div>`,
        `<div class="preview-item"><strong>Services:</strong> ${data.services.length}</div>`,
        `<div class="preview-item"><strong>Port Types:</strong> ${data.portTypes.length}</div>`,
        `<div class="preview-item"><strong>Operations:</strong> ${data.operations.length}</div>`,
        `<div class="preview-item"><strong>Messages:</strong> ${data.messages.length}</div>`,
        `<div class="preview-item"><strong>Complex Types:</strong> ${data.complexTypes.length}</div>`,
        `<div class="preview-item"><strong>Simple Types:</strong> ${data.simpleTypes.length}</div>`,
        `<div class="preview-item"><strong>Bindings:</strong> ${data.bindings.length}</div>`
    ];

    if (data.documentation) {
        preview.unshift(`<div class="preview-item"><strong>Documentation:</strong> ${data.documentation.substring(0, 100)}${data.documentation.length > 100 ? '...' : ''}</div>`);
    }

    previewContent.innerHTML = preview.join('');
    previewSection.style.display = 'block';
}

// Excel generation and download
function downloadExcel() {
    if (!processedData) {
        showStatus('No processed data available. Please process a WSDL file first.', 'error');
        return;
    }

    try {
        const wb = XLSX.utils.book_new();

        // Overview sheet
        createOverviewSheet(wb, processedData);

        // Services sheet
        if (processedData.services.length > 0) {
            createServicesSheet(wb, processedData.services);
        }

        // Port Types sheet
        if (processedData.portTypes.length > 0) {
            createPortTypesSheet(wb, processedData.portTypes);
        }

        // Operations sheet
        if (processedData.operations.length > 0) {
            createOperationsSheet(wb, processedData.operations);
        }

        // Messages sheet
        if (processedData.messages.length > 0) {
            createMessagesSheet(wb, processedData.messages);
        }

        // Complex Types sheet
        if (processedData.complexTypes.length > 0) {
            createComplexTypesSheet(wb, processedData.complexTypes);
        }

        // Simple Types sheet
        if (processedData.simpleTypes.length > 0) {
            createSimpleTypesSheet(wb, processedData.simpleTypes);
        }

        // Bindings sheet
        if (processedData.bindings.length > 0) {
            createBindingsSheet(wb, processedData.bindings);
        }

        // Generate and download file
        const fileName = `${processedData.serviceName.replace(/[^a-zA-Z0-9]/g, '_')}_Documentation_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);

        showStatus('Excel file downloaded successfully!', 'success');
    } catch (error) {
        console.error('Error generating Excel file:', error);
        showStatus('Error generating Excel file. Please try again.', 'error');
    }
}

// Excel sheet creation functions
function createOverviewSheet(wb, data) {
    const overviewData = [
        ['Property', 'Value'],
        ['Service Name', data.serviceName],
        ['Target Namespace', data.targetNamespace],
        ['Documentation', data.documentation]
    ];
    const ws = XLSX.utils.aoa_to_sheet(overviewData);
    XLSX.utils.book_append_sheet(wb, ws, 'Overview');
}

function createServicesSheet(wb, services) {
    const data = [['Service Name', 'Port Name', 'Binding', 'Location']];
    services.forEach(service => {
        service.ports.forEach(port => {
            data.push([service.name, port.name, port.binding, port.location]);
        });
    });
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Services');
}

function createPortTypesSheet(wb, portTypes) {
    const data = [['Port Type Name', 'Operation Name', 'Input', 'Output', 'Fault', 'Documentation']];
    portTypes.forEach(pt => {
        pt.operations.forEach(op => {
            data.push([pt.name, op.name, op.input, op.output, op.fault, op.documentation]);
        });
    });
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Port Types');
}

function createOperationsSheet(wb, operations) {
    const data = [['Operation Name', 'Input', 'Output', 'Fault', 'Documentation']];
    operations.forEach(op => {
        data.push([op.name, op.input, op.output, op.fault, op.documentation]);
    });
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Operations');
}

function createMessagesSheet(wb, messages) {
    const data = [['Message Name', 'Part Name', 'Element', 'Type']];
    messages.forEach(msg => {
        msg.parts.forEach(part => {
            data.push([msg.name, part.name, part.element, part.type]);
        });
    });
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Messages');
}

function createComplexTypesSheet(wb, complexTypes) {
    const data = [['Complex Type Name', 'Element Name', 'Type', 'Min Occurs', 'Max Occurs']];
    complexTypes.forEach(ct => {
        ct.elements.forEach(el => {
            data.push([ct.name, el.name, el.type, el.minOccurs, el.maxOccurs]);
        });
    });
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Complex Types');
}

function createSimpleTypesSheet(wb, simpleTypes) {
    const data = [['Simple Type Name', 'Restriction Base', 'Enumeration']];
    simpleTypes.forEach(st => {
        if (st.enumerations.length > 0) {
            st.enumerations.forEach(enumVal => {
                data.push([st.name, st.restriction, enumVal]);
            });
        } else {
            data.push([st.name, st.restriction, '']);
        }
    });
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Simple Types');
}

function createBindingsSheet(wb, bindings) {
    const data = [['Binding Name', 'Type', 'Style', 'Transport', 'Operation Name', 'SOAP Action']];
    bindings.forEach(binding => {
        if (binding.operations.length > 0) {
            binding.operations.forEach(op => {
                data.push([binding.name, binding.type, binding.style, binding.transport, op.name, op.soapAction]);
            });
        } else {
            data.push([binding.name, binding.type, binding.style, binding.transport, '', '']);
        }
    });
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Bindings');
}

// Initialize the listeners after DOM is ready
document.addEventListener('DOMContentLoaded', initializeEventListeners);

      
