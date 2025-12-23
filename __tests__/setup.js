// Test setup file
// Mocks external dependencies and sets up test environment

// Mock Highcharts
global.Highcharts = {
    Chart: jest.fn(function(config) {
        this.config = config;
        this.destroy = jest.fn();
        this.series = [];
        this.xAxis = [];
        this.yAxis = [];
        return this;
    }),
    map: jest.fn(),
    setOptions: jest.fn()
};

// Mock Monaco Editor
global.monaco = {
    editor: {
        create: jest.fn(() => ({
            getValue: jest.fn(() => ''),
            setValue: jest.fn(),
            getSelection: jest.fn(() => ({
                startLineNumber: 1,
                startColumn: 1,
                endLineNumber: 1,
                endColumn: 1
            })),
            executeEdits: jest.fn(),
            focus: jest.fn(),
            dispose: jest.fn(),
            onDidChangeModelContent: jest.fn()
        })),
        setModelMarkers: jest.fn()
    },
    languages: {
        registerCompletionItemProvider: jest.fn()
    },
    Range: jest.fn((startLine, startCol, endLine, endCol) => ({
        startLineNumber: startLine,
        startColumn: startCol,
        endLineNumber: endLine,
        endColumn: endCol
    }))
};

// Mock require for Monaco loader
global.require = jest.fn((modules, callback) => {
    if (typeof callback === 'function') {
        callback();
    }
});
global.require.config = jest.fn();

// Mock localStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: jest.fn(key => store[key] || null),
        setItem: jest.fn((key, value) => {
            store[key] = String(value);
        }),
        removeItem: jest.fn(key => {
            delete store[key];
        }),
        clear: jest.fn(() => {
            store = {};
        })
    };
})();
global.localStorage = localStorageMock;

// Reset localStorage before each test
beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
});

