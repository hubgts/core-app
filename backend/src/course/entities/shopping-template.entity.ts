import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Item d'un modèle (liste type). Comme un `ShoppingItem` mais sans cochage ni
 * traçabilité : un modèle est une source, pas une liste consommée.
 */
export interface TemplateItem {
  id: string;
  articleId: string;
  quantity: number | null;
  unit: string | null;
  note: string | null;
}

/**
 * Liste type (modèle) : un gabarit réutilisable d'items que l'on instancie en
 * vraie liste (copie figée, RG-06) ou que l'on applique à une liste existante.
 */
@Entity('course_templates')
export class ShoppingTemplateEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  title: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  items: TemplateItem[];

  @Column({ type: 'int', default: 0 })
  position: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
