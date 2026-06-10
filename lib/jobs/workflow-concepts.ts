export type WorkflowConcept = {
  id: string;
  term: string;
  definition: string;
};

export const WORKFLOW_CONCEPTS: WorkflowConcept[] = [
  {
    id: "palilleria",
    term: "Palillería",
    definition: "Lista de tramos que se van a cortar o preparar.",
  },
  {
    id: "trameado",
    term: "Trameado",
    definition:
      "Marcado del plano para localizar cada tramo de la palillería.",
  },
  {
    id: "paquete",
    term: "Paquete",
    definition:
      "Entrega final con hoja Excel, PDF marcado y resumen de validación.",
  },
];
