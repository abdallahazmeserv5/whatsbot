import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Flow } from "./Flow";
import { Contact } from "./Contact";

@Entity()
export class FlowExecution {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Flow)
  flow!: Flow;

  @ManyToOne(() => Contact)
  contact!: Contact;

  @Column()
  currentNodeId!: string;

  @Column("simple-json", { default: "{}" })
  variables!: Record<string, any>;

  @Column({ default: "running" })
  status!: "running" | "completed" | "paused" | "failed";

  @CreateDateColumn()
  startedAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
