import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity()
export class Flow {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description!: string;

  @Column()
  triggerType!: "keyword" | "message" | "event";

  @Column("simple-array", { nullable: true })
  keywords!: string[];

  @Column("simple-json")
  nodes!: any[]; // ReactFlow nodes

  @Column("simple-json")
  edges!: any[]; // ReactFlow edges

  @Column({ default: false })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
