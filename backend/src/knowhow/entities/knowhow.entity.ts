import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type KnowHowStatus = 'active' | 'archived';

/** Composant embarqué (ordre = position dans le tableau). */
export interface KnowHowComponent {
  id: string;
  quantity: number | null;
  unit: string | null;
  label: string;
  note: string | null;
}

/** Étape embarquée (ordre = position dans le tableau). */
export interface KnowHowStep {
  id: string;
  text: string;
}

/**
 * Un savoir-faire / procédé reproductible : objectif + composants + étapes.
 * Composants, étapes et labels sont embarqués en JSON (listes ordonnées
 * possédées par le savoir-faire, toujours chargées avec lui).
 */
@Entity('knowhow')
export class KnowHowEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  title: string;

  @Column({ type: 'text', nullable: true })
  goal: string | null;

  /** Catégorie (FK souple) ; null = « sans catégorie ». Mise à null si la
   *  catégorie est supprimée (RG-04, géré côté service). */
  @Index()
  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  labels: string[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  components: KnowHowComponent[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  steps: KnowHowStep[];

  @Column({ name: 'yield_text', type: 'varchar', length: 80, nullable: true })
  yieldText: string | null;

  @Column({ name: 'yield_base', type: 'double precision', nullable: true })
  yieldBase: number | null;

  @Column({ name: 'total_time_min', type: 'int', nullable: true })
  totalTimeMin: number | null;

  @Column({ type: 'varchar', length: 16, default: '' })
  color: string;

  @Column({ type: 'boolean', default: false })
  pinned: boolean;

  @Column({ type: 'int', default: 0 })
  position: number;

  @Column({ type: 'varchar', default: 'active' })
  status: KnowHowStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  /** Géré manuellement : seules les éditions de contenu le bumpent (RG-08) —
   *  épingler / archiver / réordonner ne le touchent pas. */
  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
