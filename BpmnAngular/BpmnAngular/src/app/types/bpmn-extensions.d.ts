// Type declarations for BPMN.js extension modules

declare module 'bpmn-js-connectors-extension' {
  interface ConnectorsExtensionModule {
    __init__: string[];
    connectorsExtension: (config: any) => any;
  }
  
  const ConnectorsExtension: ConnectorsExtensionModule;
  export default ConnectorsExtension;
}

declare module 'bpmn-js-task-resize' {
  interface TaskResizeModule {
    __init__: string[];
    taskResize: (config: any) => any;
  }
  
  const TaskResize: TaskResizeModule;
  export default TaskResize;
}

declare module 'bpmn-js-token-simulation' {
  interface TokenSimulationModule {
    __init__: string[];
    tokenSimulation: (config: any) => any;
  }
  
  const TokenSimulation: TokenSimulationModule;
  export default TokenSimulation;
}

declare module 'bpmn-js-color-picker' {
  interface ColorPickerModule {
    __init__: string[];
    colorPicker: (config: any) => any;
  }
  
  const ColorPicker: ColorPickerModule;
  export default ColorPicker;
}

declare module 'bpmn-js-bpmnlint' {
  interface BpmnLintModule {
    __init__: string[];
    bpmnLint: (config: any) => any;
  }
  
  const BpmnLint: BpmnLintModule;
  export default BpmnLint;
}

declare module 'bpmn-js-embedded-comments' {
  interface EmbeddedCommentsModule {
    __init__: string[];
    embeddedComments: (config: any) => any;
  }
  
  const EmbeddedComments: EmbeddedCommentsModule;
  export default EmbeddedComments;
}
