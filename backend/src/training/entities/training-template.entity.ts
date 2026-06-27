import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TrainingType } from '../types';
import { ExerciseInput } from '../types';

/**
 * Modèle de séance réutilisable. Sert à pré-remplir le formulaire de création
 * d'une séance depuis le planning. Le contenu (exercices) est stocké en JSON :
 * un template n'est qu'un préréglage, pas une séance horodatée.
 */
@Entity('training_templates')
export class TrainingTemplateEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Titre du template (affiché dans la liste de sélection). */
  @Column({ type: 'varchar', length: 80 })
  name: string;

  /** Clé normalisée du nom (recherche insensible casse/accents). */
  @Index()
  @Column({ name: 'name_key', type: 'varchar', length: 80, default: '' })
  nameKey: string;

  @Index()
  @Column({ type: 'varchar' })
  type: TrainingType;

  /** Étiquettes libres rattachées au template. */
  @Column({ type: 'simple-array', default: '' })
  tags: string[];

  @Column({ name: 'duration_min', type: 'int', nullable: true })
  durationMin: number | null;

  @Column({ type: 'int', nullable: true })
  feeling: number | null;

  // --- cardio ---
  @Column({ type: 'varchar', length: 2, nullable: true })
  zone: string | null;

  // --- autre ---
  @Column({ type: 'varchar', length: 60, nullable: true })
  title: string | null;

  // --- cardio / autre ---
  @Column({ type: 'text', nullable: true })
  description: string | null;

  // --- musculation : exercices/séries sérialisés ---
  @Column({ type: 'jsonb', nullable: true })
  exercises: ExerciseInput[] | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
