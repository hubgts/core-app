/** Référentiels disponibles. À étendre au fil des besoins. */
export const REFERENTIAL_KINDS = ['exercise', 'sport'] as const;
export type ReferentialKind = (typeof REFERENTIAL_KINDS)[number];

export interface ReferenceItemInput {
  name?: string;
}
