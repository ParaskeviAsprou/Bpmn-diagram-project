declare module 'bpmn-js/lib/Modeler' {
    import { Modeler as BpmnModeler } from 'bpmn-js';
    import { propertiesPanelModule } from 'bpmn-js-properties-panel';
    import { camundaPropertiesProviderModule } from 'bpmn-js-properties-panel/lib/provider/camunda';
    import camundaModdleDescriptor from 'camunda-bpmn-moddle/resources/camunda.json';
    import { BpmnPropertiesPanelModule } from 'bpmn-js-properties-panel';
  const BpmnModeler: any;
  export default BpmnModeler;
  const BpmnViewer: any;
  export { BpmnViewer };
}